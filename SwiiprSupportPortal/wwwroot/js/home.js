import { tasks, icons } from './tasks.js';

// B2C redirects back to the configured redirect URI (the site root); forward the auth response to the page that started sign-in.
if (/[#?&](code|error|state)=/.test(location.hash)) {
  location.replace('/card-transactions.html' + location.hash);
}

const grid = document.getElementById('task-grid');
grid.innerHTML =
  tasks
    .map(
      (t) => `
    <a class="task-card" href="${t.href}">
      <span class="task-icon">${icons[t.icon]}</span>
      <h3>${t.title}</h3>
      <p>${t.description}</p>
      <span class="task-tags">${(t.tags ?? []).map((x) => `<span>${x}</span>`).join('')}</span>
      <span class="task-go">Open &rarr;</span>
    </a>`,
    )
    .join('') +
  `<div class="task-card soon" aria-disabled="true">
      <span class="task-icon">${icons.more}</span>
      <h3>More tasks coming soon</h3>
      <p>New support tools will appear here and in the menu as they are added.</p>
    </div>`;
