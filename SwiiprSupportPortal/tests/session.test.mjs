import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSession, sessionSettings, formatMmSs } from '../wwwroot/js/session.js';

const MIN = 60_000;

test('evaluateSession: active, warning, expired', () => {
  const base = { lastActivity: 0, timeoutMs: 60 * MIN, warnMs: 5 * MIN };
  assert.deepEqual(evaluateSession({ ...base, now: 10 * MIN }), { state: 'active', msLeft: 50 * MIN });
  assert.equal(evaluateSession({ ...base, now: 55 * MIN }).state, 'warning');
  assert.equal(evaluateSession({ ...base, now: 60 * MIN }).state, 'expired');
  assert.equal(evaluateSession({ ...base, now: 90 * MIN }).msLeft, 0);
});

test('sessionSettings defaults to 60 minutes with a 5 minute warning', () => {
  assert.deepEqual(sessionSettings({}), { timeoutMs: 60 * MIN, warnMs: 5 * MIN });
  assert.deepEqual(sessionSettings(undefined), { timeoutMs: 60 * MIN, warnMs: 5 * MIN });
});

test('sessionSettings honours config, disables on 0, caps warning at half', () => {
  assert.equal(sessionSettings({ sessionTimeoutMinutes: 30 }).timeoutMs, 30 * MIN);
  assert.equal(sessionSettings({ sessionTimeoutMinutes: 0 }).timeoutMs, 0);
  assert.equal(sessionSettings({ sessionTimeoutMinutes: 4, sessionWarningMinutes: 5 }).warnMs, 2 * MIN);
});

test('formatMmSs', () => {
  assert.equal(formatMmSs(299_500), '5:00');
  assert.equal(formatMmSs(61_000), '1:01');
  assert.equal(formatMmSs(-5), '0:00');
});
