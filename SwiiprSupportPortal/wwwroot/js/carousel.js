// Original inline-SVG flight scenes; no external images or licences involved.
const plane = (x, y, rot, scale, fill = '#f4f7fb') => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
    <path d="M-150 0q0-16 40-18h230q50 2 70 18-20 16-70 18h-230q-40-2-40-18Z" fill="${fill}"/>
    <path d="M-20 0 -90 -95h38l100 95ZM-20 4l-70 92h38l100-92Z" fill="${fill}" opacity=".92"/>
    <path d="M-135 -4-165-62h30l45 58Z" fill="#0f8b8d"/>
    <path d="M-100 -4h210" stroke="#9fb3c8" stroke-width="2"/>
  </g>`;

const cloud = (x, y, s, o = 0.9) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${o}">
  <ellipse cx="0" cy="0" rx="120" ry="28"/><ellipse cx="-50" cy="-18" rx="55" ry="32"/><ellipse cx="30" cy="-28" rx="62" ry="38"/></g>`;

const svg = (defs, body) => `<svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;
const grad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

export const slides = [
  {
    title: 'Keeping every journey on schedule',
    sub: 'Takeoff: clear skies and a clean climb-out.',
    alt: 'Illustration of an airliner climbing away from a runway into a blue sky',
    art: svg(grad('s1', '#2f7fc1', '#cfe8f7'),
      `<rect width="1600" height="600" fill="url(#s1)"/>${cloud(250, 170, 1.1, .8)}${cloud(1250, 120, 1.4, .7)}${cloud(900, 300, .8, .6)}
       <rect y="480" width="1600" height="120" fill="#4b5563"/><path d="M0 540h1600" stroke="#e5e7eb" stroke-width="6" stroke-dasharray="70 50"/>
       ${plane(900, 300, -14, 1.5)}`)
  },
  {
    title: 'Above the clouds, every payment in order',
    sub: 'Cruise: smooth air at altitude.',
    alt: 'Illustration of an airliner cruising above a layer of clouds',
    art: svg(grad('s2', '#1d5f9e', '#8cc4ec'),
      `<rect width="1600" height="600" fill="url(#s2)"/><circle cx="1300" cy="120" r="55" fill="#fff6d6" opacity=".9"/>
       ${plane(760, 240, 0, 1.6)}
       ${cloud(200, 470, 2.2, .95)}${cloud(650, 520, 2.6, 1)}${cloud(1150, 480, 2.4, .95)}${cloud(1550, 530, 2.2, 1)}`)
  },
  {
    title: 'Smooth approach, safe landing',
    sub: 'Landing: descending towards the runway at sunset.',
    alt: 'Illustration of an airliner descending to land at sunset',
    art: svg(grad('s3', '#3b4a8c', '#f6a56a'),
      `<rect width="1600" height="600" fill="url(#s3)"/><circle cx="420" cy="430" r="80" fill="#ffd9a0" opacity=".9"/>
       <rect y="500" width="1600" height="100" fill="#2d3340"/><path d="M0 550h1600" stroke="#f3f4f6" stroke-width="5" stroke-dasharray="60 45"/>
       ${cloud(1200, 150, 1.3, .35)}${cloud(300, 220, 1, .3)}
       ${plane(1020, 330, 8, 1.4, '#fdf3ea')}`)
  },
  {
    title: 'Ready for the next departure',
    sub: 'Apron at dusk: turnaround under the lights.',
    alt: 'Illustration of a parked airliner on an airport apron at dusk',
    art: svg(grad('s4', '#141b34', '#44527f'),
      `<rect width="1600" height="600" fill="url(#s4)"/>
       <g fill="#e8edf7" opacity=".7"><circle cx="200" cy="80" r="2"/><circle cx="560" cy="130" r="2"/><circle cx="1000" cy="60" r="2"/><circle cx="1400" cy="110" r="2"/></g>
       <rect y="440" width="1600" height="160" fill="#262c3d"/>
       <g stroke="#9aa5c0" stroke-width="6"><path d="M180 440V250M1420 440V250"/></g>
       <g fill="#ffe9a8"><circle cx="180" cy="245" r="16"/><circle cx="1420" cy="245" r="16"/></g>
       <path d="M180 250 100 440h160ZM1420 250l-80 190h160Z" fill="#ffe9a8" opacity=".12"/>
       <rect x="1180" y="350" width="150" height="90" rx="6" fill="#33405f"/><g fill="#ffe9a8"><rect x="1195" y="365" width="26" height="20"/><rect x="1235" y="365" width="26" height="20"/><rect x="1275" y="365" width="26" height="20"/></g>
       ${plane(640, 400, 0, 1.5, '#e9eef7')}`)
  }
];

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountCarousel(root, { interval = 6000 } = {}) {
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'Flight highlights');
  root.innerHTML = `
    <div class="car-stage">${slides.map((s, i) => `
      <figure class="car-slide" data-i="${i}" aria-hidden="${i ? 'true' : 'false'}" aria-label="${s.alt}">
        ${s.art}
        <figcaption><strong>${s.title}</strong><span>${s.sub}</span></figcaption>
      </figure>`).join('')}
    </div>
    <button type="button" class="car-btn prev" aria-label="Previous slide">&#10094;</button>
    <button type="button" class="car-btn next" aria-label="Next slide">&#10095;</button>
    <div class="car-dots" role="tablist" aria-label="Choose slide">${slides.map((s, i) => `<button type="button" role="tab" aria-label="Slide ${i + 1}: ${s.title}" data-dot="${i}"></button>`).join('')}</div>
    <div class="car-credit">Original illustrations, Swiipr</div>`;

  const els = [...root.querySelectorAll('.car-slide')];
  const dots = [...root.querySelectorAll('[data-dot]')];
  let cur = 0, timer = null, paused = false;

  const show = i => {
    cur = (i + els.length) % els.length;
    els.forEach((e, k) => { e.classList.toggle('on', k === cur); e.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
    dots.forEach((d, k) => d.setAttribute('aria-selected', k === cur ? 'true' : 'false'));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (!paused && !reduce()) timer = setInterval(() => show(cur + 1), interval); };

  root.querySelector('.prev').addEventListener('click', () => { show(cur - 1); start(); });
  root.querySelector('.next').addEventListener('click', () => { show(cur + 1); start(); });
  dots.forEach(d => d.addEventListener('click', () => { show(+d.dataset.dot); start(); }));
  root.addEventListener('mouseenter', () => { paused = true; stop(); });
  root.addEventListener('mouseleave', () => { paused = false; start(); });
  root.addEventListener('focusin', () => { paused = true; stop(); });
  root.addEventListener('focusout', () => { paused = false; start(); });
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { show(cur - 1); start(); }
    if (e.key === 'ArrowRight') { show(cur + 1); start(); }
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  show(0); start();
  return { show, get index() { return cur; } };
}
