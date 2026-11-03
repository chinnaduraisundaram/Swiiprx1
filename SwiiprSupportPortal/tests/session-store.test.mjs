import test from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_KEY, computeExpiry, startSession, loadSession, extendSession, clearSession, wipeAll } from '../wwwroot/js/session-store.js';

const HOUR = 3_600_000;
const makeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
};

test('refresh/navigation keeps the same absolute expiry', () => {
  const st = makeStorage();
  const t0 = 1_000_000;
  startSession(st, { now: t0, timeoutMs: HOUR, token: 'tok', name: 'Chinna Dev' });
  const a = loadSession(st, t0 + 10 * 60_000).session; // "refresh" 10 min later
  const b = loadSession(st, t0 + 20 * 60_000).session; // another page 20 min later
  assert.equal(a.expiresAt, t0 + HOUR);
  assert.equal(b.expiresAt, t0 + HOUR);
  assert.equal(b.token, 'tok');
  assert.equal(b.name, 'Chinna Dev');
});

test('expired session is wiped and reported as expired', () => {
  const st = makeStorage();
  startSession(st, { now: 0, timeoutMs: HOUR, token: 'tok' });
  const r = loadSession(st, HOUR);
  assert.deepEqual(r, { session: null, expired: true });
  assert.equal(st.getItem(SESSION_KEY), null);
});

test('no stored session is not "expired"', () => {
  assert.deepEqual(loadSession(makeStorage(), 5), { session: null, expired: false });
});

test('malformed data is wiped and reported as expired', () => {
  for (const bad of ['{not json', '"x"', '{"v":2}', JSON.stringify({ v: 1, startedAt: 'a', expiresAt: 5, token: '', name: '' }), JSON.stringify({ v: 1, startedAt: 1, expiresAt: 5, token: 7, name: '' })]) {
    const st = makeStorage();
    st.setItem(SESSION_KEY, bad);
    const r = loadSession(st, 10);
    assert.equal(r.expired, true, bad);
    assert.equal(st.getItem(SESSION_KEY), null);
  }
});

test('Stay signed in starts a fresh window', () => {
  const st = makeStorage();
  const s = startSession(st, { now: 0, timeoutMs: HOUR, token: 't', name: 'n' });
  const ext = extendSession(st, s, { now: 50 * 60_000, timeoutMs: HOUR });
  assert.equal(ext.expiresAt, 50 * 60_000 + HOUR);
  assert.equal(loadSession(st, 70 * 60_000).session.expiresAt, 50 * 60_000 + HOUR);
});

test('JWT exp earlier than the window wins (and is flagged); later exp does not extend', () => {
  assert.deepEqual(computeExpiry({ now: 0, timeoutMs: HOUR, tokenExp: 20 * 60_000 }), { expiresAt: 20 * 60_000, limitedByToken: true });
  assert.deepEqual(computeExpiry({ now: 0, timeoutMs: HOUR, tokenExp: 2 * HOUR }), { expiresAt: HOUR, limitedByToken: false });
  assert.deepEqual(computeExpiry({ now: 0, timeoutMs: 0, tokenExp: 5 }), { expiresAt: 5, limitedByToken: true });
  assert.deepEqual(computeExpiry({ now: 0, timeoutMs: 0 }), { expiresAt: null, limitedByToken: false });
});

test('stay cannot extend beyond the JWT exp', () => {
  const st = makeStorage();
  const s = startSession(st, { now: 0, timeoutMs: HOUR, token: 't', tokenExp: 90 * 60_000 });
  const ext = extendSession(st, s, { now: 50 * 60_000, timeoutMs: HOUR });
  assert.equal(ext.expiresAt, 90 * 60_000);
  assert.equal(extendSession(st, s, { now: 95 * 60_000, timeoutMs: HOUR }), null);
});

test('already-expired token does not create a session', () => {
  const st = makeStorage();
  assert.equal(startSession(st, { now: 100, timeoutMs: HOUR, token: 't', tokenExp: 50 }), null);
  assert.equal(st.getItem(SESSION_KEY), null);
});

test('wipeAll removes session, msal and remembered card tokens only', () => {
  const st = makeStorage();
  startSession(st, { now: 0, timeoutMs: HOUR });
  st.setItem('msal.account.keys', '[]');
  st.setItem('swiipr.cardTokens', 'x');
  st.setItem('swiipr.cardTokens.balance', 'y');
  st.setItem('swiipr.returnTo', '/card-balance.html');
  wipeAll(st);
  assert.equal(st.length, 1);
  assert.equal(st.getItem('swiipr.returnTo'), '/card-balance.html');
  clearSession(st);
});
