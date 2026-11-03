const STORAGE_KEY = 'swiipr.releaseChecklist.v1';

const groups = [
  ['Before release', ['Release notes and scope reviewed', 'Rollback plan agreed and tested', 'Support team and on-call informed', 'Monitoring dashboards and alerts checked', 'Recent baseline of declines/failures noted']],
  ['During release', ['Deployment started and confirmed by release owner', 'Health endpoints returning OK', 'Smoke test: sign-in works', 'Smoke test: card transactions fetch works', 'No spike in 5xx or 429 responses']],
  ['After release', ['Compare decline / failure rate with baseline', 'Spot-check a few card transactions end to end', 'Reconciliation run reviewed', 'Open tickets re-checked for release impact', 'Release closed and summary shared']],
];

const $ = (id) => document.getElementById(id);
let state = {};
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { state = {}; }

const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };

function render() {
  $('lists').replaceChildren(...groups.map(([title, items]) => {
    const wrap = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = title;
    wrap.append(h);
    items.forEach((text) => {
      const label = document.createElement('label');
      label.className = 'check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state[text];
      cb.addEventListener('change', () => { state[text] = cb.checked; save(); summary(); });
      label.append(cb, ' ', text);
      wrap.append(label);
    });
    return wrap;
  }));
  summary();
}

function summary() {
  const all = groups.flatMap(([, items]) => items);
  const done = all.filter((t) => state[t]).length;
  $('progress').max = all.length;
  $('progress').value = done;
  $('summary').textContent = `${done} of ${all.length} done`;
}

$('reset').addEventListener('click', () => { state = {}; save(); render(); });
render();
