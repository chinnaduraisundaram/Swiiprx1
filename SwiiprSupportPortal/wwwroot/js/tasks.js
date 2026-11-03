// Task registry: add an entry here (plus a page) and it appears on the home page; set top: true to show it as its own top-level menu item (otherwise it is listed under the Tasks dropdown).
const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  card: svg('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>'),
  wallet: svg('<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="2.5"/><circle cx="16.5" cy="13.5" r="1.2"/>'),
  more: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m16 7 3 3"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
  check: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19V5"/><path d="M9 8h6"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5Z"/>'),
};

export const categories = ['Cards', 'Utilities', 'Operations'];

export const tasks = [
  { id: 'card-transactions', title: 'Card Transactions Export', short: 'Card Export', href: '/card-transactions.html', icon: 'card', category: 'Cards',
    description: 'Fetch card transactions for a list of card tokens from the Swiipr platform and download one CSV.', tags: ['Platform API', 'CSV'] },
  { id: 'card-balance', title: 'Status and Balance Check', short: 'Status and Balance Check', href: '/card-balance.html', icon: 'wallet', category: 'Cards',
    description: 'Check status, activation and balances for a list of card tokens from the Swiipr platform and download one CSV.', tags: ['Platform API', 'CSV'] },
  { id: 'token-utils', title: 'Bulk Token Utilities', short: 'Token Utils', href: '/token-utils.html', icon: 'key', category: 'Utilities',
    description: 'Clean pasted token lists: trim, de-duplicate, sort, count, copy and download. Runs in your browser.', tags: ['Client-side'] },
  { id: 'csv-viewer', title: 'CSV Viewer / Cleaner', short: 'CSV Viewer', href: '/csv-viewer.html', icon: 'table', category: 'Utilities',
    description: 'Open a CSV locally, search and filter rows, and download the filtered result. Nothing is uploaded.', tags: ['Client-side'] },
  { id: 'jwt-decoder', title: 'JWT Decoder', short: 'JWT Decoder', href: '/jwt-decoder.html', icon: 'wrench', category: 'Utilities',
    description: 'Decode a token locally and see its claims and expiry countdown. Never sent or stored.', tags: ['Client-side', 'Security'] },
  { id: 'checklist', title: 'Production Release Checklist', short: 'Checklist', href: '/checklist.html', icon: 'check', category: 'Operations', top: true,
    description: 'Interactive release checklist saved in this browser only.', tags: ['Release'] },
  { id: 'runbook', title: 'Support Runbook & FAQ', short: 'Runbook', href: '/runbook.html', icon: 'book', category: 'Operations', top: true,
    description: 'How to use the portal, token and JWT tips, and what to do about common API errors.', tags: ['Guide'] },
];

export const quickLinks = [
  { title: 'Swiipr website', href: 'https://swiipr.com' },
  { title: 'Swiipr platform API', href: 'https://api.swiiprx.com' },
  { title: 'Swiipr sign-in (B2C)', href: 'https://login.swiiprx.com' },
];

export const home = { id: 'home', title: 'Home', short: 'Home', href: '/', icon: 'home' };
export const allTasks = { id: 'all-tasks', title: 'All Tasks', short: 'All Tasks', href: '/#tasks', icon: 'more' };
