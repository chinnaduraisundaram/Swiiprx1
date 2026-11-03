// Session window maths (pure, unit-tested). The persisted absolute window lives in session-store.js; layout.js drives the UI.

export function evaluateSession({ lastActivity, now, timeoutMs, warnMs }) {
  const left = lastActivity + timeoutMs - now;
  if (left <= 0) return { state: 'expired', msLeft: 0 };
  return { state: left <= warnMs ? 'warning' : 'active', msLeft: left };
}

export function sessionSettings(config) {
  const minutes = Number(config?.sessionTimeoutMinutes ?? 60);
  const timeoutMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 0; // 0 disables the timeout
  const warnMinutes = Number(config?.sessionWarningMinutes ?? 5);
  const warnMs = Math.min(Math.max(0, (Number.isFinite(warnMinutes) ? warnMinutes : 5) * 60_000), timeoutMs / 2);
  return { timeoutMs, warnMs };
}

export function formatMmSs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
