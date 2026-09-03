import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money, exact, alt } from '../lib/money';
import { fmtDate, daysTo } from '../lib/dates';
import { Sheet, Btn, Field, AmountField, DateField, Toggle, Empty, T } from '../components/ui';
import PayFlow from '../components/PayFlow';

export default function OwesScreen() {
  const st = useStore();
  const { S } = st;
  const [form, setForm] = useState(null);
  const [job, setJob] = useState(null);

  const mine = S.debts.filter(d => d.dir === 'in');    // owed to me
  const theirs = S.debts.filter(d => d.dir === 'out'); // I owe
  const sum = a => a.reduce((x, d) => x + d.amount, 0);

  const save = () => {
    const rec = { dir: form.dir, party: form.party.trim(), amount: form.amount, due: form.due };
    if (form.id) st.editDebt(form.id, rec); else st.addDebt(rec);
    setForm(null);
  };

  const row = d => {
    const late = d.due && daysTo(d.due) < 0;
    return (
      <View key={d.id} style={T.card}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.ink }}>{d.party}</Text>
          <Text style={[T.fig, { color: d.dir === 'in' ? C.pos : C.warn }]}>{money(d.amount)}</Text>
        </View>
        <Text style={{ fontSize: 12, marginTop: 4, color: late ? C.warn : C.muted }}>
          {d.due ? (late ? `Was due ${fmtDate(d.due)}` : `Due ${fmtDate(d.due)}`) : 'No date'}
          {alt(d.amount) ? ` · ${alt(d.amount)}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Btn label={d.dir === 'in' ? 'They paid me' : 'I paid them'} kind="dark"
               onPress={() => setJob({
                 dir: d.dir, party: d.party, suggested: d.amount, max: d.amount,
                 hint: d.dir === 'in'
                   ? `${d.party} owes you ${exact(d.amount)}. Paying less leaves the rest outstanding.`
                   : `You owe ${d.party} ${exact(d.amount)}. Paying less leaves the rest outstanding.`,
                 link: { kind: 'debt', id: d.id },
               })} />
          <Btn label="Edit" onPress={() => setForm({ ...d })} />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>Owed to you</Text>
              <Text style={[T.fig, { fontSize: 19, color: C.pos, marginTop: 4 }]}>{money(sum(mine))}</Text>
            </View>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>You owe</Text>
              <Text style={[T.fig, { fontSize: 19, color: C.warn, marginTop: 4 }]}>{money(sum(theirs))}</Text>
            </View>
          </View>

          {S.debts.length === 0 ? (
            <View style={{ marginTop: 14 }}>
              <Empty title="Nothing outstanding"
                body="Neither side counts as part of your bank balance until it actually moves. Settling one records a transaction." />
            </View>
          ) : (<>
            {mine.length > 0 && <Text style={T.group}>Owed to you</Text>}
            {mine.map(row)}
            {theirs.length > 0 && <Text style={T.group}>You owe</Text>}
            {theirs.map(row)}
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
        onPress={() => setForm({ id: null, dir: 'in', party: '', amount: 0, due: null })}
      >
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 }}>+</Text>
      </Pressable>

      <Sheet visible={!!form} onClose={() => setForm(null)}>
        {form && (<>
          <Text style={T.h3}>{form.id ? 'Edit this entry' : 'Record money owed'}</Text>
          <Text style={T.hint}>This sits outside your bank balance. When it is paid, settling it records a transaction against your pockets.</Text>
          <Toggle value={form.dir} onChange={v => setForm({ ...form, dir: v })}
                  options={[{ v: 'in', l: 'Owed to me' }, { v: 'out', l: 'I owe' }]} />
          <Text style={T.label}>{form.dir === 'in' ? 'Who owes you' : 'Who you owe'}</Text>
          <Field value={form.party} onChangeText={v => setForm({ ...form, party: v })}
                 placeholder={form.dir === 'in' ? 'Ravi' : 'Sister'} maxLength={40} />
          <Text style={T.label}>Amount</Text>
          <AmountField value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="5" />
          <Text style={T.label}>Due by — optional</Text>
          <DateField value={form.due} onChange={v => setForm({ ...form, due: v })} allowClear />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
            <Btn label="Cancel" onPress={() => setForm(null)} />
            <Btn label={form.id ? 'Save changes' : 'Record it'} kind="dark"
                 disabled={!form.party.trim() || !(form.amount > 0)} onPress={save} />
          </View>
          {form.id && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <Btn label="Remove without settling" kind="danger"
                   onPress={() => { st.removeDebt(form.id); setForm(null); }} />
            </View>
          )}
        </>)}
      </Sheet>

      <PayFlow job={job} onClose={() => setJob(null)} />
    </View>
  );
}
