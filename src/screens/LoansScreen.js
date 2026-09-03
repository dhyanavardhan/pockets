import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money, exact } from '../lib/money';
import { fmtDate, elapsedLabel } from '../lib/dates';
import { loanMath, typeLabel } from '../lib/calc';
import { Sheet, Btn, Field, AmountField, DateField, Toggle, Empty, T } from '../components/ui';
import PayFlow from '../components/PayFlow';

const TYPES = [
  { v: 'simple', l: 'Simple interest' },
  { v: 'compound', l: 'Compound interest' },
  { v: 'emi', l: 'Fixed monthly EMI' },
];

export default function LoansScreen() {
  const st = useStore();
  const { S } = st;
  const [form, setForm] = useState(null);
  const [job, setJob] = useState(null);

  const bor = S.loans.filter(l => l.dir === 'borrowed');
  const lent = S.loans.filter(l => l.dir === 'lent');
  const sum = a => a.reduce((x, l) => x + loanMath(l).left, 0);

  const save = () => {
    const rec = {
      dir: form.dir, party: form.party.trim(), principal: form.principal,
      rate: parseFloat(form.rate), type: form.type, freq: +form.freq || 12,
      months: form.type === 'emi' ? parseInt(form.months, 10) : 0, start: form.start,
    };
    if (form.id) st.editLoan(form.id, rec); else st.addLoan(rec);
    setForm(null);
  };

  const ok = form && form.party.trim() && form.principal > 0
    && !isNaN(parseFloat(form.rate)) && form.start
    && (form.type !== 'emi' || parseInt(form.months, 10) > 0);

  const card = l => {
    const m = loanMath(l), done = m.left <= 0;
    const pct = m.total > 0 ? Math.min(100, (m.paid / m.total) * 100) : 0;
    const col = l.dir === 'borrowed' ? C.warn : C.pos;
    const Row = ({ k, v, big }) => (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
                     borderBottomWidth: 1, borderBottomColor: '#EFF1F3' }}>
        <Text style={{ fontSize: 13, color: C.ink }}>{k}</Text>
        <Text style={[T.fig, { fontSize: big ? 14.5 : 13 }]}>{v}</Text>
      </View>
    );
    return (
      <View key={l.id} style={T.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: col }} />
          <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: C.ink }}>{l.party}</Text>
          <Pressable onPress={() => setForm({ ...l, rate: String(l.rate), months: String(l.months || '') })}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted }}>Edit</Text>
          </Pressable>
        </View>
        <Text style={[T.note, { marginTop: 5 }]}>
          {typeLabel(l)} · {l.rate}% a year · started {fmtDate(l.start)} ({elapsedLabel(m.days)} ago)
        </Text>
        <View style={{ marginTop: 12 }}>
          <Row k="Principal" v={money(l.principal)} />
          <Row k={`Interest ${l.type === 'emi' ? 'over the full term' : 'so far'}`} v={money(Math.round(m.interest))} />
          {l.type === 'emi' && <Row k="Monthly EMI" v={money(Math.round(m.emi))} />}
          <Row k="Paid" v={money(m.paid)} />
          <Row big k={l.dir === 'borrowed' ? 'You still owe' : 'Still to come back'} v={money(Math.round(m.left))} />
        </View>
        <View style={{ height: 5, backgroundColor: '#EDEFF2', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
          <View style={{ height: 5, width: `${pct}%`, backgroundColor: col, borderRadius: 3 }} />
        </View>
        <Text style={[T.note, { marginTop: 6 }]}>
          {done ? 'Fully settled' : `${Math.round(pct)}% paid off`}
        </Text>
        {!done && (
          <View style={{ marginTop: 12 }}>
            <Btn label={l.dir === 'borrowed' ? 'Record a payment' : 'Record money received'} kind="dark"
                 onPress={() => setJob({
                   dir: l.dir === 'borrowed' ? 'out' : 'in', party: l.party,
                   suggested: l.type === 'emi' ? Math.min(Math.round(m.emi), Math.round(m.left)) : 0,
                   max: Math.round(m.left),
                   hint: `${exact(Math.round(m.left))} still outstanding.`,
                   link: { kind: 'loan', id: l.id },
                 })} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>You still owe</Text>
              <Text style={[T.fig, { fontSize: 19, color: C.warn, marginTop: 4 }]}>{money(Math.round(sum(bor)))}</Text>
            </View>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>Owed back to you</Text>
              <Text style={[T.fig, { fontSize: 19, color: C.pos, marginTop: 4 }]}>{money(Math.round(sum(lent)))}</Text>
            </View>
          </View>
          {S.loans.length === 0 ? (
            <View style={{ marginTop: 14 }}>
              <Empty title="No loans tracked"
                body="Interest is worked out from the start date — simple, compound, or a fixed EMI." />
            </View>
          ) : (<>
            {bor.length > 0 && <Text style={T.group}>Money you borrowed</Text>}
            {bor.map(card)}
            {lent.length > 0 && <Text style={T.group}>Money you lent</Text>}
            {lent.map(card)}
          </>)}
        </View>
      </ScrollView>

      <Pressable
        style={{
          position: 'absolute',
          bottom: 18,
          right: 18,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.ink,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 5,
        }}
        onPress={() => setForm({ id: null, dir: 'borrowed', party: '', principal: 0,
          rate: '', type: 'simple', freq: 12, months: '',
          start: new Date().toISOString().slice(0, 10) })}
      >
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 }}>+</Text>
      </Pressable>

      <Sheet visible={!!form} onClose={() => setForm(null)}>
        {form && (<>
          <Text style={T.h3}>{form.id ? 'Edit loan' : 'Add a loan'}</Text>
          <Text style={T.hint}>Interest is worked out from the start date, so the figures move on their own as time passes.</Text>
          <Toggle value={form.dir} onChange={v => setForm({ ...form, dir: v })}
                  options={[{ v: 'borrowed', l: 'I borrowed' }, { v: 'lent', l: 'I lent' }]} />
          <Text style={T.label}>{form.dir === 'borrowed' ? 'Lender' : 'Borrower'}</Text>
          <Field value={form.party} onChangeText={v => setForm({ ...form, party: v })}
                 placeholder={form.dir === 'borrowed' ? 'HDFC Bank' : 'Cousin'} maxLength={40} />
          <Text style={T.label}>Principal</Text>
          <AmountField value={form.principal} onChange={v => setForm({ ...form, principal: v })} placeholder="5" />
          <Text style={T.label}>Interest rate — % a year</Text>
          <Field value={form.rate} onChangeText={v => setForm({ ...form, rate: v })}
                 keyboardType="decimal-pad" placeholder="8.5" />
          <Text style={T.label}>How interest is charged</Text>
          <View style={{ gap: 8 }}>
            {TYPES.map(t => (
              <Pressable key={t.v} onPress={() => setForm({ ...form, type: t.v })}
                style={{ padding: 12, borderWidth: 1, borderRadius: 9,
                         borderColor: form.type === t.v ? C.ink : C.line,
                         backgroundColor: form.type === t.v ? '#F7F8FA' : C.card }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{t.l}</Text>
              </Pressable>
            ))}
          </View>
          {form.type === 'compound' && (<>
            <Text style={T.label}>Compounded</Text>
            <Toggle value={form.freq} onChange={v => setForm({ ...form, freq: v })}
                    options={[{ v: 12, l: 'Monthly' }, { v: 4, l: 'Quarterly' }, { v: 1, l: 'Yearly' }]} />
          </>)}
          {form.type === 'emi' && (<>
            <Text style={T.label}>Tenure — months</Text>
            <Field value={form.months} onChangeText={v => setForm({ ...form, months: v })}
                   keyboardType="number-pad" placeholder="60" />
          </>)}
          <Text style={T.label}>Start date</Text>
          <DateField value={form.start} onChange={v => setForm({ ...form, start: v })} />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
            <Btn label="Cancel" onPress={() => setForm(null)} />
            <Btn label={form.id ? 'Save changes' : 'Add loan'} kind="dark" disabled={!ok} onPress={save} />
          </View>
          {form.id && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <Btn label="Delete this loan" kind="danger"
                   onPress={() => { st.removeLoan(form.id); setForm(null); }} />
            </View>
          )}
        </>)}
      </Sheet>

      <PayFlow job={job} onClose={() => setJob(null)} />
    </View>
  );
}
