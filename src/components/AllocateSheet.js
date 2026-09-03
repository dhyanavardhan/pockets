import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C } from '../theme';
import { money, exact } from '../lib/money';
import { Sheet, Btn, AmountField, T } from './ui';

// The select-then-split engine, written once and reused by every flow that
// moves money: transactions, adding to a pocket, and deleting a pocket.
//
//   targets   [{ id, name, color, amount }]
//   capped    true when each target can only give what it holds (money leaving)
//   total     the amount to distribute
//   onDone    (splits) => void   splits = [{ id, name, color, amount }]
export default function AllocateSheet({
  visible, onClose, onDone, targets, total, capped,
  title, hint, confirmLabel = 'Confirm', max = 5,
}) {
  const [sel, setSel] = useState([]);
  const [shares, setShares] = useState({});
  const [step, setStep] = useState('pick');

  const usable = useMemo(
    () => (capped ? targets.filter(t => t.amount > 0) : targets),
    [targets, capped]
  );

  const reset = () => { setSel([]); setShares({}); setStep('pick'); };
  const close = () => { reset(); onClose(); };

  const toggle = id => setSel(s =>
    s.includes(id) ? s.filter(x => x !== id) : s.length < max ? [...s, id] : s
  );

  const finish = splits => { reset(); onDone(splits); };

  const goNext = () => {
    if (sel.length === 1) {
      const t = usable.find(x => x.id === sel[0]);
      finish([{ id: t.id, name: t.name, color: t.color, amount: total }]);
    } else setStep('split');
  };

  // --- validation for the split step ---
  const values = sel.map(id => shares[id] ?? 0);
  const bad = values.some(v => isNaN(v) || v < 0);
  const over = capped && sel.some(id => (shares[id] ?? 0) > usable.find(t => t.id === id).amount);
  const left = total - values.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
  const balanced = !bad && !over && left === 0;

  const overName = over
    ? usable.find(t => t.id === sel.find(id => (shares[id] ?? 0) > usable.find(x => x.id === id).amount)).name
    : null;

  // Single-target case can also be blocked when the source is too small.
  const pickOk = sel.length > 0 && total > 0 && (
    !capped || sel.reduce((a, id) => a + usable.find(t => t.id === id).amount, 0) >= total
  );

  return (
    <Sheet visible={visible} onClose={close}>
      {step === 'pick' ? (
        <>
          <Text style={T.h3}>{title}</Text>
          <Text style={T.hint}>{hint}</Text>
          <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 12, marginBottom: 6 }}>
            {sel.length} of {max} selected
          </Text>
          {usable.map(t => {
            const on = sel.includes(t.id);
            const blocked = !on && sel.length >= max;
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} disabled={blocked}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12,
                         borderWidth: 1, borderRadius: 9, marginBottom: 8,
                         opacity: blocked ? 0.4 : 1,
                         borderColor: on ? C.ink : C.line,
                         backgroundColor: on ? '#F7F8FA' : C.card }}>
                <View style={{ width: 19, height: 19, borderRadius: 4, borderWidth: 1.5,
                               alignItems: 'center', justifyContent: 'center',
                               borderColor: on ? C.ink : C.line,
                               backgroundColor: on ? C.ink : 'transparent' }}>
                  {on ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
                </View>
                <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: t.color }} />
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: C.ink }}>{t.name}</Text>
                <Text style={T.fig}>{money(t.amount)}</Text>
              </Pressable>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Btn label="Cancel" onPress={close} />
            <Btn label={sel.length > 1 ? 'Split it' : confirmLabel} kind="dark"
                 disabled={!pickOk} onPress={goNext} />
          </View>
        </>
      ) : (
        <>
          <Text style={T.h3}>Split {money(total)}</Text>
          <Text style={T.hint}>It has to add up to {exact(total)}.</Text>
          <View style={{ marginTop: 16 }}>
            {sel.map(id => {
              const t = usable.find(x => x.id === id);
              return (
                <View key={id} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 11, marginBottom: 11 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: t.color }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.ink }}>{t.name}</Text>
                    <Text style={{ fontSize: 12, color: C.muted }}>holds {money(t.amount)}</Text>
                  </View>
                  <AmountField compact value={0}
                    onChange={v => setShares(s => ({ ...s, [id]: v }))} />
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 13, marginTop: 4,
                         color: balanced ? C.pos : (over || left < 0 || bad) ? C.warn : C.muted }}>
            {bad ? 'One of these is not a number.'
              : over ? `${overName} does not hold that much.`
              : left === 0 ? 'Adds up exactly.'
              : left > 0 ? `${exact(left)} left to assign`
              : `${exact(-left)} over`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Btn label="Back" onPress={() => setStep('pick')} />
            <Btn label={confirmLabel} kind="dark" disabled={!balanced}
                 onPress={() => finish(sel.map(id => {
                   const t = usable.find(x => x.id === id);
                   return { id, name: t.name, color: t.color, amount: shares[id] };
                 }))} />
          </View>
        </>
      )}
    </Sheet>
  );
}
