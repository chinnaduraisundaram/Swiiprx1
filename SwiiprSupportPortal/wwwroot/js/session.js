// Idle-session logic. evaluateSession is pure (unit-tested); startSessionTimer wires it to DOM activity events.

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

// isBusy (e.g. a fetch is running) counts as activity. Returns { touch, stop }.
export function startSessionTimer({ timeoutMs, warnMs, isBusy = () => false, onWarning, onActive, onExpire, now = () => Date.now() }) {
  if (!timeoutMs) return { touch() {}, stop() {} };
  let last = now();
  let expired = false;
  let lastState = 'active';
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  let lastTouch = 0;
  const touch = () => {
    if (expired) return;
    const t = now();
    if (t - lastTouch < 1000) return; // throttle noisy events
    lastTouch = t;
    last = t;
  };
  const stayActive = () => { if (!expired) { last = now(); lastTouch = last; } };
  const tick = () => {
    if (expired) return;
    if (isBusy()) last = now();
    const s = evaluateSession({ lastActivity: last, now: now(), timeoutMs, warnMs });
    if (s.state === 'expired') {
      expired = true;
      stop();
      onExpire?.();
    } else if (s.state === 'warning') {
      lastState = 'warning';
      onWarning?.(s.msLeft);
    } else if (lastState !== 'active') {
      lastState = 'active';
      onActive?.();
    }
  };
  events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
  const handle = setInterval(tick, 1000);
  function stop() {
    clearInterval(handle);
    events.forEach((e) => window.removeEventListener(e, touch));
  }
  return { touch: stayActive, stop };
}
