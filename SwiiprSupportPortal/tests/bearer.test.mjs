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

import { jwtDisplayName, initials } from '../wwwroot/js/bearer.js';

const claimsJwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

test('jwtDisplayName prefers name, then given/family, emails, email', () => {
  assert.equal(jwtDisplayName(claimsJwt({ name: 'Ada Lovelace', email: 'a@x.com' })), 'Ada Lovelace');
  assert.equal(jwtDisplayName(claimsJwt({ given_name: 'Ada', family_name: 'Byron' })), 'Ada Byron');
  assert.equal(jwtDisplayName(claimsJwt({ emails: ['a@x.com'] })), 'a@x.com');
  assert.equal(jwtDisplayName('garbage'), '');
});

test('initials', () => {
  assert.equal(initials('Ops Specialist'), 'OS');
  assert.equal(initials('ada.lovelace@x.com'), 'AL');
  assert.equal(initials('Chinna'), 'CH');
  assert.equal(initials(''), 'SE');
});

test('initials for default user', () => assert.equal(initials('Chinna Dev'), 'CD'));
