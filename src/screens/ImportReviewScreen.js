import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C } from '../theme';
import { useStore } from '../store';
import { money } from '../lib/money';
import { fmtDate } from '../lib/dates';
import { isDuplicateTx } from '../lib/statement';
import { allTargets } from '../lib/calc';
import { Sheet, Btn, T } from '../components/ui';
import AllocateSheet from '../components/AllocateSheet';

// Shared by both import sources (statement upload, Account Aggregator fetch):
// takes normalized rows, previews duplicates, and commits the selection via
// store.importTxs. Every row still lands in Normal savings first (each
// individual transaction keeps that simple), but when the selected batch is
// a net inflow, a second step offers to distribute that total into goal
// pockets in one pass — the same AllocateSheet used everywhere else — via
// store.allocate, rather than doing it one imported row at a time.
export default function ImportReviewScreen({ visible, rows, warnings, onClose }) {
  const st = useStore();
  const { S } = st;

  const [step, setStep] = useState('review'); // review | distribute | allocate

  const withDup = useMemo(
    () => (rows || []).map(r => ({ ...r, dup: isDuplicateTx(S.txs, r) })),
    [rows, S.txs]
  );

  const [excluded, setExcluded] = useState(() => new Set());
  const toggle = i => setExcluded(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const selected = withDup.filter((r, i) => !r.dup && !excluded.has(i));
  const netTotal = Math.round(
    selected.reduce((a, r) => a + (r.dir === 'in' ? r.amount : -r.amount), 0) * 100
  ) / 100;

  const close = () => { setExcluded(new Set()); setStep('review'); onClose(); };

  // Import the batch, then optionally move part of the net total out of
  // Normal savings into whichever pockets the AllocateSheet split chose —
  // 'normal' entries need no action since that's where it already landed.
  const finish = (splits) => {
    st.importTxs(selected);
    (splits || []).forEach(sp => {
      if (sp.id !== 'normal') st.allocate(sp.id, [{ id: 'normal', amount: sp.amount }]);
    });
    close();
  };

  const confirmReview = () => { if (netTotal > 0) setStep('distribute'); else finish(); };

  if (!rows) return null;

  return (
    <>
      <Sheet visible={visible && step === 'review'} onClose={close}>
        <Text style={T.h3}>Review {rows.length} transaction{rows.length === 1 ? '' : 's'}</Text>
        <Text style={T.hint}>
          Everything lands in Normal savings first. If this batch is a net inflow, you'll get a
          chance to set some of it aside into a pocket next.
        </Text>

        {warnings?.length > 0 && (
          <View style={{ marginTop: 10, borderWidth: 1, borderLeftWidth: 4, borderColor: C.warn,
                         backgroundColor: '#FBF1EE', padding: 12, borderRadius: 4 }}>
            <Text style={{ fontSize: 12.5, color: C.ink, lineHeight: 18 }}>
              {warnings.length} row{warnings.length === 1 ? '' : 's'} couldn't be read and were skipped.
            </Text>
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          {withDup.map((r, i) => {
            const on = !r.dup && !excluded.has(i);
            return (
              <Pressable key={i} onPress={() => !r.dup && toggle(i)} disabled={r.dup}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11,
                         borderWidth: 1, borderRadius: 9, marginBottom: 7,
                         opacity: r.dup ? 0.45 : 1,
                         borderColor: on ? C.ink : C.line,
                         backgroundColor: on ? '#F7F8FA' : C.card }}>
                <View style={{ width: 19, height: 19, borderRadius: 4, borderWidth: 1.5,
                               alignItems: 'center', justifyContent: 'center',
                               borderColor: on ? C.ink : C.line,
                               backgroundColor: on ? C.ink : 'transparent' }}>
                  {on ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{r.party}</Text>
                  <Text style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                    {fmtDate(r.date)}{r.dup ? ' · already imported' : ''}
                  </Text>
                </View>
                <Text style={[T.fig, { color: r.dir === 'out' ? C.warn : C.pos }]}>
                  {r.dir === 'out' ? '−' : '+'}{money(r.amount)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
          <Btn label="Cancel" onPress={close} />
          <Btn label={`Import ${selected.length} transaction${selected.length === 1 ? '' : 's'}`}
               kind="dark" disabled={selected.length === 0} onPress={confirmReview} />
        </View>
      </Sheet>

      <Sheet visible={visible && step === 'distribute'} onClose={close}>
        <Text style={T.h3}>Distribute {money(netTotal)}?</Text>
        <Text style={T.hint}>
          This batch adds up to a net {money(netTotal)} coming in. Set some aside into a goal
          pocket now, or leave it all in Normal savings — you can always move it later.
        </Text>
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
          <Btn label="Back" onPress={() => setStep('review')} />
          <Btn label="Leave it in Normal" onPress={() => finish()} />
        </View>
        <View style={{ marginTop: 9 }}>
          <Btn label="Distribute into pockets" kind="dark" onPress={() => setStep('allocate')} />
        </View>
      </Sheet>

      {step === 'allocate' && (
        <AllocateSheet
          visible onClose={() => setStep('distribute')}
          targets={allTargets(S)} total={netTotal}
          title={`Put ${money(netTotal)} into`}
          hint="Pick up to 5 pockets. Anything left over stays in Normal savings."
          confirmLabel="Finish import"
          onDone={finish}
        />
      )}
    </>
  );
}
