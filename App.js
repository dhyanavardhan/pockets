import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestPermission } from './src/lib/notify';
import HomePage from './HomePage';
import {  hasSavedPin } from './src/store';
import SetupPinScreen from './SetupPinScreen';
import LoginScreen from './LoginScreen';
import { isLockSuppressed } from './src/lib/appLock';

// Text glyphs keep the dependency list short. Swap for @expo/vector-icons if
// you want proper icons.




export default function App() {
  useEffect(() => { requestPermission(); }, []);
  const [isReady, setIsReady] = React.useState(false);
  const [hasPin, setHasPin] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);
  useEffect(() => {
    console.log(AppState.currentState);
  }, [AppState.currentState]);
  useEffect(() => {
    async function init() {
      const result = await hasSavedPin();
      setHasPin(result);
      setIsReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if ((nextAppState === 'background' || nextAppState === 'inactive') && !isLockSuppressed()) {
        setIsLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!isReady) {
    return null; // or a loading spinner
  }

  if (!hasPin ) {
    return (
      <SetupPinScreen  onDone = {() => setHasPin(true)} />
    )
  }

  if (isLocked) {
    return (
      <LoginScreen onUnlock={() => setIsLocked(false)} />
    )
  }

  return (
    <HomePage />
  );
}
