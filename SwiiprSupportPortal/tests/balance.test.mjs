import test from 'node:test';
import assert from 'node:assert/strict';
import { isFlagged, summarize } from '../wwwroot/js/balance.js';

test('isFlagged: non-active status or blocked > 0', () => {
  assert.equal(isFlagged({ status: 'active', blocked: '0' }), false);
  assert.equal(isFlagged({ status: 'inactive', blocked: '0' }), true);
  assert.equal(isFlagged({ status: 'active', blocked: '5.5' }), true);
  assert.equal(isFlagged({ Status: 'Active', Blocked: '0' }), false);
});

test('summarize counts cards by status and totals available per currency', () => {
  const rows = [
    { cardToken: 'a', status: 'active', currency: 'EUR', available: '10.10' },
    { cardToken: 'a', status: 'active', currency: 'GBP', available: '1' },
    { cardToken: 'b', status: 'inactive', currency: 'EUR', available: '0.20' },
    { cardToken: 'c', status: '', currency: '', available: '' },
  ];
  const s = summarize(rows, 2);
  assert.deepEqual(s.byStatus, { active: 1, inactive: 1 });
  assert.deepEqual(s.totals, { EUR: 10.3, GBP: 1 });
  assert.equal(s.failed, 2);
  assert.equal(s.cards, 2);
});
