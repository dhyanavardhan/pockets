import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { C } from '../theme';
import { useStore } from '../store';
import { money, exact } from '../lib/money';
import { allTargets } from '../lib/calc';
import { Sheet, Btn, AmountField, T } from './ui';
import AllocateSheet from './AllocateSheet';

// Every outgoing or incoming payment funnels through here: enter an amount,
// then pick the pockets. `link` ties it to a debt, loan or subscription so undo
// can restore that record.
//
//   job = { dir:'out'|'in', party, suggested, max, hint, link }
export default function PayFlow({ job, onClose }) {
  const st = useStore();
  const { S } = st;
  const [amount, setAmount] = useState(job?.suggested || 0);
  const [step, setStep] = useState('amount');

  if (!job) return null;
  const out = job.dir === 'out';
  const targets = allTargets(S);
  const capped = out; // money leaving can only come from what a pocket holds

  const tooMuch = job.max != null && amount > job.max + 1;
  const amountOk = !isNaN(amount) && amount > 0 && !tooMuch;

  const done = () => { setStep('amount'); onClose(); };

  return (
    <>
      <Sheet visible={step === 'amount'} onClose={done}>
        <Text style={T.h3}>{out ? `Paying ${job.party}` : `Money from ${job.party}`}</Text>
        <Text style={T.hint}>{job.hint}</Text>
        <Text style={T.label}>Amount {out ? 'paid' : 'received'}</Text>
        <AmountField value={job.suggested || 0} onChange={setAmount} placeholder="5" />
        <Text style={T.err}>{tooMuch ? `That is more than the ${exact(job.max)} outstanding.` : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <Btn label="Cancel" onPress={done} />
          <Btn label="Choose pockets" kind="dark" disabled={!amountOk} onPress={() => setStep('pick')} />
        </View>
      </Sheet>

      {step === 'pick' && (
        <AllocateSheet
          visible onClose={done}
          targets={targets} capped={capped} total={amount}
          title={out ? `Take ${money(amount)} from` : `Put ${money(amount)} into`}
          hint={out ? 'Pick up to 5 pockets to deduct from.' : 'Pick up to 5 pockets to receive it.'}
          confirmLabel={out ? 'Pay it' : 'Save it'}
          onDone={splits => {
            st.addTx({ dir: job.dir, party: job.party, amount, splits, link: job.link,
                       txnId: job.txnId, description: job.description });
            done();
          }}
        />
      )}
    </>
  );
}
