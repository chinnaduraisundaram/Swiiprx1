// Normalises a pasted bearer token: trims, strips quotes and a leading "Bearer ". Returns '' when empty.
export function normalizeBearerToken(input) {
  let value = (input ?? '').trim().replace(/^["']|["']$/g, '').trim();
  value = value.replace(/^bearer\s+/i, '').trim();
  return value;
}

// Light sanity check only (three base64url segments); the API remains the authority on validity.
export function looksLikeJwt(token) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token);
}

// Returns the token's expiry as epoch ms, or null if it can't be read.
export function jwtExpiryMs(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
