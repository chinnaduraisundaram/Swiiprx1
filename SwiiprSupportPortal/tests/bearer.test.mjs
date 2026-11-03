import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBearerToken, looksLikeJwt, jwtExpiryMs } from '../wwwroot/js/bearer.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => `${b64({ alg: 'none' })}.${b64(payload)}.sig`;

test('normalizeBearerToken strips whitespace, quotes and Bearer prefix', () => {
  assert.equal(normalizeBearerToken('  Bearer abc.def.ghi \n'), 'abc.def.ghi');
  assert.equal(normalizeBearerToken('"abc.def.ghi"'), 'abc.def.ghi');
  assert.equal(normalizeBearerToken('bearer   abc.def.ghi'), 'abc.def.ghi');
  assert.equal(normalizeBearerToken(null), '');
});

test('looksLikeJwt checks the three-segment shape', () => {
  assert.ok(looksLikeJwt(jwt({ a: 1 })));
  assert.ok(!looksLikeJwt('not a token'));
  assert.ok(!looksLikeJwt('a.b'));
});

test('jwtExpiryMs reads exp or returns null', () => {
  assert.equal(jwtExpiryMs(jwt({ exp: 1700000000 })), 1700000000000);
  assert.equal(jwtExpiryMs(jwt({})), null);
  assert.equal(jwtExpiryMs('garbage'), null);
});
