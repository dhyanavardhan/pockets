import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { C } from '../theme';
import { Sheet, Btn, Field, T } from '../components/ui';
import { BACKEND_URL, apiJson as api } from '../lib/backend';

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

// Drives the Setu Account Aggregator consent → data flow against our own
// backend (server/), which holds the Setu credentials — this screen never
// talks to Setu directly. See src/screens/ImportReviewScreen.js for what
// happens to the rows this hands back.
export default function ConnectBankScreen({ visible, onClose, onFetched }) {
  const [step, setStep] = useState('start'); // start | approving | polling | fetching | error
  const [vua, setVua] = useState('');
  const [error, setError] = useState('');
  const consentId = useRef(null);
  const pollUntil = useRef(0);

  useEffect(() => {
    if (!visible) { setStep('start'); setError(''); setVua(''); consentId.current = null; }
  }, [visible]);

  const fail = msg => { setError(msg); setStep('error'); };

  const startConsent = async () => {
    if (!BACKEND_URL) { setError('No backend configured — set extra.backendUrl in app.json.'); setStep('error'); return; }
    if (!vua.trim()) { setError('Enter your Account Aggregator handle.'); return; }
    try {
      const { consentId: id, approvalUrl } = await api('/connect/start', {
        method: 'POST', body: JSON.stringify({ vua: vua.trim() }),
      });
      consentId.current = id;
      setStep('approving');
      await WebBrowser.openAuthSessionAsync(approvalUrl, null);
      // Whether or not the browser redirected back to us, the user has now
      // either approved, rejected, or backed out — check the actual status
      // rather than trusting the browser result type.
      pollStatus();
    } catch (e) {
      fail('Could not start the consent request. Is the backend reachable?');
    }
  };

  const pollStatus = () => {
    setStep('polling');
    pollUntil.current = Date.now() + POLL_TIMEOUT_MS;
    checkStatus();
  };

  const checkStatus = async () => {
    try {
      const { status } = await api(`/connect/status/${consentId.current}`);
      if (status === 'ACTIVE') return startFetch();
      if (status === 'REJECTED' || status === 'REVOKED') return fail('The consent request was not approved.');
      if (Date.now() > pollUntil.current) return fail('Timed out waiting for approval. You can try again.');
      setTimeout(checkStatus, POLL_MS);
    } catch (e) {
      fail('Lost contact with the backend while checking consent status.');
    }
  };

  const startFetch = async () => {
    setStep('fetching');
    try {
      await api(`/connect/fetch/${consentId.current}`, { method: 'POST' });
      pollUntil.current = Date.now() + POLL_TIMEOUT_MS;
      checkTransactions();
    } catch (e) {
      fail('Could not start fetching your transactions.');
    }
  };

  const checkTransactions = async () => {
    try {
      const data = await api(`/connect/transactions/${consentId.current}`);
      if (data.ready) return onFetched(data.rows, data.warnings || []);
      if (Date.now() > pollUntil.current) return fail('Timed out waiting for your bank to respond.');
      setTimeout(checkTransactions, POLL_MS);
    } catch (e) {
      fail('Lost contact with the backend while fetching transactions.');
    }
  };

  const busy = step === 'polling' || step === 'fetching' || step === 'approving';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={T.h3}>Connect via Account Aggregator</Text>

      {step === 'start' && (
        <>
          <Text style={T.hint}>
            You'll be taken to a secure approval screen to choose your bank and how much history to
            share. Nothing is imported until you review it here afterward.
          </Text>
          <Text style={T.label}>Your Account Aggregator handle</Text>
          <Field value={vua} onChangeText={setVua} placeholder="9999999999@onemoney" maxLength={40} />
          <Text style={T.note}>The mobile-number-based ID from whichever AA app you're registered with
            (OneMoney, Finvu, etc.) — "9999999999@setu" in sandbox.</Text>
          <Text style={T.err}>{error}</Text>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 4 }}>
            <Btn label="Cancel" onPress={onClose} />
            <Btn label="Continue" kind="dark" onPress={startConsent} />
          </View>
        </>
      )}

      {busy && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator color={C.ink} />
          <Text style={[T.note, { marginTop: 12, textAlign: 'center' }]}>
            {step === 'approving' ? 'Waiting for you to finish in the browser…'
              : step === 'polling' ? 'Waiting for consent approval…'
              : 'Fetching your transactions — this can take a moment.'}
          </Text>
          <View style={{ marginTop: 16, width: '100%' }}>
            <Btn label="Cancel" onPress={onClose} />
          </View>
        </View>
      )}

      {step === 'error' && (
        <>
          <Text style={[T.err, { marginTop: 10 }]}>{error}</Text>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
            <Btn label="Close" onPress={onClose} />
            <Btn label="Try again" kind="dark" onPress={startConsent} />
          </View>
        </>
      )}
    </Sheet>
  );
}
