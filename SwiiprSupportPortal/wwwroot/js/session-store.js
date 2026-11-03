// Tab-scoped session state kept in sessionStorage under one versioned key, so a refresh or navigating between
// portal pages keeps the same absolute expiry. Pure functions: storage and clock are passed in (unit-tested).
// The pasted JWT lives here only for the lifetime of the tab; it is never logged.

export const SESSION_KEY = 'swiipr.session.v1';

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// Earlier of "now + timeout" and the JWT's own exp. expiresAt is null when neither applies (timeout disabled).
export function computeExpiry({ now, timeoutMs, tokenExp = null }) {
  const byTimeout = timeoutMs > 0 ? now + timeoutMs : null;
  const byToken = isNum(tokenExp) ? tokenExp : null;
  if (byTimeout === null) return { expiresAt: byToken, limitedByToken: byToken !== null };
  if (byToken !== null && byToken < byTimeout) return { expiresAt: byToken, limitedByToken: true };
  return { expiresAt: byTimeout, limitedByToken: false };
}

function save(storage, s) {
  storage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

// Starts a fresh window (sign-in or JWT paste). Returns null (and stores nothing) if it would already be expired.
export function startSession(storage, { now, timeoutMs, token = '', name = '', tokenExp = null }) {
  const { expiresAt, limitedByToken } = computeExpiry({ now, timeoutMs, tokenExp });
  if (expiresAt !== null && expiresAt <= now) {
    clearSession(storage);
    return null;
  }
  return save(storage, { v: 1, startedAt: now, expiresAt, limitedByToken, token, name, tokenExp: isNum(tokenExp) ? tokenExp : null });
}

// Returns { session, expired }. Expired or malformed stored state is wiped and reported as expired.
export function loadSession(storage, now) {
  const raw = storage.getItem(SESSION_KEY);
  if (raw === null) return { session: null, expired: false };
  let s;
  try { s = JSON.parse(raw); } catch { s = null; }
  const valid = s && s.v === 1 && isNum(s.startedAt) && (s.expiresAt === null || isNum(s.expiresAt))
    && typeof s.token === 'string' && typeof s.name === 'string';
  if (!valid || (s.expiresAt !== null && s.expiresAt <= now)) {
    clearSession(storage);
    return { session: null, expired: true };
  }
  return { session: s, expired: false };
}

// "Stay signed in": a fresh window from now (still capped by the token's own exp).
export function extendSession(storage, session, { now, timeoutMs }) {
  return startSession(storage, { now, timeoutMs, token: session.token, name: session.name, tokenExp: session.tokenExp });
}

export function updateSession(storage, session, patch) {
  return save(storage, { ...session, ...patch });
}

export function clearSession(storage) {
  storage.removeItem(SESSION_KEY);
}

// On expiry: remove the session, MSAL's cached accounts/tokens and the remembered card-token lists.
export function wipeAll(storage) {
  const doomed = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k === SESSION_KEY || k.startsWith('msal.') || k.startsWith('swiipr.cardTokens')) doomed.push(k);
  }
  doomed.forEach((k) => storage.removeItem(k));
}
