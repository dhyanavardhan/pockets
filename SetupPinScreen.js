import * as React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { setUpPin } from './src/store';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function SetupPinScreen({ onDone }) {
  const [pin, setPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [error, setError] = React.useState('');

  async function handleSetPin() {
    if(pin.length <8 ) {
        setError('PIN must be atleast 8 digits long');
    }   
    // if pin has any letters or special characters, show error
    else if(!/^\d+$/.test(pin)) {
        setError('PIN must be numeric');
    }
    else if (pin !== confirmPin) {
      setError('PINs do not match');
    } else {
      await setUpPin(pin);
      onDone();
    }
}

    return (
        <SafeAreaProvider
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Button title="?" onPress={() => onDone()} style={{width : 4, height: 4}} />
        <Text style={styles.title}>Create your Pockets-PIN</Text>
        <TextInput
            style={styles.textInputStyle}
            placeholder="Enter PIN"
            value={pin}
            onChangeText={setPin}
            secureTextEntryinstructions
            keyboardType='number-pad'
            />
        <TextInput
            style={styles.textInputStyle}
            placeholder="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType='number-pad'
            />
        <Button title="Set PIN" onPress={handleSetPin} />
        {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
        
        </SafeAreaProvider>
    )

}

const styles = StyleSheet.create({
    textInputStyle: {
        borderWidth: 1,
        width: '80%',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
});