# Pockets — React Native (Expo)

Divide one bank balance into named savings pockets. Nothing moves at the bank;
the pockets are bookkeeping on top of a balance you enter yourself.

Five sections: **Pockets**, **Activity** (transactions), **Owes**, **Loans**,
**Subs** — plus scheduled local notifications, which is why this exists as a
native app rather than a web page.

---

## Getting it running

You need Node 18+ and a phone with **Expo Go** installed (App Store / Play Store).

```bash
npx create-expo-app@latest pockets --template blank
cd pockets

npx expo install \
  expo-notifications expo-device expo-status-bar \
  @react-navigation/native @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  @react-native-async-storage/async-storage \
  @react-native-community/datetimepicker

# copy App.js, app.json and the whole src/ folder from this project over the
# generated ones, then:
npx expo start
```

Scan the QR code with your phone. Edits reload instantly.

`npx expo install` picks versions matching your Expo SDK, which is why
`package.json` here uses `*` — don't copy those pins.

## Notifications

Local scheduled notifications only. No server, no push tokens, no account.

- **Expo Go on Android** — work as-is.
- **Expo Go on iOS** — unreliable. Make a development build:
  ```bash
  npx expo install expo-dev-client
  npx expo run:ios      # needs Xcode
  ```
- Permission is requested once on first launch (`App.js` → `requestPermission`).

What gets scheduled, all at 9am local (`src/lib/notify.js`):

| Trigger | When |
|---|---|
| Subscription due | day before, and on the day |
| Debt due date | on the day |
| Pocket target date | a week before, and on the day |
| EMI loan | monthly, on the start date's day-of-month |

Every state change cancels all pending notifications and rebuilds them. Wasteful
but always correct — an undone payment can't leave a stale reminder behind.

## How the data model works

The important idea is that **Normal savings is never stored**. It is always
`balance − sum(goal pockets)`, computed in `src/lib/calc.js`. That single choice
means the pockets can never disagree with your balance.

```
balance          number, entered by you
pockets[]        { id, name, amount, target, due, color }
txs[]            { id, dir, party, amount, splits[], settle?, loanPay?, subPay? }
debts[]          { id, dir, party, amount, due }
loans[]          { id, dir, party, principal, rate, type, freq, months, start, payments[] }
subs[]           { id, name, amount, cycle, next, payments[] }
```

A transaction adjusts **both** the balance and the chosen pockets, so the
allocation bar stays truthful. `settle` / `loanPay` / `subPay` record what a
transaction was linked to, which is what makes undo able to restore a debt, remove
a loan payment, or roll a subscription's due date back.

Everything persists to `AsyncStorage` as one JSON blob. That is fine at this size.
If the transaction list grows into the thousands, move to `expo-sqlite`.

## Where the shared logic lives

Four flows move money — a transaction, adding to a pocket, deleting a pocket,
paying a debt/loan/subscription. They all use the same two components:

- `src/components/AllocateSheet.js` — pick up to 5 pockets, then split an amount
  across them, with a running total and a confirm button that stays disabled
  until it balances exactly.
- `src/components/PayFlow.js` — enter an amount, then hand off to AllocateSheet
  and write the transaction.

If you add a sixth flow, reuse these rather than copying them.

## Two things that were bugs, don't reintroduce them

**Shorthand must be exact.** `₹1,234` may never render as `₹1.23k`. `shorten()`
in `src/lib/money.js` falls back to the full figure whenever k/L/Cr would lose
precision. This matters because amount fields pre-fill from the same logic — a
lossy display once meant editing a pocket silently rounded its balance.

**Month arithmetic is clamped.** `addMonths` in `src/lib/dates.js` moves 31 Jan
to 28 Feb, not 3 March. Naive `setMonth` overflows and quietly shifts every
subsequent billing date.

## Worth building next

- **Pause a subscription** instead of only deleting it (an `active` flag,
  excluded from the to-do list and the monthly average).
- **Net out debts per person** — Ravi owing you ₹5k while you owe him ₹2k is
  currently two entries.
- **Export / import** — AsyncStorage does not survive an uninstall. The web
  version has a JSON backup; port it.
- **Custom fonts** via `expo-font` — `src/theme.js` has the hooks.
- **Shipping**: `eas build` for TestFlight or a Play internal track. A personal
  build sideloaded to your own phone needs no store review.
