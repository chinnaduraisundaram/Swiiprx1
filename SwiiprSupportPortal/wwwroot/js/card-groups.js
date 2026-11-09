// Pure helpers for the Card Groups Update page (no DOM access; unit-tested with node --test).
import { csvQuote } from './utils.js?v=20261110b';

export const COLUMNS = ['CardToken', 'Status', 'Message', 'DryRun', 'BeforeGroups', 'UpdateResponse', 'AfterGroups'];

const pick = (o, name) => o?.[name] ?? o?.[name.charAt(0).toLowerCase() + name.slice(1)];

export function toRow(r) {
  return [pick(r, 'CardToken'), pick(r, 'Status'), pick(r, 'Message'), pick(r, 'DryRun') ? 'true' : 'false', pick(r, 'Before'), pick(r, 'UpdateResponse'), pick(r, 'After')];
}

// Same quoting style as the other exports: every value quoted, quotes doubled.
export function buildCsv(results) {
  const lines = [COLUMNS, ...results.map(toRow)].map((row) => row.map(csvQuote).join(','));
  return lines.join('\r\n');
}

export function summarize(results) {
  const counts = { updated: 0, 'dry-run': 0, skipped: 0, failed: 0 };
  for (const r of results) {
    const s = String(pick(r, 'Status') ?? '').toLowerCase();
    if (s in counts) counts[s]++;
  }
  return counts;
}

// A real (mutating) run needs an explicit confirmation; a dry run never does.
// "configured" means the server has credentials or the user pasted a full set.
export function canRun({ tokenCount, dryRun, confirmed, configured }) {
  if (!configured || tokenCount <= 0) return false;
  return dryRun || confirmed === true;
}

export function confirmText(tokenCount, dryRun) {
  return dryRun
    ? `Dry run: ${tokenCount} card(s) will only be read (GET). Nothing is changed.`
    : `This will reset the card groups of ${tokenCount} card(s) on Paynetics (PUT with empty usage, fees, schedule_fees, web_service_fees, limits, linkage and mcc). This cannot be undone from this page.`;
}

// Pasted credentials are only complete with both an API key and a client secret.
export function credentialsComplete(c) {
  return Boolean(c?.apiKey?.trim() && c?.clientSecret?.trim());
}

// Only non-blank fields are sent; the server falls back to its own configuration for the rest.
export function credentialPayload(c) {
  const out = {};
  for (const k of ['baseUrl', 'apiKey', 'clientSecret']) {
    const v = c?.[k]?.trim();
    if (v) out[k] = v;
  }
  return out;
}

export function credentialStatus(c, serverConfigured) {
  if (credentialsComplete(c)) return 'Credentials set (pasted)';
  if (serverConfigured) return 'Credentials set (server)';
  return 'Not set';
}