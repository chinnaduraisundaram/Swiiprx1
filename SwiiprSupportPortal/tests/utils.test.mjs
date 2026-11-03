import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTokens, parseCsv, filterRows, toCsv, decodeJwt, formatDuration, detectDelimiter } from '../wwwroot/js/utils.js';
import { tasks, categories } from '../wwwroot/js/tasks.js';

test('cleanTokens trims, strips quotes/NBSP, dedupes and counts', () => {
  const r = cleanTokens('\u00a0"abc"\t\r\n abc \n"d,e"\n\u200Bxyz\n');
  assert.deepEqual(r.tokens, ['abc', 'd', 'e', 'xyz']);
  assert.equal(r.total, 5);
  assert.equal(r.duplicates, 1);
});

test('cleanTokens sort and case-insensitive dedupe', () => {
  assert.deepEqual(cleanTokens('b\nA\na', { sort: true, caseInsensitive: true }).tokens, ['A', 'b']);
  assert.deepEqual(cleanTokens('b\nb', { dedupe: false }).tokens, ['b', 'b']);
});

test('parseCsv handles quotes, embedded commas/newlines and CRLF', () => {
  const rows = parseCsv('a,b\r\n"x,1","he said ""hi""\nthere"\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x,1', 'he said "hi"\nthere']]);
});

test('detectDelimiter picks semicolon and tab', () => {
  assert.equal(detectDelimiter('a;b;c'), ';');
  assert.equal(detectDelimiter('a\tb'), '\t');
  assert.deepEqual(parseCsv('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('filterRows by all columns and one column', () => {
  const rows = [['A1', 'x'], ['B2', 'a1']];
  assert.equal(filterRows(rows, 'a1').length, 2);
  assert.equal(filterRows(rows, 'a1', 0).length, 1);
  assert.equal(filterRows(rows, '').length, 2);
});

test('toCsv quotes and escapes', () => {
  assert.equal(toCsv([['a"b', 'c,d']]), '"a""b","c,d"');
});

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

test('decodeJwt decodes claims and expiry, strips Bearer', () => {
  const now = 1_700_000_000_000;
  const jwt = `${b64({ alg: 'RS256' })}.${b64({ name: 'Zoë', exp: 1_700_000_100, iat: 1_699_999_000 })}.sig`;
  const d = decodeJwt(`Bearer ${jwt}`, now);
  assert.equal(d.header.alg, 'RS256');
  assert.equal(d.payload.name, 'Zoë');
  assert.equal(d.secondsLeft, 100);
  assert.equal(d.expired, false);
  assert.equal(d.hasSignature, true);
  assert.equal(decodeJwt(jwt, now + 200_000).expired, true);
});

test('decodeJwt rejects garbage', () => {
  assert.throws(() => decodeJwt('abc'), /Not a JWT/);
  assert.throws(() => decodeJwt('@@.@@.x'), /decode/);
});

test('formatDuration', () => {
  assert.equal(formatDuration(3725), '1h 2m 5s');
  assert.equal(formatDuration(-30), '30s ago');
});

test('registry: unique ids, valid categories, hrefs', () => {
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  for (const t of tasks) {
    assert.ok(categories.includes(t.category), t.id);
    assert.ok(t.href?.startsWith('/'), t.id);
  }
});
