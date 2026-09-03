// Thin client over Setu's FIU Gateway. Endpoints, headers and payload shapes
// below are confirmed against docs.setu.co/data/account-aggregator. The one
// unconfirmed piece is getAccessToken()'s exact endpoint — the public docs
// describe every call as needing `Authorization: Bearer {access_token}` but
// don't show how that token is minted. Confirm this against Setu's Postman
// collection (linked from their docs) once real sandbox credentials exist,
// and adjust just this function if the real shape differs.

const BASE = process.env.SETU_BASE_URL || 'https://fiu-sandbox.setu.co';

let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.token;
  const res = await fetch(`${BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SETU_CLIENT_ID,
      client_secret: process.env.SETU_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Setu auth failed: ${res.status} ${await res.text().catch(() => '')}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

async function setuFetch(path, opts = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-product-instance-id': process.env.SETU_PRODUCT_INSTANCE_ID,
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`Setu ${path} failed: ${res.status} ${await res.text().catch(() => '')}`);
  return res.json();
}

function createConsent({ vua, months = 6 }) {
  return setuFetch('/consents', {
    method: 'POST',
    body: JSON.stringify({
      consentDuration: { unit: 'MONTH', value: String(months) },
      vua,
      context: [],
    }),
  });
}

function getConsentStatus(id) {
  return setuFetch(`/consents/${id}`);
}

function createDataSession(consentId, dataRange) {
  return setuFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ consentId, dataRange, format: 'json' }),
  });
}

function getSession(sessionId) {
  return setuFetch(`/sessions/${sessionId}`);
}

module.exports = { createConsent, getConsentStatus, createDataSession, getSession };
