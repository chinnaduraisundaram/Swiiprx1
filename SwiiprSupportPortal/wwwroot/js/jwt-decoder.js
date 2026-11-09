import { decodeJwt, formatDuration } from './utils.js?v=20261110b';

const $ = (id) => document.getElementById(id);
let timer;

function show() {
  clearInterval(timer);
  const value = $('jwt').value.trim();
  if (!value) {
    $('status').textContent = '';
    $('header').textContent = $('payload').textContent = $('times').textContent = '-';
    return;
  }
  try {
    const d = decodeJwt(value);
    $('header').textContent = JSON.stringify(d.header, null, 2);
    $('payload').textContent = JSON.stringify(d.payload, null, 2);
    const tick = () => {
      const left = d.expiresAt ? Math.floor((Date.parse(d.expiresAt) - Date.now()) / 1000) : null;
      $('status').textContent = left === null ? 'No exp claim' : left > 0 ? `Valid for ${formatDuration(left)}` : `Expired ${formatDuration(left)}`;
      $('status').className = left !== null && left <= 0 ? 'failed' : 'success';
    };
    $('times').textContent = [`Issued: ${d.issuedAt ?? 'n/a'}`, `Not before: ${d.notBefore ?? 'n/a'}`, `Expires: ${d.expiresAt ?? 'n/a'}`, `Signature present: ${d.hasSignature ? 'yes (not verified)' : 'no'}`].join('\n');
    $('times').style.whiteSpace = 'pre-line';
    tick();
    timer = setInterval(tick, 1000);
  } catch (e) {
    $('status').textContent = e.message;
    $('status').className = 'failed';
    $('header').textContent = $('payload').textContent = $('times').textContent = '-';
  }
}

$('jwt').addEventListener('input', show);
$('clear').addEventListener('click', () => { $('jwt').value = ''; show(); });
