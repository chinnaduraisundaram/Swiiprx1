import { tasks, categories, icons, quickLinks } from './tasks.js?v=20261110b';
import { mountCarousel } from './carousel.js?v=20261110b';

const carouselRoot = document.getElementById('flight-carousel');
if (carouselRoot) mountCarousel(carouselRoot);

for (const card of document.querySelectorAll('.pilot-card')) {
  const img = card.querySelector('img');
  const fb = card.querySelector('.pilot-fallback');
  if (!img || !fb) continue;
  const useFallback = () => { img.hidden = true; fb.hidden = false; };
  img.addEventListener('error', useFallback);
  if (img.complete && img.naturalWidth === 0) useFallback();
}

// B2C redirects back to the configured redirect URI (the site root); forward the auth response to the page that started sign-in.
if (/[#?&](code|error|state)=/.test(location.hash)) {
  const back = sessionStorage.getItem('swiipr.returnTo');
  sessionStorage.removeItem('swiipr.returnTo');
  location.replace((/^\/[\w-]+\.html$/.test(back ?? '') ? back : '/card-transactions.html') + location.hash);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

document.getElementById('dashboard').innerHTML = `
  <div class="stat-row">
    <div class="stat"><strong>${tasks.length}</strong><span>Tools available</span></div>
    ${categories
      .map((c) => `<a class="stat" href="#cat-${categories.indexOf(c)}"><strong>${tasks.filter((t) => t.category === c).length}</strong><span>${esc(c)}</span></a>`)
      .join('')}
  </div>`;

const card = (t) => `
  <a class="task-card" href="${t.href}">
    <span class="task-top"><span class="task-icon">${icons[t.icon]}</span></span>
    <h3>${esc(t.title)}</h3>
    <p>${esc(t.description)}</p>
    ${t.tags ? `<span class="task-tags">${t.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</span>` : ''}
    <span class="task-go">Open &rarr;</span>
  </a>`;

document.getElementById('task-grid').innerHTML = categories
  .map((c, i) => `<h3 class="cat-title" id="cat-${i}">${esc(c)}</h3><div class="task-grid">${tasks.filter((t) => t.category === c).map(card).join('')}</div>`)
  .join('');

document.getElementById('quick-links').innerHTML = quickLinks
  .map((l) => `<a class="chip" href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.title)} &#8599;</a>`)
  .join('');
