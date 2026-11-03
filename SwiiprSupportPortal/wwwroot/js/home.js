import { tasks, categories, icons, hrefOf, quickLinks } from './tasks.js';

// B2C redirects back to the configured redirect URI (the site root); forward the auth response to the page that started sign-in.
if (/[#?&](code|error|state)=/.test(location.hash)) {
  location.replace('/card-transactions.html' + location.hash);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const count = (list, status) => list.filter((t) => t.status === status).length;

const stats = document.getElementById('dashboard');
stats.innerHTML = `
  <div class="stat-row">
    <div class="stat"><strong>${tasks.length}</strong><span>Total activities</span></div>
    <div class="stat ok"><strong>${count(tasks, 'available')}</strong><span>Available</span></div>
    <div class="stat plan"><strong>${count(tasks, 'planned')}</strong><span>Planned</span></div>
  </div>
  <div class="cat-row">
    ${categories
      .map((c) => {
        const list = tasks.filter((t) => t.category === c);
        return `<a class="cat-chip" href="#cat-${categories.indexOf(c)}"><b>${esc(c)}</b><span>${count(list, 'available')} available &middot; ${count(list, 'planned')} planned</span></a>`;
      })
      .join('')}
  </div>`;

const card = (t) => `
  <a class="task-card${t.status === 'planned' ? ' is-planned' : ''}" href="${hrefOf(t)}">
    <span class="task-top"><span class="task-icon">${icons[t.icon]}</span><span class="badge ${t.status}">${t.status === 'available' ? 'Available' : 'Planned'}</span></span>
    <h3>${esc(t.title)}</h3>
    <p>${esc(t.description)}</p>
    ${t.tags ? `<span class="task-tags">${t.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</span>` : ''}
    <span class="task-go">${t.status === 'available' ? 'Open' : 'View plan'} &rarr;</span>
  </a>`;

document.getElementById('task-grid').innerHTML = categories
  .map((c, i) => `<h3 class="cat-title" id="cat-${i}">${esc(c)}</h3><div class="task-grid">${tasks.filter((t) => t.category === c).map(card).join('')}</div>`)
  .join('');

document.getElementById('quick-links').innerHTML = quickLinks
  .map((l) => `<a class="chip" href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.title)} &#8599;</a>`)
  .join('');
