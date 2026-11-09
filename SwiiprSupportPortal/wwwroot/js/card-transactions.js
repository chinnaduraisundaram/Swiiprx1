const $ = (id) => document.getElementById(id);
import { normalizeBearerToken, looksLikeJwt, jwtExpiryMs, jwtDisplayName } from './bearer.js?v=20261110b';
import { setUser, session } from './layout.js?v=20261110b';
import { COLUMNS as BALANCE_COLUMNS, isFlagged, summarize } from './balance.js?v=20261110b';

const BALANCE = document.body.dataset.mode === 'balance';
const ENDPOINT = BALANCE ? 'balance' : 'transactions';

const STORAGE_KEY = BALANCE ? 'swiipr.cardTokens.balance' : 'swiipr.cardTokens';
let manualToken = ''; // mirrors the tab-scoped session (sessionStorage); never logged

let config;
let msalApp;
let account = null;
let rows = []; // { cardToken, status: pending|running|success|failed, count, error, response }
let cancelled = false;
let running = false;

function banner(message, info = false) {
  const el = $('banner');
  el.textContent = message ?? '';
  el.hidden = !message;
  el.classList.toggle('info', info);
}

async function init() {
  await session.ready;
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) $('tokens').value = saved;

  config = await (await fetch('/api/config')).json();
  if (!config.clientId || !config.scopes.length) {
    banner('Not configured: set AzureAdB2C:ClientId and AzureAdB2C:Scopes (see README).');
  } else {
    const base = config.authority.replace(/\/v2\.0\/?$/i, '').replace(/\/$/, '');
    const authority = `${base}/${config.policy}`;
    msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority,
        knownAuthorities: [new URL(authority).host],
        redirectUri: config.redirectUri || window.location.origin + '/',
        navigateToLoginRequestUrl: false,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    await msalApp.initialize();
    try {
      const result = await msalApp.handleRedirectPromise();
      if (result?.account) msalApp.setActiveAccount(result.account);
    } catch (e) {
      banner(`Sign-in failed: ${e.errorMessage || e.message}`);
    }
    account = msalApp.getActiveAccount() ?? msalApp.getAllAccounts()[0] ?? null;
    if (account) msalApp.setActiveAccount(account);
  }
  if (session.token) {
    $('jwt').value = session.token;
    applyManualToken();
  } else if (account && !session.active) {
    session.begin({ name: account.name || account.username || '' });
  }
  renderAuth();
  await parseTokens();
}

// Expiry (absolute, tab-scoped window handled in layout.js): clear everything this page holds in memory.
session.onExpire(() => {
  cancelled = true;
  manualToken = '';
  $('jwt').value = '';
  $('jwtStatus').textContent = '';
  rows = [];
  $('tokens').value = '';
  account = null;
  parseTokens().then(() => { render(); renderAuth(); });
});
function renderAuth() {
  $('signIn').hidden = !!account;
  $('signOut').hidden = !account;
  $('signIn').disabled = !msalApp;
  $('account').textContent = account ? (account.name || account.username || 'Signed in') : '';
  setUser(account ? (account.name || account.username) : jwtDisplayName(manualToken));
  updateButtons();
}

$('signIn').addEventListener('click', () => {
  sessionStorage.setItem('swiipr.returnTo', location.pathname);
  msalApp.loginRedirect({ scopes: config.scopes });
});
$('signOut').addEventListener('click', () => { session.end(); msalApp.logoutRedirect({ account }); });

function applyManualToken() {
  manualToken = normalizeBearerToken($('jwt').value);
  if (manualToken && manualToken !== session.token) {
    session.begin({ token: manualToken, name: jwtDisplayName(manualToken), tokenExp: jwtExpiryMs(manualToken) });
  } else if (!manualToken) {
    session.clearToken(!!account);
  }
  if (!account) setUser(jwtDisplayName(manualToken));
  const status = $('jwtStatus');
  if (!manualToken) {
    status.textContent = '';
  } else if (!looksLikeJwt(manualToken)) {
    status.textContent = 'Using pasted token (does not look like a JWT).';
  } else {
    const exp = jwtExpiryMs(manualToken);
    status.textContent = exp === null ? 'Using pasted token.'
      : exp <= Date.now() ? 'Pasted token has expired.'
      : `Using pasted token (expires ${new Date(exp).toLocaleString()}).`;
  }
  updateButtons();
}
$('jwt').addEventListener('input', applyManualToken);
$('jwtToggle').addEventListener('click', () => {
  const hidden = $('jwt').type === 'password';
  $('jwt').type = hidden ? 'text' : 'password';
  $('jwtToggle').textContent = hidden ? 'Hide' : 'Show';
});
$('jwtClear').addEventListener('click', () => { $('jwt').value = ''; applyManualToken(); });

// Silent renewal; MSAL returns the cached token until near expiry, then refreshes it.
async function getAccessToken(forceRefresh = false) {
  if (manualToken) {
    const exp = jwtExpiryMs(manualToken);
    if (exp !== null && exp <= Date.now()) {
      const err = new Error('The pasted token has expired - paste a fresh one.');
      err.fatal = true;
      throw err;
    }
    return manualToken;
  }
  if (!account) throw new Error('Not signed in.');
  try {
    const result = await msalApp.acquireTokenSilent({ scopes: config.scopes, account, forceRefresh });
    return result.accessToken;
  } catch (e) {
    if (e instanceof msal.InteractionRequiredAuthError || /interaction_required|login_required|no_account/.test(e.errorCode || '')) {
      account = null;
      renderAuth();
      banner('Your session expired. Sign in again, then use "Retry failed".');
      const err = new Error('Session expired - sign in again.');
      err.fatal = true;
      throw err;
    }
    throw e;
  }
}

async function parseTokens() {
  const text = $('tokens').value;
  sessionStorage.setItem(STORAGE_KEY, text);
  const res = await fetch('/api/tokens/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const parsed = await res.json();
  parsed.valid = parsed.valid ?? parsed.Valid;
  parsed.invalid = parsed.invalid ?? parsed.Invalid;
  parsed.duplicates = parsed.duplicates ?? parsed.Duplicates;
  $('parseSummary').textContent = `${parsed.valid.length} valid, ${parsed.invalid.length} invalid, ${parsed.duplicates} duplicates removed`;
  $('invalidBox').hidden = parsed.invalid.length === 0;
  $('invalidSummary').textContent = `${parsed.invalid.length} invalid token(s) will be ignored`;
  $('invalidList').textContent = parsed.invalid.map((i) => `Line ${i.line ?? i.Line}: ${i.value ?? i.Value} - ${i.reason ?? i.Reason}`).join('\n');
  parsedValid = parsed.valid;
  updateButtons();
}
let parsedValid = [];

let parseTimer;
$('tokens').addEventListener('input', () => {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(parseTokens, 250);
});
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $('tokens').value = await file.text();
  e.target.value = '';
  await parseTokens();
});

function updateButtons() {
  const authed = !!account || !!manualToken;
  $('fetchBtn').disabled = running || !authed || parsedValid.length === 0;
  $('cancelBtn').disabled = !running;
  $('retryBtn').disabled = running || !authed || !rows.some((r) => r.status === 'failed');
  $('downloadBtn').disabled = running || !rows.some((r) => r.status === 'success' || r.status === 'failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(row) {
  row.status = 'running';
  row.error = '';
  render();
  const url = `/api/cards/${encodeURIComponent(row.cardToken)}/${ENDPOINT}`;
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    if (cancelled) throw new Error('Cancelled');
    let res;
    try {
      const token = await getAccessToken();
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: '*/*' } });
    } catch (e) {
      if (e.fatal || attempt >= config.maxRetries) throw e;
      await sleep(backoff(attempt));
      continue;
    }
    const body = await res.text();
    if (res.ok) {
      row.response = body;
      if (BALANCE) {
        row.balances = await mapBalance(row.cardToken, true, body);
        row.count = row.balances.length;
      } else {
        row.count = countItems(body);
      }
      return;
    }
    if (res.status === 401 && !refreshed) {
      refreshed = true;
      await getAccessToken(true);
      continue;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < config.maxRetries) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
      continue;
    }
    row.response = body;
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 300) : ''}`);
  }
}

async function mapBalance(cardToken, isSuccess, response) {
  const res = await fetch('/api/balance/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardToken, isSuccess, response }),
  });
  return res.json();
}

const backoff = (attempt) => Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;

function countItems(body) {
  try {
    const json = JSON.parse(body);
    const items = Array.isArray(json) ? json : json?.data?.items ?? json?.data ?? json?.items;
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

async function runQueue(queue) {
  running = true;
  cancelled = false;
  banner('');
  updateButtons();
  let done = 0;
  const total = queue.length;
  const progress = () => {
    $('progress').max = Math.max(total, 1);
    $('progress').value = done;
    $('progressText').textContent = `${done}/${total}`;
  };
  progress();

  const next = [...queue];
  const worker = async () => {
    while (next.length && !cancelled) {
      const row = next.shift();
      try {
        await fetchOne(row);
        row.status = 'success';
      } catch (e) {
        row.status = 'failed';
        row.error = e.message;
        row.response ??= e.message;
        if (e.fatal) cancelled = true;
      }
      done++;
      progress();
      render();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, config.maxConcurrency) }, worker));

  for (const row of queue) {
    if (row.status === 'pending' || row.status === 'running') row.status = 'pending';
  }
  running = false;
  render();
  updateButtons();
}

$('fetchBtn').addEventListener('click', () => {
  rows = parsedValid.map((cardToken) => ({ cardToken, status: 'pending', count: '', error: '', response: '', balances: [] }));
  render();
  runQueue(rows);
});
$('retryBtn').addEventListener('click', () => {
  const failed = rows.filter((r) => r.status === 'failed');
  failed.forEach((r) => { r.status = 'pending'; r.response = ''; r.balances = []; });
  runQueue(failed);
});
$('cancelBtn').addEventListener('click', () => { cancelled = true; });

function render() {
  const tbody = $('results');
  tbody.replaceChildren(...rows.flatMap((row) => {
    const tr = document.createElement('tr');
    const cell = (text, cls) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      tr.append(td);
      return td;
    };
    cell(row.cardToken, 'token');
    cell(row.status, row.status);
    cell(row.status === 'success' ? row.count : '');
    cell(row.error);
    const td = document.createElement('td');
    if (row.status === 'success' || row.status === 'failed') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'CSV';
      btn.addEventListener('click', () => download([row], `card_${BALANCE ? 'balance' : 'transactions'}_${row.cardToken.slice(0, 8)}`));
      td.append(btn);
    }
    if (row.response) {
      const raw = document.createElement('button');
      raw.type = 'button';
      raw.textContent = row.showRaw ? 'Hide raw' : 'Show raw';
      raw.addEventListener('click', () => { row.showRaw = !row.showRaw; render(); });
      td.append(' ', raw);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy raw JSON';
      copy.style.fontWeight = '700';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(row.response); copy.textContent = 'Copied!'; }
        catch { row.showRaw = true; render(); }
        setTimeout(() => { copy.textContent = 'Copy raw JSON'; }, 1500);
      });
      td.append(' ', copy);
    }
    tr.append(td);
    if (!row.showRaw) return [tr];
    const detail = document.createElement('tr');
    const dc = document.createElement('td');
    dc.colSpan = 5;
    const pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto;margin:0';
    let text = row.response;
    try { text = JSON.stringify(JSON.parse(row.response), null, 2); } catch { /* show as received */ }
    pre.textContent = text;
    dc.append(pre);
    detail.append(dc);
    return [tr, detail];
  }));
  const ok = rows.filter((r) => r.status === 'success').length;
  const bad = rows.filter((r) => r.status === 'failed').length;
  if (BALANCE) renderBalance(bad);
  $('csvNote').textContent = rows.length ? `${ok} succeeded, ${bad} failed (failed tokens are included as a RawResponse row${BALANCE ? ')' : ', like the console export)'}` : '';
  updateButtons();
}

function renderBalance(failedCount) {
  const flat = rows.flatMap((r) => (r.status === 'success' ? r.balances : []));
  const sum = summarize(flat, failedCount);
  const chips = [`${sum.cards} cards checked`, ...Object.entries(sum.byStatus).map(([s, n]) => `${n} ${s}`),
    ...Object.entries(sum.totals).map(([c, v]) => `Available ${c}: ${v.toFixed(2)}`)];
  if (failedCount) chips.push(`${failedCount} failed`);
  $('chips').replaceChildren(...chips.map((c) => Object.assign(document.createElement('span'), { className: 'chip', textContent: c })));
  const table = $('balanceTable');
  table.hidden = flat.length === 0;
  table.tHead.innerHTML = `<tr>${BALANCE_COLUMNS.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  table.tBodies[0].replaceChildren(...flat.map((r) => {
    const tr = document.createElement('tr');
    if (isFlagged(r)) tr.className = 'flagged';
    for (const c of BALANCE_COLUMNS) {
      const td = document.createElement('td');
      td.textContent = String(r[c.charAt(0).toLowerCase() + c.slice(1)] ?? r[c] ?? '');
      tr.append(td);
    }
    return tr;
  }));
}

async function download(selected, baseName) {
  const results = selected
    .filter((r) => r.status === 'success' || r.status === 'failed')
    .map((r) => ({ cardToken: r.cardToken, isSuccess: r.status === 'success', response: r.response || r.error }));
  const res = await fetch(BALANCE ? '/api/balance/export' : '/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  });
  const blob = new Blob([await res.text()], { type: 'text/csv;charset=utf-8' });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${baseName}_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('downloadBtn').addEventListener('click', () => download(rows, BALANCE ? 'Swiipr_CardBalance' : 'Swiipr_CardTransactions'));

init().catch((e) => banner(`Startup failed: ${e.message}`));
