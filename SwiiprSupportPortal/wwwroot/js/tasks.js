// Task registry: add an entry here (plus a page) and it appears in the menu and on the home page.
const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  card: svg('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>'),
  export: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>'),
  plane: svg('<path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4-5a1.7 1.7 0 0 1 2.4 2.4l-5 4 .5 8L13 21l-2.5-7.5Z"/>'),
  more: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
};

export const tasks = [
  {
    id: 'card-transactions',
    title: 'Card Transactions Export',
    short: 'Card Transactions',
    href: '/card-transactions.html',
    icon: 'card',
    description: 'Fetch card transactions for a list of card tokens from the Swiipr platform and download them as one CSV.',
    tags: ['Cards', 'CSV export'],
  },
];

export const home = { id: 'home', title: 'Home', short: 'Home', href: '/', icon: 'home' };
