import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money } from '../lib/money';
import { normal, allTargets, paceNote, isLate } from '../lib/calc';
import { fmtDate } from '../lib/dates';
import { Sheet, Btn, Field, AmountField, DateField, Empty, T } from '../components/ui';
import AllocateSheet from '../components/AllocateSheet';

export default function PocketsScreen() {
  const st = useStore();
  const { S } = st;
  const nm = normal(S);

  const [balSheet, setBalSheet] = useState(false);
  const [balVal, setBalVal] = useState(0);
  const [form, setForm] = useState(null);      // create / edit
  const [alloc, setAlloc] = useState(null);    // { mode:'addAmount'|'add'|'delete', pocketId, total }
  const [addAmt, setAddAmt] = useState(0);
  const [outSheet, setOutSheet] = useState(null);
  const [outAmt, setOutAmt] = useState(0);

  const openNew = () => setForm({ id: null, name: '', amount: 0, target: 0, due: null });
  const openEdit = p => setForm({ ...p });

  const saveForm = () => {
    if (!form.name.trim()) return;
    if (form.id) st.editPocket(form.id, { name: form.name.trim(), amount: form.amount, target: form.target, due: form.due });
    else st.addPocket({ name: form.name.trim(), amount: form.amount, target: form.target, due: form.due });
    setForm(null);
  };

  const room = form?.id ? form.amount + Math.max(0, nm) : Math.max(0, nm);
  const formOk = form && form.name.trim() && form.amount >= 0 && form.amount <= room;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
          {/* Normal savings is derived, so it gets no controls of its own. */}
          <View style={[T.card, { backgroundColor: '#F4F6F8', borderStyle: 'dashed' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: C.slate }} />
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}>Normal savings</Text>
            </View>
            <Text style={T.eyebrow}>{'\n'}Total</Text>
            <Text style={[T.fig, { color: nm < 0 ? C.warn : C.ink }]}>{money(nm)}</Text>
            <Text style={[T.note, { marginTop: 10 }]}>
              Whatever is left after your goal pockets. Adjusts on its own — no target, nothing to move in.
            </Text>
          </View>

          {S.pockets.length === 0 ? (
            <Empty title="No goal pockets yet"
              body="A goal pocket is money set aside for one thing — a laptop, a bike, an emergency fund." />
          ) : S.pockets.map(p => {
            const pct = p.target > 0 ? Math.min(100, (p.amount / p.target) * 100) : 0;
            const done = p.target > 0 && p.amount >= p.target;
            const pace = paceNote(p);
            return (
              <View key={p.id} style={T.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: p.color }} />
                  <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: C.ink }}>{p.name}</Text>
                  <Pressable onPress={() => openEdit(p)}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted }}>Edit</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', gap: 22, marginTop: 12 }}>
                  <View><Text style={T.eyebrow}>Total</Text><Text style={T.fig}>{money(p.amount)}</Text></View>
                  <View><Text style={T.eyebrow}>Target</Text>
                    <Text style={[T.fig, !p.target && { color: C.muted }]}>{p.target ? money(p.target) : 'None'}</Text></View>
                  <View><Text style={T.eyebrow}>By</Text>
                    <Text style={[T.fig, { fontSize: 14.5 }, !p.due && { color: C.muted }]}>
                      {p.due ? fmtDate(p.due) : 'No date'}</Text></View>
                </View>

                {p.target > 0 && (
                  <>
                    <View style={{ height: 5, backgroundColor: '#EDEFF2', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                      <View style={{ height: 5, width: `${pct}%`, backgroundColor: p.color, borderRadius: 3 }} />
                    </View>
                    <Text style={[T.note, { marginTop: 6 }]}>
                      {done ? 'Goal reached' : `${money(p.target - p.amount)} to go · ${Math.round(pct)}%`}
                    </Text>
                  </>
                )}
                {!!pace && (
                  <Text style={[T.note, { marginTop: 5, fontWeight: '500', color: isLate(p) ? C.warn : C.ink }]}>
                    {pace}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Btn label="Add money" onPress={() => { setAddAmt(0); setAlloc({ mode: 'addAmount', pocketId: p.id }); }} />
                  <Btn label="Take out" disabled={p.amount <= 0}
                       onPress={() => { setOutAmt(0); setOutSheet(p); }} />
                </View>
              </View>
            );
          })}
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
        onPress={openNew}
      >
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 }}>+</Text>
      </Pressable>

      {/* ---- balance ---- */}
      <Sheet visible={balSheet} onClose={() => setBalSheet(false)}>
        <Text style={T.h3}>Edit your bank balance</Text>
        <Text style={T.hint}>Copy the current figure from your banking app. Everything else is worked out from this number.</Text>
        <Text style={T.label}>Balance right now</Text>
        <AmountField value={S.balance} onChange={setBalVal} placeholder="50" />
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
          <Btn label="Cancel" onPress={() => setBalSheet(false)} />
          <Btn label="Save balance" kind="dark" disabled={isNaN(balVal) || balVal < 0}
               onPress={() => { st.setBalance(balVal); setBalSheet(false); }} />
        </View>
      </Sheet>

      {/* ---- create / edit ---- */}
      <Sheet visible={!!form} onClose={() => setForm(null)}>
        {form && (<>
          <Text style={T.h3}>{form.id ? `Edit ${form.name}` : 'New goal pocket'}</Text>
          <Text style={T.hint}>
            {form.id ? `Up to ${money(room)} available for this pocket.`
                     : 'Already been saving for this? Put that figure in Total — you do not have to start from zero.'}
          </Text>
          <Text style={T.label}>Name</Text>
          <Field value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="New laptop" maxLength={28} />
          <Text style={T.label}>Total saved so far</Text>
          <AmountField value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          <Text style={T.label}>Target — optional</Text>
          <AmountField value={form.target} onChange={v => setForm({ ...form, target: v })} placeholder="80" />
          <Text style={T.label}>Finish by — optional</Text>
          <DateField value={form.due} onChange={v => setForm({ ...form, due: v })} allowClear />
          <Text style={T.err}>{form.amount > room ? `Only ${money(room)} is available.` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Btn label="Cancel" onPress={() => setForm(null)} />
            <Btn label={form.id ? 'Save changes' : 'Create pocket'} kind="dark" disabled={!formOk} onPress={saveForm} />
          </View>
          {form.id && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
              <Btn label="Delete this pocket" kind="danger" onPress={() => {
                const p = S.pockets.find(x => x.id === form.id);
                if (p.amount <= 0) { st.deletePocket(p.id, []); setForm(null); }
                else { setAlloc({ mode: 'delete', pocketId: p.id }); setForm(null); }
              }} />
            </View>
          )}
        </>)}
      </Sheet>

      {/* ---- take out ---- */}
      <Sheet visible={!!outSheet} onClose={() => setOutSheet(null)}>
        {outSheet && (<>
          <Text style={T.h3}>Take out of {outSheet.name}</Text>
          <Text style={T.hint}>Goes back into Normal savings. {outSheet.name} holds {money(outSheet.amount)}.</Text>
          <Text style={T.label}>Amount</Text>
          <AmountField value={0} onChange={setOutAmt} placeholder="5" />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Btn label="Cancel" onPress={() => setOutSheet(null)} />
            <Btn label="Take out" kind="dark"
                 disabled={isNaN(outAmt) || outAmt <= 0 || outAmt > outSheet.amount}
                 onPress={() => { st.takeOut(outSheet.id, outAmt); setOutSheet(null); }} />
          </View>
        </>)}
      </Sheet>

      {/* ---- add money, step 1: how much ---- */}
      <Sheet visible={alloc?.mode === 'addAmount'} onClose={() => setAlloc(null)}>
        {alloc?.mode === 'addAmount' && (() => {
          const dest = S.pockets.find(p => p.id === alloc.pocketId);
          const pool = allTargets(S).filter(t => t.id !== alloc.pocketId)
                                    .reduce((a, t) => a + Math.max(0, t.amount), 0);
          return (<>
            <Text style={T.h3}>Add to {dest.name}</Text>
            <Text style={T.hint}>
              Nothing leaves your bank account — this only reserves it. {money(pool)} is available across your other pockets.
            </Text>
            <Text style={T.label}>Amount</Text>
            <AmountField value={0} onChange={setAddAmt} placeholder="5" />
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
              <Btn label="Cancel" onPress={() => setAlloc(null)} />
              <Btn label="Choose where from" kind="dark"
                   disabled={isNaN(addAmt) || addAmt <= 0 || addAmt > pool}
                   onPress={() => setAlloc({ mode: 'add', pocketId: alloc.pocketId, total: addAmt })} />
            </View>
          </>);
        })()}
      </Sheet>

      {/* ---- add money, step 2: which pockets it comes from ---- */}
      {alloc?.mode === 'add' && (
        <AllocateSheet
          visible onClose={() => setAlloc(null)}
          targets={allTargets(S).filter(t => t.id !== alloc.pocketId)}
          capped
          total={alloc.total}
          title={`Take ${money(alloc.total)} from`}
          hint="Normal savings usually covers it. Pick up to 5 pockets."
          confirmLabel="Add money"
          onDone={splits => { st.allocate(alloc.pocketId, splits); setAlloc(null); }}
        />
      )}

      {/* ---- delete: distribute what it holds ---- */}
      {alloc?.mode === 'delete' && (() => {
        const p = S.pockets.find(x => x.id === alloc.pocketId);
        return (
          <AllocateSheet
            visible onClose={() => setAlloc(null)}
            targets={allTargets(S).filter(t => t.id !== p.id)}
            total={p.amount}
            title={`Delete ${p.name}?`}
            hint={`It holds ${money(p.amount)}, which has to go somewhere. Pick up to 5 pockets to receive it.`}
            confirmLabel="Move and delete"
            onDone={splits => { st.deletePocket(p.id, splits); setAlloc(null); }}
          />
        );
      })()}
    </View>
  );
}
