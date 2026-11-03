import { tasks, categories, home, allTasks, icons } from './tasks.js';

// Renders the shared header and footer. Pages declare <div id="site-nav" data-active="..."> and <div id="site-footer">.
// Registry tasks appear in the Tasks dropdown automatically; tasks with top: true are top-level items.
const chevron = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function link(t, active, cls = 'nav-link') {
  const on = t.id === active;
  return `<a class="${cls}${on ? ' active' : ''}" href="${t.href}"${on ? ' aria-current="page"' : ''}>${icons[t.icon]}<span>${t.short}</span></a>`;
}

function renderNav(active) {
  const menuTasks = tasks.filter((t) => !t.top);
  const topTasks = tasks.filter((t) => t.top);
  const childActive = menuTasks.some((t) => t.id === active);
  const groups = categories
    .map((c) => ({ c, items: menuTasks.filter((t) => t.category === c) }))
    .filter((g) => g.items.length)
    .map((g) => `<div class="menu-group" role="none"><div class="menu-heading" role="presentation">${g.c}</div>${g.items
      .map((t) => `<a role="menuitem" class="menu-item${t.id === active ? ' active' : ''}" href="${t.href}"${t.id === active ? ' aria-current="page"' : ''}>${icons[t.icon]}<span>${t.title}</span></a>`)
      .join('')}</div>`)
    .join('');
  return `
    <header class="site-header">
      <div class="site-header-inner">
        <a class="brand" href="/" aria-label="Swiipr Support Portal home">
          <img src="/assets/swiipr-logo.png" alt="swiipr" height="38">
          <span class="brand-text"><strong>Support Portal</strong><small>Airline operations</small></span>
        </a>
        <button class="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-links">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <nav id="site-links" class="nav-links" aria-label="Main">
          ${link(home, active)}
          <div class="dropdown">
            <button type="button" class="nav-link dropdown-toggle${childActive ? ' active' : ''}" aria-haspopup="menu" aria-expanded="false" aria-controls="tasks-menu"${childActive ? ' data-current="true"' : ''}>${icons.more}<span>Tasks</span>${chevron}</button>
            <div class="dropdown-menu" id="tasks-menu" role="menu" aria-label="Tasks" hidden>
              ${groups}
              <a role="menuitem" class="menu-item menu-all" href="${allTasks.href}">${icons.home}<span>All tasks</span></a>
            </div>
          </div>
          ${topTasks.map((t) => link(t, active)).join('')}
        </nav>
      </div>
    </header>`;
}

function setupMenus() {
  const nav = document.getElementById('site-links');
  const toggle = document.querySelector('.nav-toggle');
  const dd = nav.querySelector('.dropdown');
  const btn = dd.querySelector('.dropdown-toggle');
  const menu = dd.querySelector('.dropdown-menu');
  const items = () => [...menu.querySelectorAll('[role="menuitem"]')];

  const setOpen = (open, focusFirst = false) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    dd.classList.toggle('open', open);
    if (open && focusFirst) items()[0]?.focus();
  };
  const closeAll = () => {
    setOpen(false);
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  btn.addEventListener('click', () => setOpen(menu.hidden));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); items().at(-1)?.focus(); }
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list.at(-1).focus(); }
    else if (e.key === 'Tab') setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) setOpen(false); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeAll(); });
}

const navHost = document.getElementById('site-nav');
if (navHost) {
  navHost.outerHTML = renderNav(navHost.dataset.active);
  setupMenus();
}

const footerHost = document.getElementById('site-footer');
if (footerHost) {
  footerHost.outerHTML = `<footer class="site-footer"><strong>Designed and developed by Chinna, Support Engineer</strong><br>Swiipr Support Portal &middot; internal tooling &middot; no credentials are stored by this app</footer>`;
}
