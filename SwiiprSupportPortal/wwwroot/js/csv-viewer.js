import { parseCsv, filterRows, toCsv } from './utils.js?v=20261104';

const $ = (id) => document.getElementById(id);
const MAX_RENDER = 500;
let header = [];
let body = [];
let filtered = [];

function render() {
  filtered = filterRows(body, $('query').value, Number($('column').value));
  const shown = filtered.slice(0, MAX_RENDER);
  const grid = $('grid');
  grid.replaceChildren();
  const thead = grid.createTHead().insertRow();
  header.forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.append(th); });
  const tbody = grid.createTBody();
  shown.forEach((r) => {
    const tr = tbody.insertRow();
    header.forEach((_, i) => { tr.insertCell().textContent = r[i] ?? ''; });
  });
  $('info').textContent = `${filtered.length} of ${body.length} rows match` + (filtered.length > MAX_RENDER ? ` (showing first ${MAX_RENDER}; download includes all matches)` : '');
  $('download').disabled = filtered.length === 0;
}

$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const rows = parseCsv(await file.text());
  header = rows[0] ?? [];
  body = rows.slice(1);
  $('column').replaceChildren(new Option('All columns', '-1'), ...header.map((h, i) => new Option(h || `Column ${i + 1}`, String(i))));
  $('query').disabled = $('column').disabled = false;
  render();
});
$('query').addEventListener('input', render);
$('column').addEventListener('change', render);
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCsv([header, ...filtered])], { type: 'text/csv;charset=utf-8' }));
  Object.assign(document.createElement('a'), { href: url, download: 'filtered.csv' }).click();
  URL.revokeObjectURL(url);
});
