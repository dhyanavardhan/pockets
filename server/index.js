require('dotenv').config();
const express = require('express');
const db = require('./db');
const setu = require('./setu');
const { normalizeFiData } = require('./normalize');

const app = express();
app.use(express.json());

// 1. App calls this to start a consent request. `vua` is the user's Account
// Aggregator handle (their AA-registered mobile number, e.g.
// "9999999999@setu" in sandbox) — collected by ConnectBankScreen.
app.post('/connect/start', async (req, res) => {
  const { vua } = req.body || {};
  if (!vua) return res.status(400).json({ error: 'vua is required' });
  try {
    const consent = await setu.createConsent({ vua });
    db.insertConsent(consent.id);
    res.json({ consentId: consent.id, approvalUrl: consent.url });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 2. App polls this while the user approves in the browser.
app.get('/connect/status/:id', async (req, res) => {
  const row = db.getConsent(req.params.id);
  if (!row) return res.status(404).json({ error: 'unknown consent' });
  try {
    const live = await setu.getConsentStatus(req.params.id);
    if (live.status && live.status !== row.status) db.updateConsentStatus(req.params.id, live.status);
    res.json({ status: live.status || row.status });
  } catch (e) {
    // Setu unreachable right now — fall back to our last known status
    // rather than failing the poll outright.
    res.json({ status: row.status });
  }
});

// Setu calls this on consent status changes and once FI data is ready.
// The exact webhook payload shape wasn't in the docs pulled during
// planning, so this reads leniently and logs the raw body — inspect that
// log against a real sandbox event and tighten the field lookups here.
app.post('/webhooks/setu', (req, res) => {
  const body = req.body || {};
  console.log('Setu webhook:', JSON.stringify(body));

  const consentId = body.consentId || body.consentHandle || body.id;
  if (consentId && body.status) db.updateConsentStatus(consentId, body.status);
  if (body.type === 'FI_DATA_READY' && body.fiData && consentId) {
    db.storeData(consentId, normalizeFiData(body.fiData));
  }
  res.sendStatus(200);
});

// 3. Once status is ACTIVE, app calls this to kick off a data session.
app.post('/connect/fetch/:id', async (req, res) => {
  const row = db.getConsent(req.params.id);
  if (!row) return res.status(404).json({ error: 'unknown consent' });
  if (row.status !== 'ACTIVE') return res.status(409).json({ error: `consent is ${row.status}, not ACTIVE` });
  try {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 180 * 86400000).toISOString();
    const session = await setu.createDataSession(req.params.id, { from, to });
    db.setSession(req.params.id, session.id);
    res.json({ sessionId: session.id, status: 'started' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// 4. App polls this until data is ready. Prefers data the webhook already
// delivered; falls back to asking Setu directly, so this still works even
// if the webhook isn't reachable yet (e.g. no tunnel set up during dev).
app.get('/connect/transactions/:id', async (req, res) => {
  const row = db.getConsent(req.params.id);
  if (!row) return res.status(404).json({ error: 'unknown consent' });
  if (row.data) return res.json({ ready: true, ...JSON.parse(row.data) });
  if (!row.session_id) return res.json({ ready: false });
  try {
    const session = await setu.getSession(row.session_id);
    if (!session.fiData) return res.json({ ready: false });
    const normalized = normalizeFiData(session.fiData);
    db.storeData(req.params.id, normalized);
    res.json({ ready: true, ...normalized });
  } catch (e) {
    res.json({ ready: false });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Pockets backend listening on :${port}`));
