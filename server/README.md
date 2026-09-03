# Pockets backend

## Status: dormant

Statement decryption used to live here (`/import/xlsx`) but now runs
entirely on-device — see `src/lib/xlsxStatement.js` in the app. Nothing
calls this backend for that anymore, and the endpoint/dependencies for it
have been removed.

What's left is only the Setu Account Aggregator scaffold: `setu.js`,
`normalize.js`, `db.js`, and the `/connect/*` routes, matched to the mobile
`ConnectBankScreen.js`. **This is currently unusable**: becoming an FIU
requires a GSTIN (a registered business), which blocks a personal,
no-business setup — a property of the Account Aggregator framework itself,
not specific to Setu. The code is left in place in case that changes (e.g.
a sole proprietorship gets registered later); `.env.example` documents what
it'd need. If you do revisit it:

1. Register at [bridge.setu.co](https://bridge.setu.co/v2), create an FIU
   (needs Company PAN + GSTIN) and an Account Aggregator Data product to
   get sandbox `client_id`/`client_secret`/`product_instance_id`.
2. `cp .env.example .env` and fill those in.
3. `npm install && npm start`.
4. `setu.js` has one unconfirmed detail flagged in a comment (the exact
   token-endpoint shape) — check it against Setu's Postman collection once
   you have real credentials.
