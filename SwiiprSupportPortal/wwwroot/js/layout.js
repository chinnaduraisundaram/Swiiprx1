import { tasks, home, icons } from './tasks.js';

// Renders the shared top navigation and footer. Pages declare <div id="site-nav" data-active="..."> and <div id="site-footer">.
function renderNav(active) {
  const items = [home, ...tasks];
  const links = items
    .map((t) => `<a class="nav-link${t.id === active ? ' active' : ''}" href="${t.href}"${t.id === active ? ' aria-current="page"' : ''}>${icons[t.icon]}<span>${t.short}</span></a>`)
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
        <nav id="site-links" class="nav-links" aria-label="Main">${links}</nav>
      </div>
    </header>`;
}

const navHost = document.getElementById('site-nav');
if (navHost) {
  navHost.outerHTML = renderNav(navHost.dataset.active);
  const toggle = document.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = document.getElementById('site-links').classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

const footerHost = document.getElementById('site-footer');
if (footerHost) {
  footerHost.outerHTML = `<footer class="site-footer"><strong>Designed and developed by Chinna, Support Engineer</strong><br>Swiipr Support Portal &middot; internal tooling &middot; no credentials are stored by this app</footer>`;
}
