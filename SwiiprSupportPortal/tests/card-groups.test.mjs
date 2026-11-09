import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, summarize, canRun, confirmText, COLUMNS, credentialsComplete, credentialPayload, credentialStatus } from '../wwwroot/js/card-groups.js';

test('csv header and quoting', () => {
  const csv = buildCsv([{ cardToken: 'abc', status: 'updated', message: 'say "hi"', dryRun: false, before: 'a,b', updateResponse: 'ok', after: 'x\ny' }]);
  const [head, row] = csv.split('\r\n');
  assert.equal(head, COLUMNS.map((c) => `"${c}"`).join(','));
  assert.equal(row.startsWith('"abc","updated","say ""hi""","false","a,b","ok","x'), true);
});

test('csv handles missing values and PascalCase', () => {
  const csv = buildCsv([{ CardToken: 't', Status: 'failed', DryRun: true }]);
  assert.match(csv.split('\r\n')[1], /^"t","failed","","true","","",""$/);
});

test('summarize counts by status', () => {
  const s = summarize([{ status: 'updated' }, { status: 'skipped' }, { status: 'failed' }, { status: 'failed' }, { status: 'dry-run' }]);
  assert.deepEqual(s, { updated: 1, 'dry-run': 1, skipped: 1, failed: 2 });
});

test('canRun gating', () => {
  assert.equal(canRun({ tokenCount: 2, dryRun: false, confirmed: false, configured: true }), false);
  assert.equal(canRun({ tokenCount: 2, dryRun: false, confirmed: true, configured: true }), true);
  assert.equal(canRun({ tokenCount: 2, dryRun: true, confirmed: false, configured: true }), true);
  assert.equal(canRun({ tokenCount: 0, dryRun: true, confirmed: true, configured: true }), false);
  assert.equal(canRun({ tokenCount: 2, dryRun: true, confirmed: true, configured: false }), false);
});

test('confirm text shows count', () => {
  assert.match(confirmText(5, false), /5 card/);
  assert.match(confirmText(5, true), /Nothing is changed/);
});

test('credentials need key and secret; payload omits blanks', () => {
  assert.equal(credentialsComplete({ apiKey: 'k', clientSecret: ' ' }), false);
  assert.equal(credentialsComplete({ apiKey: 'k', clientSecret: 's' }), true);
  assert.deepEqual(credentialPayload({ baseUrl: ' ', apiKey: ' k ', clientSecret: 's' }), { apiKey: 'k', clientSecret: 's' });
});

test('credential status never includes the values', () => {
  const c = { apiKey: 'fake-key', clientSecret: 'fake-secret' };
  assert.equal(credentialStatus(c, false), 'Credentials set (pasted)');
  assert.equal(credentialStatus({}, true), 'Credentials set (server)');
  assert.equal(credentialStatus({}, false), 'Not set');
  assert.ok(!credentialStatus(c, false).includes('fake'));
});