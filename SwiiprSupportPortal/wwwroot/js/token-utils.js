import { cleanTokens } from './utils.js?v=20261104c';

const $ = (id) => document.getElementById(id);
let current = [];

function update() {
  const r = cleanTokens($('input').value, { dedupe: $('dedupe').checked, sort: $('sort').checked, caseInsensitive: $('ci').checked });
  current = r.tokens;
  $('output').value = r.tokens.join('\n');
  $('stats').textContent = `${r.total} entered \u00b7 ${r.unique} unique \u00b7 ${r.duplicates} duplicates \u00b7 ${r.tokens.length} in result`;
}

['input', 'dedupe', 'sort', 'ci'].forEach((id) => $(id).addEventListener('input', update));
$('clear').addEventListener('click', () => { $('input').value = ''; update(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(current.join('\n')); $('note').textContent = 'Copied'; }
  catch { $('output').select(); $('note').textContent = 'Press Ctrl+C to copy'; }
});
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([current.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'tokens.txt' });
  a.click();
  URL.revokeObjectURL(url);
});
update();
