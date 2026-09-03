import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { loginWithPin } from './src/store';


export default function LoginScreen({ onUnlock }) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');

  async function handleLogin() {
    const trimmedPin = pin.trim();
    if (trimmedPin.length === 0) {
      setError('Please enter your PIN');
      return;
    }
    const isValid = await loginWithPin(trimmedPin);
    if (isValid) {
        setPin('');
        setError('');
        onUnlock()
    } else {
      setError('Invalid PIN');
      setPin('');
    }
  }

  return (
    <View  style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={styles.title}>Enter your Pockets-PIN</Text>
      <TextInput
      style={styles.textInputStyle}
        placeholder="Enter PIN"
        value = {pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType='number-pad'
      />
      <Button title="Login" onPress={handleLogin} />
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
    </View>
  );
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