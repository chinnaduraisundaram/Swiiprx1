import { tasks, categories, home, icons } from './tasks.js?v=20261104g';
import { initials } from './bearer.js?v=20261104g';
import { evaluateSession, sessionSettings, formatMmSs } from './session.js?v=20261104g';
import { startSession, loadSession, extendSession, updateSession, clearSession, wipeAll } from './session-store.js?v=20261104g';

// Shared application shell: sidebar (from the task registry), dark top bar, content area and footer.
// Pages only declare <div id="site-nav" data-active="..."> and <div id="site-footer">; everything else on the page
// becomes the content area. A legacy .page-head supplies the page title and its #auth controls move to the top bar.
const groupIcons = { 'Card Management': 'card', Utilities: 'wrench', Operations: 'check' };
const chevron = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const menuIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const docIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';

const item = (t, active, label = t.title) =>
  `<a class="nav-item${t.id === active ? ' active' : ''}" href="${t.href}"${t.id === active ? ' aria-current="page"' : ''} title="${label}">${icons[t.icon]}<span class="label">${label}</span></a>`;

function renderSidebar(active) {
  const menu = tasks.filter((t) => !t.top);
  const groups = categories
    .map((c) => ({ c, items: menu.filter((t) => t.category === c) }))
    .filter((g) => g.items.length)
    .map(({ c, items }, i) => {
      const hasActive = items.some((t) => t.id === active);
      const open = hasActive || i === 0;
      return `<div class="nav-group${open ? ' open' : ''}${hasActive ? ' has-active' : ''}">
        <button type="button" class="nav-item nav-group-toggle" aria-expanded="${open}" aria-controls="grp-${i}" title="${c}">${icons[groupIcons[c] ?? 'more']}<span class="label">${c}</span>${chevron}</button>
        <div class="nav-sub" id="grp-${i}"${open ? '' : ' hidden'}>${items.map((t) => item(t, active)).join('')}</div>
      </div>`;
    })
    .join('');
  return `<aside class="sidebar" id="sidebar" aria-label="Primary">
    <a class="brand" href="/" aria-label="Swiipr Support Portal home"><img src="/assets/swiipr-logo.png" alt="swiipr" height="32"></a>
    <nav class="nav" aria-label="Main">
      <div class="nav-label">Navigation</div>
      ${item(home, active, 'Dashboard')}
      ${groups}
      ${tasks.filter((t) => t.top).map((t) => item(t, active, t.short)).join('')}
    </nav>
  </aside>`;
}

function build() {
  const host = document.getElementById('site-nav');
  if (!host) return;
  const active = host.dataset.active;
  const footerHost = document.getElementById('site-footer');

  const content = document.createElement('main');
  content.className = 'content';
  content.id = 'main';
  content.tabIndex = -1;

  const head = document.querySelector('.page-head');
  const auth = document.getElementById('auth');
  if (head) {
    const h1 = head.querySelector('h1');
    const p = head.querySelector('p');
    const title = document.createElement('div');
    title.className = 'page-title';
    title.innerHTML = `<h1>${h1?.innerHTML ?? ''}</h1>${p ? `<p>${p.innerHTML}</p>` : ''}`;
    content.append(title);
    head.remove();
  }

  [...document.body.childNodes].forEach((n) => {
    if (n === host || n === footerHost || n.nodeName === 'SCRIPT' || n.nodeName === 'svg') return;
    if (n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())) content.append(n);
  });

  content.querySelectorAll('main.page > section > h2').forEach((h) => {
    const first = h.closest('section') === content.querySelector('main.page > section');
    const t = tasks.find((x) => x.id === active);
    h.insertAdjacentHTML('afterbegin', first && t ? icons[t.icon] : docIcon);
  });

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = '<strong>Designed and developed by Chinna, Support Engineer</strong> <span>&middot; Swiipr Support Portal &middot; no credentials are stored by this app</span>';
  content.append(footer);
  footerHost?.remove();

  const top = document.createElement('header');
  top.className = 'topbar';
  top.innerHTML = `<button type="button" class="sb-toggle" aria-label="Toggle navigation" aria-expanded="true" aria-controls="sidebar">${menuIcon}</button>
    <a class="skip" href="#main">Skip to content</a>
    <div class="topbar-spacer"></div>
    <span id="sessionClock" class="session-clock" role="timer" aria-live="off" hidden></span>
    <div class="user-chip"><span class="avatar" id="userInitials" aria-hidden="true">CD</span><span id="userName">Chinna Dev</span></div>`;
  if (auth) top.insertBefore(auth, top.querySelector('.user-chip'));

  const main = document.createElement('div');
  main.className = 'app-main';
  main.append(top, content);

  const app = document.createElement('div');
  app.className = 'app';
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  app.insertAdjacentHTML('afterbegin', renderSidebar(active));
  app.append(main, scrim);
  host.replaceWith(app);

  wire(app);
}

function wire(app) {
  const toggle = app.querySelector('.sb-toggle');
  const mobile = () => window.matchMedia('(max-width: 860px)').matches;
  const saved = localStorage.getItem('swiipr.sidebar') === 'collapsed';
  document.body.classList.toggle('sb-collapsed', saved && !mobile());
  const sync = () => {
    const open = mobile() ? document.body.classList.contains('sb-open') : !document.body.classList.contains('sb-collapsed');
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => {
    if (mobile()) document.body.classList.toggle('sb-open');
    else {
      const c = document.body.classList.toggle('sb-collapsed');
      localStorage.setItem('swiipr.sidebar', c ? 'collapsed' : 'open');
    }
    sync();
  });
  app.querySelector('.scrim').addEventListener('click', () => { document.body.classList.remove('sb-open'); sync(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sb-open')) { document.body.classList.remove('sb-open'); sync(); toggle.focus(); }
  });
  window.addEventListener('resize', sync);
  sync();

  app.querySelectorAll('.nav-group-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-group');
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      group.classList.toggle('open', open);
      group.querySelector('.nav-sub').hidden = !open;
    });
  });
}

build();

// Used by pages that know the signed-in user.
let defaultName = 'Chinna Dev';
let current = '';
export function setUser(name) {
  current = (name || '').trim();
  const display = current || defaultName;
  const n = document.getElementById('userName');
  const i = document.getElementById('userInitials');
  if (n) n.textContent = display;
  if (i) i.textContent = initials(display);
}

function setSessionClock(msLeft, limitedByToken) {
  const el = document.getElementById('sessionClock');
  if (!el) return;
  if (msLeft == null) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = `Session ${formatMmSs(msLeft)}`;
  el.title = limitedByToken ? 'Ends when the JWT expires (earlier than the session window)' : "Time left in this tab's session";
  el.classList.toggle('warn', msLeft <= warnMs);
}

// Session: one absolute window per tab, persisted in sessionStorage (see session-store.js), so refreshing or
// navigating between portal pages never restarts the countdown. Pages use the `session` API below.
let timeoutMs = 60 * 60_000;
let warnMs = 5 * 60_000;
let sess = null;
let timer = null;
let warnEl = null;
const expireHandlers = [];

function showExpiredDialog() {
  if (document.querySelector('.session-modal')) return;
  const onCards = /^\/card-(transactions|balance)\.html$/.test(location.pathname);
  const modal = document.createElement('div');
  modal.className = 'session-modal';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-labelledby', 'sessionExpiredTitle');
  modal.innerHTML = '<div><h2 id="sessionExpiredTitle">Session expired</h2><p>Your session has ended, so you have been signed out and any pasted token, token list and results were cleared. Please sign in again.</p><button type="button" id="sessionSignIn">Sign in again</button></div>';
  document.body.append(modal);
  modal.querySelector('button').addEventListener('click', () => { location.href = onCards ? location.pathname : '/card-transactions.html'; });
  modal.querySelector('button').focus();
}

function expire() {
  stopTimer();
  sess = null;
  wipeAll(sessionStorage);
  setSessionClock(null);
  if (warnEl) warnEl.hidden = true;
  expireHandlers.forEach((fn) => { try { fn(); } catch { /* keep going */ } });
  showExpiredDialog();
}

function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

function tick() {
  if (!sess) return;
  if (sess.expiresAt === null) { setSessionClock(null); return; }
  const s = evaluateSession({ lastActivity: sess.startedAt, now: Date.now(), timeoutMs: sess.expiresAt - sess.startedAt, warnMs });
  if (s.state === 'expired') { expire(); return; }
  setSessionClock(s.msLeft, sess.limitedByToken);
  if (!warnEl) {
    warnEl = document.createElement('div');
    warnEl.id = 'sessionWarn';
    warnEl.hidden = true;
    warnEl.innerHTML = '<span id="sessionWarnText"></span> <button type="button" id="sessionStay">Stay signed in</button>';
    document.body.append(warnEl);
    warnEl.querySelector('button').addEventListener('click', () => session.stay());
  }
  warnEl.hidden = s.state !== 'warning';
  if (s.state === 'warning') warnEl.querySelector('#sessionWarnText').textContent = `Session expires in ${formatMmSs(s.msLeft)}.`;
}

function startTimer() {
  stopTimer();
  tick();
  if (sess) timer = setInterval(tick, 1000);
}

let resolveReady;
export const ready = new Promise((r) => { resolveReady = r; });

export const session = {
  ready,
  get active() { return !!sess; },
  get token() { return sess?.token ?? ''; },
  get name() { return sess?.name ?? ''; },
  // Called by pages after sign-in or JWT paste. Keeps the existing window if the same token/account is already active.
  begin({ token = '', name = '', tokenExp = null } = {}) {
    if (sess && sess.token === token && sess.name === name) return;
    sess = startSession(sessionStorage, { now: Date.now(), timeoutMs, token, name, tokenExp });
    if (sess) setUser(name);
    startTimer();
  },
  // Drops only the pasted JWT (keeps a B2C sign-in window); ends the session otherwise.
  clearToken(keepWindow) {
    if (sess && keepWindow) sess = updateSession(sessionStorage, sess, { token: '', tokenExp: null });
    else this.end();
  },
  end() {
    stopTimer();
    sess = null;
    clearSession(sessionStorage);
    setSessionClock(null);
    if (warnEl) warnEl.hidden = true;
  },
  stay() {
    if (!sess) return;
    sess = extendSession(sessionStorage, sess, { now: Date.now(), timeoutMs });
    if (!sess) { expire(); return; }
    startTimer();
  },
  onExpire(fn) { expireHandlers.push(fn); },
};

// Default display name and timeouts come from /api/config; a signed-in name always wins.
fetch('/api/config').then((r) => r.json()).then((c) => {
  if (c.defaultUserName) { defaultName = c.defaultUserName; if (!current) setUser(''); }
  ({ timeoutMs, warnMs } = sessionSettings(c));
}).catch(() => {}).finally(() => {
  const { session: stored, expired } = loadSession(sessionStorage, Date.now());
  if (expired) { wipeAll(sessionStorage); showExpiredDialog(); }
  else if (stored) {
    sess = stored;
    if (stored.name) setUser(stored.name);
    startTimer();
  }
  resolveReady();
});
