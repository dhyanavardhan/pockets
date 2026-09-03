import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money, alt, exact } from '../lib/money';
import { dayLabel, fmtTime } from '../lib/dates';
import { allTargets } from '../lib/calc';
import { Sheet, Btn, Field, AmountField, Toggle, Empty, T } from '../components/ui';
import PayFlow from '../components/PayFlow';
import AllocateSheet from '../components/AllocateSheet';
import StatementImportSheet from '../components/StatementImportSheet';
import ImportReviewScreen from './ImportReviewScreen';

function InfoRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
      <Text style={{ fontSize: 12, color: C.muted }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.ink, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

// Everything a transaction record holds, laid out plainly — used by both the
// per-row ⓘ in the Activity list and the one in the Edit sheet, so the two
// can't drift into showing different subsets of the same data.
function TxInfoPanel({ t }) {
  const linked = t.settle ? `Settled a debt with ${t.settle.party}`
    : t.loanPay ? 'Loan payment'
    : t.subPay ? 'Subscription payment'
    : 'Not linked to a debt, loan, or subscription';

  return (
    <View style={{ marginTop: 8, borderWidth: 1, borderColor: C.line, borderRadius: 9,
                   backgroundColor: '#F7F8FA', padding: 12 }}>
      <InfoRow label="Direction" value={t.dir === 'out' ? 'Sent' : 'Received'} />
      <InfoRow label={t.dir === 'out' ? 'Sent to' : 'Received from'} value={t.party} />
      <InfoRow label="Amount" value={exact(t.amount)} />
      <InfoRow label="Added" value={`${dayLabel(t.at)} · ${fmtTime(t.at)}`} />
      <InfoRow label="Transaction ID" value={t.txnId || 'None'} />
      <InfoRow label="Description" value={t.description || 'None'} />
      <InfoRow label="Source" value={t.source === 'bank' ? 'Bank statement' : 'Manual entry'} />
      <InfoRow label="Linked to" value={linked} />
      <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.muted,
                     fontWeight: '600', marginTop: 10 }}>Split across</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {t.splits.map(s => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: '#EEF0F2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11.5, color: C.ink }}>{s.name}</Text>
            <Text style={{ fontSize: 11.5, fontFamily: F.mono, color: C.ink }}>{money(s.amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const st = useStore();
  const { S } = st;
  const [chooser, setChooser] = useState(false);
  const [newTx, setNewTx] = useState(null);   // { dir, party, txnId, description }
  const [job, setJob] = useState(null);
  const [undo, setUndo] = useState(null);
  const [statementSheet, setStatementSheet] = useState(false);
  const [pending, setPending] = useState(null); // { rows, warnings } for ImportReviewScreen

  const [editTx, setEditTx] = useState(null);   // the tx being edited
  const [editForm, setEditForm] = useState(null);
  const [editSplit, setEditSplit] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoFor, setInfoFor] = useState(null); // id of the tx row whose info panel is open

  const openEdit = t => {
    setEditTx(t);
    setEditForm({ dir: t.dir, party: t.party, txnId: t.txnId || '', description: t.description || '', amount: t.amount });
  };
  const closeEdit = () => { setEditTx(null); setEditForm(null); setEditSplit(false); setShowInfo(false); };
  const locked = editTx && (editTx.source === 'bank' || !!(editTx.settle || editTx.loanPay || editTx.subPay));

  // What's available to re-split into, as if this transaction hadn't
  // happened yet — otherwise a pocket the old amount came out of would look
  // short by that same amount while picking where the new amount comes from.
  const previewTargets = () => {
    const clone = structuredClone(S);
    const sign = editTx.dir === 'out' ? 1 : -1;
    clone.balance += sign * editTx.amount;
    editTx.splits.forEach(sp => {
      if (sp.id !== 'normal') {
        const p = clone.pockets.find(x => x.id === sp.id);
        if (p) p.amount += sign * sp.amount;
      }
    });
    return allTargets(clone);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: 18, marginTop: 22 }}>
          {S.txs.length === 0 ? (
            <Empty title="No transactions yet"
              body="Record money you send or receive, then choose which pockets it comes out of or goes into." />
          ) : [...S.txs].reverse().map(t => {
            const out = t.dir === 'out';
            const tag = t.settle ? 'settled a debt' : t.loanPay ? 'loan payment' : t.subPay ? 'subscription'
                      : t.source === 'bank' ? 'from statement' : '';
            return (
              <View key={t.id} style={T.card}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.ink }}>{t.party}</Text>
                  <Text style={[T.fig, { color: out ? C.warn : C.pos }]}>
                    {out ? '−' : '+'}{money(t.amount)}
                  </Text>
                  <Pressable onPress={() => setInfoFor(infoFor === t.id ? null : t.id)} style={{ paddingLeft: 8 }}>
                    <Text style={{ fontSize: 17, color: C.muted }}>ⓘ</Text>
                  </Pressable>
                </View>
                {infoFor === t.id && <TxInfoPanel t={t} />}
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {out ? 'Sent' : 'Received'} · {dayLabel(t.at)} · {fmtTime(t.at)}
                  {alt(t.amount) ? ` · ${alt(t.amount)}` : ''}{tag ? ` · ${tag}` : ''}
                </Text>
                {t.txnId ? (
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: F.mono }}>
                    Txn ID: {t.txnId}
                  </Text>
                ) : null}
                {t.description ? (
                  <Text style={{ fontSize: 12.5, color: C.ink, marginTop: 5 }}>{t.description}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {t.splits.map(s => (
                    <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: '#F1F3F5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: s.color }} />
                      <Text style={{ fontSize: 11.5, color: C.ink }}>{s.name}</Text>
                      <Text style={{ fontSize: 11.5, fontFamily: F.mono, color: C.ink }}>{money(s.amount)}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Btn label="Edit" onPress={() => openEdit(t)} />
                  <Btn label="Undo this transaction" kind="danger" onPress={() => setUndo(t)} />
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
        onPress={() => setChooser(true)}
      >
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 }}>+</Text>
      </Pressable>

      <Sheet visible={chooser} onClose={() => setChooser(false)}>
        <Text style={T.h3}>Add a transaction</Text>
        <Text style={T.hint}>Enter it yourself, or pull it in from a bank statement.</Text>
        <View style={{ gap: 9, marginTop: 14 }}>
          <Btn label="Add manually" kind="dark"
               onPress={() => { setChooser(false); setNewTx({ dir: 'in', party: '', txnId: '', description: '' }); }} />
          <Btn label="From a bank statement"
               onPress={() => { setChooser(false); setStatementSheet(true); }} />
        </View>
      </Sheet>

      <Sheet visible={!!newTx} onClose={() => setNewTx(null)}>
        {newTx && (<>
          <Text style={T.h3}>New transaction</Text>
          <Text style={T.hint}>Record what moved, then choose which pockets it affects.</Text>
          <Toggle value={newTx.dir} onChange={v => setNewTx({ ...newTx, dir: v })}
                  options={[{ v: 'out', l: 'Sent' }, { v: 'in', l: 'Received' }]} />
          <Text style={T.label}>{newTx.dir === 'out' ? 'Sent to' : 'Received from'}</Text>
          <Field value={newTx.party} onChangeText={v => setNewTx({ ...newTx, party: v })}
                 placeholder={newTx.dir === 'out' ? 'Landlord' : 'Employer'} maxLength={40} />
          <Text style={T.label}>Transaction ID — optional</Text>
          <Field value={newTx.txnId} onChangeText={v => setNewTx({ ...newTx, txnId: v })}
                 placeholder="Bank reference number" maxLength={40} />
          <Text style={T.label}>Description — optional</Text>
          <Field value={newTx.description} onChangeText={v => setNewTx({ ...newTx, description: v })}
                 placeholder="What was this for?" maxLength={120} />
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
            <Btn label="Cancel" onPress={() => setNewTx(null)} />
            <Btn label="Continue" kind="dark" disabled={!newTx.party.trim()}
                 onPress={() => {
                   setJob({ dir: newTx.dir, party: newTx.party.trim(), suggested: 0,
                            hint: 'Next you choose which pockets it affects.',
                            txnId: newTx.txnId.trim() || null,
                            description: newTx.description.trim() });
                   setNewTx(null);
                 }} />
          </View>
        </>)}
      </Sheet>

      <PayFlow job={job} onClose={() => setJob(null)} />

      <StatementImportSheet
        visible={statementSheet}
        onClose={() => setStatementSheet(false)}
        onImported={(rows, warnings) => { setStatementSheet(false); setPending({ rows, warnings }); }}
      />
      <ImportReviewScreen
        visible={!!pending}
        rows={pending?.rows}
        warnings={pending?.warnings}
        onClose={() => setPending(null)}
      />

      <Sheet visible={!!undo} onClose={() => setUndo(null)}>
        {undo && (<>
          <Text style={T.h3}>Undo this transaction?</Text>
          <Text style={T.hint}>
            Reverses the split and your balance. Anything it settled — a debt, a loan payment,
            a subscription due date — is restored too.
          </Text>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Btn label="Keep it" onPress={() => setUndo(null)} />
            <Btn label="Undo" kind="danger" onPress={() => { st.undoTx(undo.id); setUndo(null); }} />
          </View>
        </>)}
      </Sheet>

      <Sheet visible={!!editTx} onClose={closeEdit}>
        {editTx && editForm && !editSplit && (<>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={T.h3}>Edit transaction</Text>
            <Pressable onPress={() => setShowInfo(v => !v)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20 }}>ⓘ</Text>
            </Pressable>
          </View>
          {locked && (
            <Text style={T.hint}>
              {editTx.source === 'bank'
                ? "This came from a bank statement — only the description can be changed, so the ledger doesn't disagree with your bank."
                : "This settled a debt, loan payment, or subscription — only the description can be changed here."}
            </Text>
          )}

          {showInfo && <TxInfoPanel t={editTx} />}

          <Text style={T.label}>Direction</Text>
          {locked ? (
            <Text style={{ fontSize: 15, color: C.ink, paddingVertical: 8 }}>
              {editForm.dir === 'out' ? 'Sent' : 'Received'}
            </Text>
          ) : (
            <Toggle value={editForm.dir} onChange={v => setEditForm({ ...editForm, dir: v })}
                    options={[{ v: 'out', l: 'Sent' }, { v: 'in', l: 'Received' }]} />
          )}

          <Text style={T.label}>{editForm.dir === 'out' ? 'Sent to' : 'Received from'}</Text>
          {locked ? (
            <Text style={{ fontSize: 15, color: C.ink, paddingVertical: 8 }}>{editForm.party}</Text>
          ) : (
            <Field value={editForm.party} onChangeText={v => setEditForm({ ...editForm, party: v })} maxLength={40} />
          )}

          <Text style={T.label}>Amount</Text>
          {locked ? (
            <Text style={[T.fig, { paddingVertical: 8 }]}>{money(editForm.amount)}</Text>
          ) : (
            <AmountField value={editForm.amount} onChange={v => setEditForm({ ...editForm, amount: v })} />
          )}

          <Text style={T.label}>Transaction ID{locked ? '' : ' — optional'}</Text>
          {locked ? (
            <Text style={{ fontSize: 15, color: editForm.txnId ? C.ink : C.muted, paddingVertical: 8 }}>
              {editForm.txnId || 'None'}
            </Text>
          ) : (
            <Field value={editForm.txnId} onChangeText={v => setEditForm({ ...editForm, txnId: v })} maxLength={40} />
          )}

          <Text style={T.label}>Description — optional</Text>
          <Field value={editForm.description} onChangeText={v => setEditForm({ ...editForm, description: v })}
                 placeholder="What was this for?" maxLength={120} />

          {!locked && <Text style={T.note}>Changing the amount will ask you to re-pick which pockets it affects.</Text>}

          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Btn label="Cancel" onPress={closeEdit} />
            <Btn label="Save" kind="dark"
                 disabled={!locked && (!editForm.party.trim() || isNaN(editForm.amount) || editForm.amount <= 0)}
                 onPress={() => {
                   if (!locked && editForm.amount !== editTx.amount) { setEditSplit(true); return; }
                   st.editTx(editTx.id, {
                     dir: editForm.dir, party: editForm.party.trim(),
                     txnId: editForm.txnId.trim() || null, description: editForm.description.trim(),
                   });
                   closeEdit();
                 }} />
          </View>
        </>)}
      </Sheet>

      {editTx && editForm && editSplit && (
        <AllocateSheet
          visible onClose={() => setEditSplit(false)}
          targets={previewTargets()} capped={editForm.dir === 'out'} total={editForm.amount}
          title={editForm.dir === 'out' ? `Take ${money(editForm.amount)} from` : `Put ${money(editForm.amount)} into`}
          hint="Pick up to 5 pockets."
          confirmLabel="Save changes"
          onDone={splits => {
            st.editTx(editTx.id, {
              dir: editForm.dir, party: editForm.party.trim(), amount: editForm.amount, splits,
              txnId: editForm.txnId.trim() || null, description: editForm.description.trim(),
            });
            closeEdit();
          }}
        />
      )}
    </View>
  );
}
