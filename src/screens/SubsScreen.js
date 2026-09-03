import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money } from '../lib/money';
import { fmtDate, daysTo } from '../lib/dates';
import { CYC, perMonth, dueThisMonth, paidThisMonth } from '../lib/calc';
import { Sheet, Btn, Field, AmountField, DateField, Empty, T } from '../components/ui';
import PayFlow from '../components/PayFlow';

export default function SubsScreen() {
  const st = useStore();
  const { S } = st;
  const [form, setForm] = useState(null);
  const [job, setJob] = useState(null);

  const due = S.subs.filter(dueThisMonth);
  const paid = S.subs.filter(s => !dueThisMonth(s) && paidThisMonth(s).length);
  const dueTotal = due.reduce((a, s) => a + s.amount, 0);
  const monthly = S.subs.reduce((a, s) => a + perMonth(s), 0);

  const save = () => {
    const rec = { name: form.name.trim(), amount: form.amount, cycle: form.cycle, next: form.next };
    if (form.id) st.editSub(form.id, rec); else st.addSub(rec);
    setForm(null);
  };

  const pay = s => setJob({
    dir: 'out', party: s.name, suggested: s.amount,
    hint: `${CYC[s.cycle]}, due ${fmtDate(s.next)}. Once paid, the due date rolls forward.`,
    link: { kind: 'sub', id: s.id },
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>Left this month</Text>
              <Text style={[T.fig, { fontSize: 19, color: C.warn, marginTop: 4 }]}>{money(Math.round(dueTotal))}</Text>
            </View>
            <View style={[T.card, { flex: 1, marginBottom: 0 }]}>
              <Text style={T.eyebrow}>Average a month</Text>
              <Text style={[T.fig, { fontSize: 19, marginTop: 4 }]}>{money(Math.round(monthly))}</Text>
            </View>
          </View>

          {S.subs.length === 0 ? (
            <View style={{ marginTop: 14 }}>
              <Empty title="No subscriptions yet"
                body="Anything falling due before the end of the month shows up here as a to-do list." />
            </View>
          ) : (<>
            <Text style={T.group}>To pay this month</Text>
            {due.length === 0 && paid.length === 0 && (
              <Empty title="All clear" body="Nothing due before the end of the month." />
            )}
            {due.map(s => {
              const late = daysTo(s.next) < 0, isToday = daysTo(s.next) === 0;
              return (
                <View key={s.id} style={[T.card, { flexDirection: 'row', alignItems: 'center', gap: 12 },
                                         late && { borderColor: C.warn }]}>
                  <View style={{ width: 21, height: 21, borderRadius: 5, borderWidth: 1.5, borderColor: C.line }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}>{s.name}</Text>
                    <Text style={{ fontSize: 11.5, marginTop: 3,
                      color: late || isToday ? C.warn : C.muted,
                      fontWeight: late || isToday ? '600' : '400' }}>
                      {late ? `Overdue since ${fmtDate(s.next)}` : isToday ? 'Due today' : `Due ${fmtDate(s.next)}`} · {CYC[s.cycle]}
                    </Text>
                  </View>
                  <Text style={[T.fig, { fontSize: 14.5 }]}>{money(s.amount)}</Text>
                  <Pressable onPress={() => pay(s)}
                    style={{ backgroundColor: C.ink, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Pay</Text>
                  </Pressable>
                </View>
              );
            })}
            {paid.map(s => (
              <View key={s.id} style={[T.card, { flexDirection: 'row', alignItems: 'center', gap: 12,
                                        backgroundColor: '#F4F6F8', borderStyle: 'dashed' }]}>
                <View style={{ width: 21, height: 21, borderRadius: 5, backgroundColor: C.pos,
                               alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.muted,
                                 textDecorationLine: 'line-through' }}>{s.name}</Text>
                  <Text style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                    Paid · next on {fmtDate(s.next)}
                  </Text>
                </View>
                <Text style={[T.fig, { fontSize: 14.5 }]}>{money(s.amount)}</Text>
              </View>
            ))}

            <Text style={T.group}>All subscriptions</Text>
            {S.subs.map(s => (
              <View key={s.id} style={T.card}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.ink }}>{s.name}</Text>
                  <Text style={T.fig}>{money(s.amount)}</Text>
                </View>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {CYC[s.cycle]} · next {fmtDate(s.next)} · {money(Math.round(perMonth(s)))} a month
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Btn label="Edit" onPress={() => setForm({ ...s })} />
                  {dueThisMonth(s) && <Btn label="Pay now" kind="dark" onPress={() => pay(s)} />}
                </View>
              </View>
            ))}
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
        onPress={() => setForm({ id: null, name: '', amount: 0, cycle: 'monthly',
          next: new Date().toISOString().slice(0, 10) })}
      >
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 }}>+</Text>
      </Pressable>

      <Sheet visible={!!form} onClose={() => setForm(null)}>
        {form && (<>
          <Text style={T.h3}>{form.id ? 'Edit subscription' : 'Add a subscription'}</Text>
          <Text style={T.hint}>Anything falling due before the end of the month lands on your to-do list. You will get a reminder the day before and on the day.</Text>
          <Text style={T.label}>Name</Text>
          <Field value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="Netflix" maxLength={32} />
          <Text style={T.label}>Amount each time</Text>
          <AmountField value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="649" />
          <Text style={T.label}>How often</Text>
          <View style={{ gap: 8 }}>
            {Object.keys(CYC).map(c => (
              <Pressable key={c} onPress={() => setForm({ ...form, cycle: c })}
                style={{ padding: 12, borderWidth: 1, borderRadius: 9,
                         borderColor: form.cycle === c ? C.ink : C.line,
                         backgroundColor: form.cycle === c ? '#F7F8FA' : C.card }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{CYC[c]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={T.label}>Next payment due</Text>
          <DateField value={form.next} onChange={v => setForm({ ...form, next: v })} />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
            <Btn label="Cancel" onPress={() => setForm(null)} />
            <Btn label={form.id ? 'Save changes' : 'Add subscription'} kind="dark"
                 disabled={!form.name.trim() || !(form.amount > 0) || !form.next} onPress={save} />
          </View>
          {form.id && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <Btn label="Delete this subscription" kind="danger"
                   onPress={() => { st.removeSub(form.id); setForm(null); }} />
            </View>
          )}
        </>)}
      </Sheet>

      <PayFlow job={job} onClose={() => setJob(null)} />
    </View>
  );
}
