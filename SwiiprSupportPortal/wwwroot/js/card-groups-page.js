import { buildCsv, summarize, canRun, confirmText, credentialsComplete, credentialPayload, credentialStatus } from './card-groups.js?v=20261110b';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let tokens = [];
let serverConfigured = false;
const creds = () => ({ baseUrl: $('cfgBase').value, apiKey: $('cfgKey').value, clientSecret: $('cfgSecret').value });
const isConfigured = () => serverConfigured || credentialsComplete(creds());
let running = false;
let cancelled = false;
let rows = new Map(); // token -> {state, result, error}
const maxConcurrency = 3;

async function init() {
  try {
    serverConfigured = (await (await fetch('/api/card-groups/status')).json()).configured === true;
  } catch { serverConfigured = false; }
  refresh();
}

async function parse() {
  const res = await fetch('/api/tokens/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: $('tokens').value }) });
  const p = await res.json();
  tokens = p.valid;
  $('parseSummary').textContent = `${p.valid.length} valid, ${p.invalid.length} invalid, ${p.duplicates} duplicate(s) removed`;
  $('invalidBox').hidden = p.invalid.length === 0;
  $('invalidSummary').textContent = `${p.invalid.length} invalid token(s)`;
  $('invalidList').textContent = p.invalid.map((i) => `line ${i.line}: ${i.value} (${i.reason})`).join('\n');
  refresh();
}

function refresh() {
  const banner = $('banner');
  banner.hidden = isConfigured();
  banner.textContent = isConfigured() ? '' : 'Paynetics credentials are not set: paste them in the configuration box below, or configure Paynetics:ApiKey and Paynetics:ClientSecret on the server (see README). Nothing can be run until then.';
  $('cfgStatus').textContent = credentialStatus(creds(), serverConfigured);
  const dryRun = $('dryRun').checked;
  $('confirmWrap').hidden = dryRun;
  $('confirmText').textContent = confirmText(tokens.length, dryRun);
  $('runBtn').textContent = dryRun ? 'Run dry run (GET only)' : 'Update card groups';
  $('runBtn').disabled = running || !canRun({ tokenCount: tokens.length, dryRun, confirmed: $('confirm').checked, configured: isConfigured() });
  $('cancelBtn').disabled = !running;
  const done = [...rows.values()].filter((r) => r.result);
  $('downloadBtn').disabled = done.length === 0;
  const s = summarize(done.map((r) => r.result));
  $('chips').innerHTML = done.length ? Object.entries(s).filter(([, n]) => n).map(([k, n]) => `<span class="chip">${esc(k)}: ${n}</span>`).join(' ') : '';
  renderTable();
}

function renderTable() {
  const body = $('results');
  body.innerHTML = '';
  for (const [token, r] of rows) {
    const res = r.result;
    const status = res ? res.status : r.state;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(token)}</td><td>${esc(status)}</td><td>${esc(res?.message ?? r.error ?? '')}</td>`;
    const td = document.createElement('td');
    if (res && (res.before || res.after || res.updateResponse)) {
      const d = document.createElement('details');
      d.innerHTML = `<summary>Before / after</summary>`;
      for (const [label, v] of [['Before', res.before], ['Update response', res.updateResponse], ['After', res.after]]) {
        if (v == null) continue;
        const h = document.createElement('strong'); h.textContent = label;
        const pre = document.createElement('pre'); pre.textContent = v;
        d.append(h, pre);
      }
      td.append(d);
    }
    tr.append(td);
    body.append(tr);
  }
}

async function processOne(token, dryRun, confirm) {
  const r = rows.get(token);
  r.state = 'running'; r.result = null; r.error = null;
  try {
    const res = await fetch('/api/card-groups/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardToken: token, dryRun, confirm, ...credentialPayload(creds()) }) });
    if (!res.ok) { r.state = 'failed'; r.error = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`; }
    else { r.result = await res.json(); r.state = r.result.status; }
  } catch (e) { r.state = 'failed'; r.error = e.message; }
}

async function run(onlyFailed = false) {
  const dryRun = $('dryRun').checked;
  const confirm = $('confirm').checked;
  if (!canRun({ tokenCount: tokens.length, dryRun, confirmed: confirm, configured: isConfigured() })) return;
  const list = onlyFailed ? tokens.filter((t) => rows.get(t)?.state === 'failed') : tokens;
  if (!onlyFailed) rows = new Map(tokens.map((t) => [t, { state: 'pending' }]));
  running = true; cancelled = false;
  let next = 0, done = 0;
  $('progress').max = list.length || 1; $('progress').value = 0;
  refresh();
  const worker = async () => {
    while (!cancelled && next < list.length) {
      const t = list[next++];
      await processOne(t, dryRun, confirm);
      $('progress').value = ++done;
      $('progressText').textContent = `${done}/${list.length}`;
      refresh();
    }
  };
  await Promise.all(Array.from({ length: Math.min(maxConcurrency, list.length) }, worker));
  running = false;
  if (!dryRun) $('confirm').checked = false;
  refresh();
}

function download() {
  const done = [...rows.values()].filter((r) => r.result).map((r) => r.result);
  const blob = new Blob(['\uFEFF' + buildCsv(done)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `card-groups-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('tokens').addEventListener('input', parse);
$('file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { $('tokens').value = await f.text(); parse(); } });
$('dryRun').addEventListener('change', () => { $('confirm').checked = false; refresh(); });
$('confirm').addEventListener('change', refresh);
$('runBtn').addEventListener('click', () => run(false));
$('retryBtn').addEventListener('click', () => run(true));
$('cancelBtn').addEventListener('click', () => { cancelled = true; });
$('downloadBtn').addEventListener('click', download);
for (const id of ['cfgBase', 'cfgKey', 'cfgSecret']) $(id).addEventListener('input', refresh);
$('cfgShow').addEventListener('change', (e) => { const t = e.target.checked ? 'text' : 'password'; $('cfgKey').type = t; $('cfgSecret').type = t; });
$('cfgClear').addEventListener('click', () => { for (const id of ['cfgBase', 'cfgKey', 'cfgSecret']) $(id).value = ''; $('cfgShow').checked = false; $('cfgKey').type = $('cfgSecret').type = 'password'; refresh(); });
init();
