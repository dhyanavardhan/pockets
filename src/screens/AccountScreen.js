import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { C } from '../theme';
import { T, Btn, Field } from '../components/ui';
import { saveStatementPassword, getStatementPassword } from '../store';

export default function AccountScreen() {
  const [pwInput, setPwInput] = useState('');
  const [hasPw, setHasPw] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getStatementPassword().then(pw => setHasPw(!!pw)); }, []);

  const savePassword = async () => {
    if (!pwInput.trim()) return;
    await saveStatementPassword(pwInput.trim());
    setPwInput('');
    setHasPw(true);
    setSaved(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper, padding: 18 }}>
      <Text style={T.group}>Account</Text>
      <Text style={{ fontSize: 15, color: C.ink, marginBottom: 4 }}>Change Pockets-PIN</Text>
      <Text style={{ fontSize: 15, color: C.ink, marginBottom: 18 }}>Finance Suggestions</Text>

      <Text style={T.group}>Bank statement password</Text>
      <View style={T.card}>
        <Text style={T.note}>
          Used automatically whenever you import a password-protected XLSX statement — you won't be
          asked for it again there. It's stored only on this device.
        </Text>
        <Text style={[T.note, { marginTop: 8, fontWeight: '600', color: hasPw ? C.pos : C.muted }]}>
          {hasPw ? 'A password is saved.' : 'No password saved yet.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              value={pwInput}
              onChangeText={v => { setPwInput(v); setSaved(false); }}
              placeholder={hasPw ? 'Update password' : 'Enter password'}
              secureTextEntry
            />
          </View>
          <Btn label="Save" onPress={savePassword} disabled={!pwInput.trim()} style={{ flex: 0, paddingHorizontal: 18 }} />
        </View>
        {saved ? <Text style={[T.note, { marginTop: 8, color: C.pos }]}>Saved.</Text> : null}
      </View>
    </View>
  );
}
