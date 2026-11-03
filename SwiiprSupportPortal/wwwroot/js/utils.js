// Pure helpers shared by the client-side utilities (no DOM access, unit-tested with node --test).

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

// Normalises a pasted list (Excel-style tabs/quotes/NBSP/CRLF) into tokens.
export function cleanTokens(text, { dedupe = true, sort = false, caseInsensitive = false } = {}) {
  const raw = String(text ?? '')
    .replace(INVISIBLE, '')
    .replace(SPACES, ' ')
    .split(/[\r\n\t,;]+/)
    .map((t) => t.trim().replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter((t) => t.length > 0);
  const seen = new Set();
  const tokens = [];
  for (const t of raw) {
    const key = caseInsensitive ? t.toLowerCase() : t;
    if (dedupe && seen.has(key)) continue;
    seen.add(key);
    tokens.push(t);
  }
  if (sort) tokens.sort((a, b) => a.localeCompare(b));
  return { tokens, total: raw.length, unique: new Set(raw.map((t) => (caseInsensitive ? t.toLowerCase() : t))).size, duplicates: raw.length - new Set(raw.map((t) => (caseInsensitive ? t.toLowerCase() : t))).size };
}

// RFC 4180 style parser: quoted fields, doubled quotes, embedded commas/newlines, auto delimiter (comma/semicolon/tab).
export function parseCsv(text, delimiter) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const delim = delimiter ?? detectDelimiter(src);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function detectDelimiter(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

// Case-insensitive contains filter over all columns (column = -1) or one column. Header row is kept by the caller.
export function filterRows(rows, query, column = -1) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => (column >= 0 ? [r[column] ?? ''] : r).some((c) => String(c).toLowerCase().includes(q)));
}

export function csvQuote(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvQuote).join(',')).join('\r\n');
}

function b64urlToString(part) {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Decodes (does not verify) a JWT. Throws Error with a readable message when malformed.
export function decodeJwt(token, nowMs = Date.now()) {
  const t = String(token ?? '').trim().replace(/^Bearer\s+/i, '');
  const parts = t.split('.');
  if (parts.length < 2 || parts.length > 3 || parts.slice(0, 2).some((p) => !p)) {
    throw new Error('Not a JWT: expected header.payload[.signature]');
  }
  let header, payload;
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch {
    throw new Error('Could not decode JWT header/payload (invalid base64url or JSON)');
  }
  const num = (v) => (typeof v === 'number' ? v : undefined);
  const exp = num(payload.exp);
  const iat = num(payload.iat);
  const nbf = num(payload.nbf);
  return {
    header,
    payload,
    hasSignature: parts.length === 3 && parts[2].length > 0,
    expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
    issuedAt: iat ? new Date(iat * 1000).toISOString() : null,
    notBefore: nbf ? new Date(nbf * 1000).toISOString() : null,
    secondsLeft: exp ? Math.floor(exp - nowMs / 1000) : null,
    expired: exp ? exp * 1000 <= nowMs : false,
  };
}

export function formatDuration(totalSeconds) {
  const neg = totalSeconds < 0;
  let s = Math.abs(Math.floor(totalSeconds));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const text = [d && `${d}d`, (d || h) && `${h}h`, (d || h || m) && `${m}m`, `${s}s`].filter(Boolean).join(' ');
  return neg ? `${text} ago` : text;
}
