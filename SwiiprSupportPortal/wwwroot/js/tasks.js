// Task registry: add an entry here (plus a page, or use the planned.html template) and it appears on the home page and catalogue.
const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  card: svg('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>'),
  export: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>'),
  plane: svg('<path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4-5a1.7 1.7 0 0 1 2.4 2.4l-5 4 .5 8L13 21l-2.5-7.5Z"/>'),
  more: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m16 7 3 3"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
  check: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19V5"/><path d="M9 8h6"/>'),
  alert: svg('<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17v.5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>'),
  scale: svg('<path d="M12 3v18M6 21h12"/><path d="M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5Z"/>'),
};

export const categories = ['Cards', 'Payments & Reconciliation', 'Utilities', 'Operations'];

// status: 'available' (working page) | 'planned' (template page, not functional).
export const tasks = [
  { id: 'card-transactions', title: 'Card Transactions Export', short: 'Card Export', href: '/card-transactions.html', icon: 'card', category: 'Cards', status: 'available', nav: true,
    description: 'Fetch card transactions for a list of card tokens from the Swiipr platform and download one CSV.', tags: ['Platform API', 'CSV'] },
  { id: 'card-balance', title: 'Card Balance Check', icon: 'card', category: 'Cards', status: 'planned',
    description: 'Look up the current balance of one or many cards.',
    purpose: 'Quickly confirm available balance for cards raised in support tickets without opening the back office.',
    inputs: ['List of card tokens'], outputs: ['Table of token, currency, available balance', 'CSV export'] },
  { id: 'card-status', title: 'Card Status Lookup', icon: 'shield', category: 'Cards', status: 'planned',
    description: 'Check whether cards are active, blocked, expired or pending.',
    purpose: 'Triage "card declined" tickets by seeing the card lifecycle state in bulk.',
    inputs: ['List of card tokens'], outputs: ['Status per card', 'Last status change date'] },
  { id: 'kyc-lookup', title: 'KYC / Account Lookup', icon: 'search', category: 'Cards', status: 'planned',
    description: 'Find the account and verification state behind a card or user.',
    purpose: 'Answer onboarding and verification questions without manual database queries.',
    inputs: ['Card token, account id or email'], outputs: ['Account summary', 'KYC status'] },
  { id: 'transaction-search', title: 'Transaction Search', icon: 'search', category: 'Payments & Reconciliation', status: 'planned',
    description: 'Search a single transaction by token, reference or amount and date range.',
    purpose: 'Resolve one-off customer queries about a specific payment.',
    inputs: ['Transaction token / reference', 'Optional date range and amount'], outputs: ['Matching transactions', 'Linked authorisation/presentment'] },
  { id: 'reconciliation', title: 'Reconciliation Report', icon: 'scale', category: 'Payments & Reconciliation', status: 'planned',
    description: 'Compare platform transactions with a scheme or bank file.',
    purpose: 'Spot missing or mismatched transactions after a release or settlement run.',
    inputs: ['Platform export CSV', 'Scheme/bank CSV'], outputs: ['Matched / unmatched lists', 'Totals difference'] },
  { id: 'failed-payments', title: 'Failed Payments Review', icon: 'alert', category: 'Payments & Reconciliation', status: 'planned',
    description: 'Review declined and failed payments grouped by reason.',
    purpose: 'See spikes in declines quickly during and after a production release.',
    inputs: ['Date range', 'Optional card or merchant'], outputs: ['Failures grouped by response code', 'CSV export'] },
  { id: 'chargebacks', title: 'Chargeback / Dispute Tracker', icon: 'book', category: 'Payments & Reconciliation', status: 'planned',
    description: 'Track open disputes and their deadlines.',
    purpose: 'Make sure dispute response deadlines are not missed.',
    inputs: ['Dispute reference or card token'], outputs: ['Dispute list with status and due date'] },
  { id: 'refunds', title: 'Refund Status', icon: 'refresh', category: 'Payments & Reconciliation', status: 'planned',
    description: 'Check whether a refund has been issued and settled.',
    purpose: 'Answer "where is my refund" tickets with one lookup.',
    inputs: ['Original transaction token or refund reference'], outputs: ['Refund state', 'Dates and amounts'] },
  { id: 'token-utils', title: 'Bulk Token Utilities', short: 'Token Utils', href: '/token-utils.html', icon: 'key', category: 'Utilities', status: 'available',
    description: 'Clean pasted token lists: trim, de-duplicate, sort, count, copy and download. Runs in your browser.', tags: ['Client-side'] },
  { id: 'csv-viewer', title: 'CSV Viewer / Cleaner', short: 'CSV Viewer', href: '/csv-viewer.html', icon: 'table', category: 'Utilities', status: 'available',
    description: 'Open a CSV locally, search and filter rows, and download the filtered result. Nothing is uploaded.', tags: ['Client-side'] },
  { id: 'jwt-decoder', title: 'JWT Decoder', short: 'JWT Decoder', href: '/jwt-decoder.html', icon: 'wrench', category: 'Utilities', status: 'available',
    description: 'Decode a token locally and see its claims and expiry countdown. Never sent or stored.', tags: ['Client-side', 'Security'] },
  { id: 'checklist', title: 'Production Release Checklist', short: 'Checklist', href: '/checklist.html', icon: 'check', category: 'Operations', status: 'available', nav: true,
    description: 'Interactive release checklist saved in this browser only.', tags: ['Release'] },
  { id: 'runbook', title: 'Support Runbook & FAQ', short: 'Runbook', href: '/runbook.html', icon: 'book', category: 'Operations', status: 'available', nav: true,
    description: 'How to use the portal, token and JWT tips, and what to do about common API errors.', tags: ['Guide'] },
];

export const hrefOf = (t) => t.href ?? `/planned.html?id=${encodeURIComponent(t.id)}`;

export const quickLinks = [
  { title: 'Swiipr website', href: 'https://swiipr.com' },
  { title: 'Swiipr platform API', href: 'https://api.swiiprx.com' },
  { title: 'Swiipr sign-in (B2C)', href: 'https://login.swiiprx.com' },
];

export const home = { id: 'home', title: 'Home', short: 'Home', href: '/', icon: 'home' };
export const allTasks = { id: 'all-tasks', title: 'All Tasks', short: 'All Tasks', href: '/#tasks', icon: 'more' };
