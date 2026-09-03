# Project diary

Running log of what was done on Pockets and why, in order. Updated as work
happens — this is a history, not a design doc (see `README.md` and code
comments for how things currently work).

---

## 2026-08-21 — Getting oriented

- Read through the whole app (App.js, HomePage.js, `src/store.js`, all
  screens/components/lib files) to understand the existing architecture:
  one JSON blob in AsyncStorage, "Normal savings" derived rather than
  stored, `AllocateSheet` + `PayFlow` as the shared money-movement engine.
  Explained it end to end, then traced one flow in detail (paying a
  subscription) through `PayFlow → AllocateSheet → store.addTx →
  notify.rescheduleAll → undoTx`.

## 2026-08-22 — Bank connection: scoping and a false start

- Asked to connect the app to a real bank account: track real transactions
  (receiver name, date/time, transaction ID, description) and stop typing
  the balance in by hand.
- First, unblocked concrete data-model work: converted balance/pocket/
  transaction amounts to proper 2-decimal floats (`joinAmount`, `shorten`,
  `exact` in `src/lib/money.js` were silently rounding to whole rupees), and
  added `txnId`/`description` fields to `tx` records.
- For the actual bank connection, laid out the real options for India
  (manual statement import vs. SMS parsing vs. the RBI's Account Aggregator
  framework) and asked which to build. Chose: build **both** — statement
  upload, and a real Account Aggregator integration via **Setu** (picked
  for its self-serve sandbox), including a backend from scratch since AA
  requires one (consent creation, webhook, encrypted-data fetch — can't be
  done from a static client app).
- Researched Setu's actual API (base URLs, consent/session endpoints,
  webhook shape) via their docs rather than guessing.
- Used Plan Mode to design the work, got it approved, then built:
  - **Phase A** (statement import, client-only): `src/lib/statement.js`
    (CSV parser), `ImportReviewScreen.js` (shared review/dedup screen),
    `store.importTxs()` (batched import).
  - **Phase B** (backend, `server/`): Express + SQLite service proxying
    Setu's FIU Gateway — `/connect/start`, `/connect/status/:id`,
    `/webhooks/setu`, `/connect/fetch/:id`, `/connect/transactions/:id`.
  - **Phase C** (mobile): `ConnectBankScreen.js` driving the consent →
    data flow against that backend.
- Hit a real wall: the Setu Bridge console requires **Company PAN + GSTIN**
  to register an FIU — a registered business, not just an individual. This
  turned out to be structural to the Account Aggregator framework itself
  (being an FIU is a regulated role), not a Setu-specific quirk. Confirmed
  the user has no business PAN, so **the AA path is dead** for this
  project. Removed the "Connect via Account Aggregator" entry point from
  `AccountScreen`; left the dormant AA backend code in place in case a
  business registration happens later (`server/README.md` explains why).
- New requirement surfaced: the user's real bank statements are
  password-protected **.xlsx** files, not plain CSV (confirmed via
  targeted questions — ruled out password-protected ZIP and PDF first).
  Built server-side decryption: `officecrypto-tool` (decrypt) + `exceljs`
  (parse) + `multer` (upload) → `POST /import/xlsx`. Deliberately avoided
  the `xlsx` npm package for this (known unpatched prototype-pollution/
  ReDoS CVEs; SheetJS's real fixes aren't published to npm) and bumped
  `multer` to 2.x for the same reason. Verified the whole pipeline with a
  real round-trip test: built an xlsx, encrypted it, confirmed a wrong
  password throws and the right one decrypts and parses correctly.
- Wired the password (saved once via `expo-secure-store`, same trust model
  as the app's PIN) and file-picker flow into `AccountScreen`.

## 2026-08-23 — UI restructuring: chooser, edit, info

- Moved statement upload out of the Account tab entirely and into the
  transaction-adding flow: the "+" button on Activity now opens a chooser
  — **"Add manually"** vs **"From a bank statement"** — and the upload UI
  became its own component, `StatementImportSheet.js`.
- Added transaction editing (`store.editTx`), with a deliberate asymmetry:
  manually-added, unlinked transactions are fully editable (direction,
  party, amount — which re-opens `AllocateSheet` to re-pick pockets —
  transaction ID, description); anything from a bank statement, or that
  settled a debt/loan/subscription, is locked to editing only the
  description, so the ledger can't be made to disagree with its source of
  truth. Verified the reverse-old/apply-new balance math in isolation
  before trusting it.
- Iterated on an info-icon request three times based on feedback:
  1. First pass put a collapsible info block only inside the Edit sheet.
  2. Moved/added the same icon directly onto each row in the Activity list
     (top-right corner, as asked).
  3. Consolidated both into one shared `TxInfoPanel` component showing
     *every* field unconditionally (direction, exact amount, added
     date+time, transaction ID or "None", description or "None", source,
     exactly what it's linked to, full split breakdown) — the two icons
     had started out showing different curated subsets, which was the bug
     being reported.
  Rewrote the Edit sheet itself around the same principle: one form, every
  field always visible, non-editable ones rendered as read-only text
  instead of being hidden.
- Moved the statement password out of the upload flow and into
  `AccountScreen` (profile section) as a proper settings entry — status-
  only display ("A password is saved" / not), never the value itself,
  editable any time without going through "add transaction" first.
  (Caught and fixed a real mistake here: a first edit pass left broken
  JSX — `<T.err>` used as if it were a component — from careless removal
  of the old inline password UI.)

## 2026-08-25 — Going fully offline

- Asked whether the `.xlsx` decryption could happen entirely on-device, no
  backend at all — the user's stated reason: most Indian banks
  password-protect statements, and sending that file to any backend is a
  privacy cost worth removing if avoidable.
- First answer was too hedgy — went and actually tested things instead of
  reasoning from docs alone:
  - Generated a real encrypted `.xlsx` fixture and tried SheetJS's own
    built-in `{password}` decrypt option (both the stale npm `xlsx`
    package and the current officially-patched CDN build). **Both failed**
    on the correct password with a generic error — concrete evidence its
    decrypt support doesn't actually work for this file, not just
    "docs are unclear."
  - Inspected `officecrypto-tool`'s source directly and confirmed its
    Agile-Encryption decrypt path does `require('crypto')` — Node's
    built-in module, which does not exist in React Native's Hermes engine.
    This is the actual, specific blocker — not the password, not general
    "insecurity," but a missing bridge from the JS engine to real crypto.
- Explained *why* apps like Google Sheets don't hit this: they're native
  apps calling the OS's crypto directly; the gap is specific to a
  JS-only engine having no such bridge unless one is added.
- Identified `react-native-quick-crypto` as that bridge — a native module
  exposing the phone's real AES/SHA engine through the same API shape as
  Node's `crypto`, explicitly designed as a drop-in `require('crypto')`
  replacement via Metro aliasing. Verified — by reading source, not
  assuming — that it implements the *exact* surface `officecrypto-tool`
  needs (`createHash`, `createHmac`, `createCipheriv`/`createDecipheriv`,
  `getHashes`), and separately confirmed `officecrypto-tool`'s other two
  dependencies (`cfb`, `xml2js`) don't touch Node-only built-ins on their
  real code path (a red herring `xml2js.bc.js` file does, but it's never
  actually required).
- This means no hand-rolled cryptography is needed after all — the same
  already-tested `officecrypto-tool` code can run on-device essentially
  unmodified, just pointed at native crypto instead of Node's.
- Flagged the real cost honestly: this requires a custom development
  build (`expo prebuild` + `expo run:android`/`run:ios`, or an EAS dev
  build) since Expo Go can't load arbitrary native modules — a one-time/
  occasional setup cost, not a change to the day-to-day edit-save-reload
  loop. User accepted this trade-off explicitly, with the one condition
  that end users see no reliability issues.
- Installed into the main app: `react-native-quick-crypto`,
  `react-native-nitro-modules`, `react-native-quick-base64` (peers),
  `officecrypto-tool`, and SheetJS's patched build (`xlsx` pinned to
  `cdn.sheetjs.com`, not the vulnerable npm registry version — same reason
  as the backend). Added `metro.config.js` aliasing `crypto` →
  `react-native-quick-crypto`.
- Wrote `src/lib/xlsxStatement.js` (on-device decrypt+parse, same shape as
  the old server version) and wired it into `StatementImportSheet.js` in
  place of the `/import/xlsx` backend call. Added `install()` from
  `react-native-quick-crypto` to `index.js` (sets `global.crypto` and
  `global.Buffer` before anything needs them).
- Verified the actual decrypt+parse *logic* by transpiling and running
  `src/lib/xlsxStatement.js` directly in Node against the same encrypted
  fixture used earlier: wrong password correctly throws, correct password
  decrypts and parses accurately. This validates everything except the one
  piece that genuinely can't be tested outside a real device — whether
  Metro's `crypto` → `react-native-quick-crypto` alias and the native JSI
  bridge behave identically to Node's `crypto` at runtime. That needs an
  actual `expo run:android`/`run:ios` build to confirm.
- Ran `npx expo prebuild` to generate the native `android`/`ios` projects
  (required for the crypto native module to link) — hit and fixed one
  unrelated pre-existing bug it surfaced: `app.json` referenced
  `pockets_icon.png`, but the real file on disk is `pockets_icon.jpg`.
  Confirmed the native module was picked up by iOS autolinking
  (`ios/Podfile`); Android's modern autolinking resolves at build time
  rather than listing packages statically, so its absence from
  `settings.gradle` is expected, not a problem.
- Cleaned up the now-dead backend code: removed the `/import/xlsx` route,
  deleted `server/xlsxStatement.js`, and dropped `multer`/`exceljs`/
  `officecrypto-tool` from `server/package.json` (96 packages pruned, 0
  vulnerabilities). The backend's only remaining job is the dormant,
  currently-unusable Account Aggregator scaffold — `server/README.md`
  rewritten to say so plainly.
- **Net result**: statement import (CSV or password-protected XLSX) now
  works fully offline — no backend, no network call, password and file
  never leave the device. The backend still exists only for the dormant AA
  path, blocked on the GSTIN requirement.

## 2026-08-26 — Distributing an import into pockets

- Asked for the import flow to total up the imported batch and offer to
  distribute that total into pockets, rather than everything landing in
  Normal savings with no further choice.
- Reworked `ImportReviewScreen.js` into three steps: the existing
  review/checklist, then (only when the selected rows net to a positive
  inflow) a "Distribute ₹X?" choice between leaving it in Normal or
  opening `AllocateSheet` — the same pick-pockets-and-split component used
  everywhere else in the app, reused as-is rather than building a new one.
  The chosen split is applied by calling the existing `store.allocate`
  once per destination pocket (money conceptually moves out of Normal,
  where the import already put it, into each pocket) — no new store
  action needed, no per-row splitting complexity.
- Caught a real mistake before it shipped: the first pass tried to
  short-circuit "no positive total, skip straight to import" by setting a
  `'review-done'` step and calling the import/allocate side effects
  directly in the render body — a React anti-pattern (mutating state
  during render). Fixed by moving that decision into `confirmReview`, the
  actual button-press handler, where calling `store` actions is correct.
- Asked how to run the app now that Expo Go can't load the custom native
  module. Walked through the day-to-day implications (one-time dev-client
  build, unchanged live-reload loop afterward), compared EAS cloud builds
  vs. local builds, and — once the user said native modules would keep
  changing frequently, favoring local's instant rebuilds over EAS's queue
  time — worked through getting a real local Android build running on this
  same machine:
  - Set up Android's Wireless Debugging (pair + connect) so no USB cable is
    needed, without any cost to the live-reload speed (that was always
    WiFi-based already, identical to Expo Go).
  - `expo run:android` initially failed with "SDK location not found" —
    `ANDROID_HOME` was set but pointed at a directory that never actually
    existed. Installed a real Android SDK (command-line tools, platforms
    34/35/36, matching build-tools, NDK) into that same path, and added
    `android/local.properties` as a second, more robust way for Gradle to
    find it.
  - Next failure: Gradle couldn't find a Java *compiler* — only
    `openjdk-21-jre` (runtime, no `javac`) was installed, while
    `openjdk-17-jdk` (a complete JDK) already was. Pointed `JAVA_HOME` at
    the working JDK 17 install instead of downloading another one.
    Along the way, found and fixed a duplicate/wrong `ANDROID_HOME` line in
    `.bashrc` (an artifact of pasting earlier instructions in) that pointed
    at a path that didn't exist.
  - Next: an install failure (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) from a
    previously-installed build signed with a different key — fixed with
    `adb uninstall com.yourname.pockets`.
  - Next: `adb: more than one device` (the phone was visible both via the
    earlier manual `adb connect` and via automatic mDNS discovery — same
    phone, two entries) plus a `node`-not-found Gradle failure from a
    *stale Gradle daemon* holding an environment from before the JDK/PATH
    fixes. Disconnected the duplicate device entry and ran `gradlew --stop`
    to force a fresh daemon.
  - Finally, a real bundling failure surfaced a gap the earlier source
    review hadn't caught: `xml2js`'s `parser.js` (not the top-level
    `xml2js.js` I'd checked) does `require('timers')`, which doesn't exist
    in React Native. Re-scanned the *entire* officecrypto-tool dependency
    chain this time (not just the one file that broke) and found one more
    latent issue before it could surface separately: `cfb`'s lazy
    `require('fs')`, unreachable at runtime (only used for file-path
    input, and this app only ever hands it in-memory buffers) but still
    something Metro's bundler resolves statically up front, so it would
    have broken the build too. Added `src/lib/shims/timers.js` (RN already
    provides `setImmediate` etc. as globals) and `src/lib/shims/fs.js` (an
    empty stub — the real Node fs is never actually called) and extended
    `metro.config.js`'s resolver to route both there, alongside the
    existing `crypto` → `react-native-quick-crypto` alias. Confirmed
    `events` needed no such fix — a real `events` npm package was already
    present in the tree (pulled in transitively by
    `react-native-quick-crypto`), so Metro resolves it normally.
  - App installed and launched, but crashed with `ReferenceError: property
    'Buffer' doesn't exist`. Root cause: `install()` in `index.js` was a
    plain statement placed after `import App from './App'` — but ES
    module imports always fully evaluate, in the order written, before any
    plain statement in the same file runs, regardless of textual position
    relative to each other. So `App`'s whole import graph (pulling in
    officecrypto-tool → cfb/crypto-js) loaded — and something in it
    touched `Buffer` just from being loaded, not even called — before
    `install()` ever ran. Fixed by moving `install()` into its own leaf
    module (`src/lib/setupCrypto.js`, importing nothing of ours) and
    making it the first import in `index.js`, guaranteeing it completes
    before anything else does.
