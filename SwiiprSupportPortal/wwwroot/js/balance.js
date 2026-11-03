// Pure helpers for the Card Status & Balance page.

export const COLUMNS = ['CardToken', 'Status', 'IsActivated', 'IsOtpSmsEnabled', 'Currency', 'Available', 'Blocked', 'BalanceToken', 'ExternalIdentifier'];

const pick = (o, name) => o?.[name] ?? o?.[name.charAt(0).toLowerCase() + name.slice(1)];

export function isFlagged(row) {
  const blocked = Number(pick(row, 'Blocked'));
  const status = String(pick(row, 'Status') ?? '').trim().toLowerCase();
  return (status !== '' && status !== 'active') || (Number.isFinite(blocked) && blocked > 0);
}

// rows: flat balance rows (one per balance) from /api/balance/map; failed cards are counted separately.
export function summarize(rows, failedCount = 0) {
  const byStatus = {};
  const totals = {};
  const seenCards = new Set();
  for (const r of rows) {
    const card = pick(r, 'CardToken');
    const status = String(pick(r, 'Status') ?? '').trim().toLowerCase();
    if (status && !seenCards.has(card)) {
      seenCards.add(card);
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }
    const cur = pick(r, 'Currency');
    const amount = Number(pick(r, 'Available'));
    if (cur && Number.isFinite(amount)) totals[cur] = Math.round(((totals[cur] ?? 0) + amount) * 100) / 100;
  }
  return { byStatus, totals, failed: failedCount, cards: seenCards.size };
}
