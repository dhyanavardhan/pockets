import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HUES } from './theme';
import { normal, allTargets } from './lib/calc';
import { shiftCycle } from './lib/dates';
import { rescheduleAll } from './lib/notify';
import { isDuplicateTx } from './lib/statement';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';



const KEY = 'pockets-state-v1';
const HAS_PIN = "has_pin";  // used by the lock screen to know if it should show up
const PIN = "user_pin";  // used by the lock screen to verify the pin

async function hashPin(pin){
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

async function setUserPin(pin){
  const hashed = await hashPin(pin);
  await SecureStore.setItemAsync(PIN, hashed);
  await SecureStore.setItemAsync(HAS_PIN, "true");
}

async function hasSavedPin(){
  const hasPin = await SecureStore.getItemAsync(HAS_PIN);
  return hasPin === "true";
}

async function verifyPin(pin){
  const hashed = await hashPin(pin);
  const savedHashed = await SecureStore.getItemAsync(PIN);
  console.log('Input hash:', hashed);
  console.log('Saved hash:', savedHashed);
  console.log('Match:', hashed === savedHashed);
  return hashed === savedHashed;
}

async function setUpPin(pin){
  await setUserPin(pin);
  return true;
}

async function loginWithPin(pin){
  const isValid = await verifyPin(pin);
  return isValid;
}

const STATEMENT_PW = 'statement_pw'; // password protecting bank statement exports — same one every time

async function saveStatementPassword(pw) {
  await SecureStore.setItemAsync(STATEMENT_PW, pw);
}

async function getStatementPassword() {
  return await SecureStore.getItemAsync(STATEMENT_PW);
}

export { setUpPin, loginWithPin, hasSavedPin, saveStatementPassword, getStatementPassword };



export const EMPTY = {
  balance: 0, balanceAt: null, FinanceScore: null,
  pockets: [], txs: [], debts: [], loans: [], subs: [],
};


const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [S, setS] = useState(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setS({ ...EMPTY, ...JSON.parse(raw) });
      } catch (e) { console.warn('load failed', e); }
      setReady(true);
    })();
  }, []);

  // Persist and re-plan notifications on every change. Rescheduling everything
  // is wasteful but always correct — far better than tracking deltas.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(e => console.warn('save failed', e));
    rescheduleAll(S).catch(e => console.warn('notify failed', e));
  }, [S, ready]);

  const update = useCallback(fn => setS(prev => fn(structuredClone(prev))), []);

  const api = {
    S, ready, update, setS,

    // ---- balance ----
    setBalance: v => update(s => { s.balance = v; s.balanceAt = Date.now(); return s; }),

    // ---- pockets ----
    addPocket: p => update(s => {
      s.pockets.push({
        id: 'p' + Date.now(), amount: 0, target: 0, due: null,
        color: HUES[s.pockets.length % HUES.length], ...p,
      });
      return s;
    }),
    editPocket: (id, patch) => update(s => {
      Object.assign(s.pockets.find(x => x.id === id), patch); return s;
    }),

    // Deleting distributes the balance across chosen pockets; 'normal' absorbs
    // its share implicitly because it is derived.
    deletePocket: (id, splits) => update(s => {
      splits.forEach(({ id: to, amount }) => {
        if (to !== 'normal') { const q = s.pockets.find(x => x.id === to); if (q) q.amount += amount; }
      });
      s.pockets = s.pockets.filter(x => x.id !== id);
      return s;
    }),

    // Move money between pockets. Sources may include 'normal'.
    allocate: (destId, splits) => update(s => {
      let total = 0;
      splits.forEach(({ id: from, amount }) => {
        total += amount;
        if (from !== 'normal') s.pockets.find(x => x.id === from).amount -= amount;
      });
      s.pockets.find(x => x.id === destId).amount += total;
      return s;
    }),

    takeOut: (id, amount) => update(s => {
      s.pockets.find(x => x.id === id).amount -= amount; return s;
    }),

    // ---- transactions ----
    // dir 'out' = money left the account. link ties it back to a debt, loan or
    // subscription so undo can restore that record too.
    addTx: ({ dir, party, amount, splits, link, txnId, description }) => update(s => {
      const sign = dir === 'out' ? -1 : 1;
      s.balance += sign * amount;
      s.balanceAt = Date.now();
      splits.forEach(sp => {
        if (sp.id !== 'normal') {
          const p = s.pockets.find(x => x.id === sp.id);
          if (p) p.amount += sign * sp.amount;
        }
      });
      const tx = { id: 't' + Date.now(), dir, party, amount, at: Date.now(), splits,
                   txnId: txnId || null, description: description || '', source: 'manual' };

      if (link?.kind === 'debt') {
        const d = s.debts.find(x => x.id === link.id);
        if (d) {
          tx.settle = { debtId: d.id, dir: d.dir, party: d.party, due: d.due };
          d.amount -= amount;
          if (d.amount <= 0) s.debts = s.debts.filter(x => x.id !== d.id);
        }
      }
      if (link?.kind === 'loan') {
        const l = s.loans.find(x => x.id === link.id);
        if (l) {
          const payId = 'pay' + Date.now();
          (l.payments = l.payments || []).push({ id: payId, amount, at: Date.now() });
          tx.loanPay = { loanId: l.id, payId };
        }
      }
      if (link?.kind === 'sub') {
        const sub = s.subs.find(x => x.id === link.id);
        if (sub) {
          const payId = 'sp' + Date.now();
          const prevDue = sub.next;
          (sub.payments = sub.payments || []).push({ id: payId, amount, at: Date.now() });
          sub.next = shiftCycle(sub.next, sub.cycle, 1);
          tx.subPay = { subId: sub.id, payId, prevDue };
        }
      }
      s.txs.push(tx);
      return s;
    }),

    undoTx: id => update(s => {
      const t = s.txs.find(x => x.id === id);
      if (!t) return s;
      const sign = t.dir === 'out' ? 1 : -1;
      s.balance += sign * t.amount;
      s.balanceAt = Date.now();
      t.splits.forEach(sp => {
        if (sp.id !== 'normal') {
          const p = s.pockets.find(x => x.id === sp.id);
          if (p) p.amount += sign * sp.amount;
        }
      });
      if (t.subPay) {
        const sub = s.subs.find(x => x.id === t.subPay.subId);
        if (sub) {
          sub.payments = (sub.payments || []).filter(p => p.id !== t.subPay.payId);
          sub.next = t.subPay.prevDue;
        }
      }
      if (t.loanPay) {
        const l = s.loans.find(x => x.id === t.loanPay.loanId);
        if (l) l.payments = (l.payments || []).filter(p => p.id !== t.loanPay.payId);
      }
      if (t.settle) {
        const d = s.debts.find(x => x.id === t.settle.debtId);
        if (d) d.amount += t.amount;
        else s.debts.push({ id: t.settle.debtId, dir: t.settle.dir, party: t.settle.party,
                            amount: t.amount, due: t.settle.due, at: Date.now() });
      }
      s.txs = s.txs.filter(x => x.id !== id);
      return s;
    }),

    // Transactions added by hand can be edited freely. Ones that came from a
    // bank statement, or that settled a debt/loan/subscription, are locked
    // to everything but the description — the amount/party/date there is
    // either the bank's record of what happened, or already reflected in a
    // linked record, and editing either would make the ledger disagree with
    // its source. Changing amount/splits works by reversing this tx's old
    // effect and re-applying the edited one, same math as undoTx + addTx.
    editTx: (id, patch) => update(s => {
      const t = s.txs.find(x => x.id === id);
      if (!t) return s;

      const locked = t.source === 'bank' || !!(t.settle || t.loanPay || t.subPay);
      if (locked) {
        if (patch.description !== undefined) t.description = patch.description;
        return s;
      }

      const oldSign = t.dir === 'out' ? 1 : -1;
      s.balance += oldSign * t.amount;
      t.splits.forEach(sp => {
        if (sp.id !== 'normal') {
          const p = s.pockets.find(x => x.id === sp.id);
          if (p) p.amount += oldSign * sp.amount;
        }
      });

      const dir = patch.dir ?? t.dir;
      const amount = patch.amount ?? t.amount;
      const splits = patch.splits ?? t.splits;
      const newSign = dir === 'out' ? -1 : 1;
      s.balance += newSign * amount;
      splits.forEach(sp => {
        if (sp.id !== 'normal') {
          const p = s.pockets.find(x => x.id === sp.id);
          if (p) p.amount += newSign * sp.amount;
        }
      });
      s.balanceAt = Date.now();

      t.dir = dir; t.amount = amount; t.splits = splits;
      if (patch.party !== undefined) t.party = patch.party;
      if (patch.txnId !== undefined) t.txnId = patch.txnId;
      if (patch.description !== undefined) t.description = patch.description;
      return s;
    }),

    // Bulk-import bank rows in one state update rather than N addTx calls,
    // which would otherwise trigger N separate AsyncStorage writes and
    // notification reschedules. Every row's full amount defaults into
    // 'normal' savings — the same "normal absorbs it" default the rest of
    // the app uses — and rows matching an existing tx (by txnId, or by
    // date+amount+description when neither side has a txnId) are skipped.
    importTxs: rows => update(s => {
      rows.forEach(r => {
        if (isDuplicateTx(s.txs, r)) return;

        const sign = r.dir === 'out' ? -1 : 1;
        s.balance += sign * r.amount;
        s.balanceAt = Date.now();
        s.txs.push({
          id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
          dir: r.dir, party: r.party, amount: r.amount,
          at: new Date(r.date + 'T12:00:00').getTime(),
          splits: [{ id: 'normal', name: 'Normal savings', color: '#8A929C', amount: r.amount }],
          txnId: r.txnId || null, description: r.description || '', source: 'bank',
        });
      });
      return s;
    }),

    // ---- debts ----
    addDebt: d => update(s => { s.debts.push({ id:'d'+Date.now(), at: Date.now(), ...d }); return s; }),
    editDebt: (id, patch) => update(s => { Object.assign(s.debts.find(x=>x.id===id), patch); return s; }),
    removeDebt: id => update(s => { s.debts = s.debts.filter(x => x.id !== id); return s; }),

    // ---- loans ----
    addLoan: l => update(s => { s.loans.push({ id:'l'+Date.now(), payments: [], ...l }); return s; }),
    editLoan: (id, patch) => update(s => { Object.assign(s.loans.find(x=>x.id===id), patch); return s; }),
    removeLoan: id => update(s => { s.loans = s.loans.filter(x => x.id !== id); return s; }),

    // ---- subscriptions ----
    addSub: x => update(s => { s.subs.push({ id:'s'+Date.now(), payments: [], ...x }); return s; }),
    editSub: (id, patch) => update(s => { Object.assign(s.subs.find(x=>x.id===id), patch); return s; }),
    removeSub: id => update(s => { s.subs = s.subs.filter(x => x.id !== id); return s; }),

    // derived
    normal: () => normal(S),
    targets: () => allTargets(S),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
