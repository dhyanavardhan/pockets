const Database = require('better-sqlite3');
const path = require('path');

// Single-tenant, file-based — this backend exists to let one Pockets user
// connect their own account, not to serve multiple users.
const db = new Database(path.join(__dirname, 'data.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'PENDING',
    session_id TEXT,
    data TEXT,
    created_at INTEGER NOT NULL
  )
`);

function insertConsent(id) {
  db.prepare('INSERT OR IGNORE INTO consents (id, status, created_at) VALUES (?, ?, ?)')
    .run(id, 'PENDING', Date.now());
}

function getConsent(id) {
  return db.prepare('SELECT * FROM consents WHERE id = ?').get(id);
}

function updateConsentStatus(id, status) {
  db.prepare('UPDATE consents SET status = ? WHERE id = ?').run(status, id);
}

function setSession(id, sessionId) {
  db.prepare('UPDATE consents SET session_id = ? WHERE id = ?').run(sessionId, id);
}

function storeData(id, data) {
  db.prepare('UPDATE consents SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
}

module.exports = { insertConsent, getConsent, updateConsentStatus, setSession, storeData };
