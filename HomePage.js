import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, Platform, StatusBar, View, Pressable } from 'react-native';

import { StoreProvider, useStore } from './src/store';
import { requestPermission } from './src/lib/notify';
import { C } from './src/theme';
import Header from './src/components/Header';
import { Sheet, Btn, AmountField, PersonCircleIcon } from './src/components/ui';

import PocketsScreen from './src/screens/PocketsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import OwesScreen from './src/screens/OwesScreen';
import LoansScreen from './src/screens/LoansScreen';
import SubsScreen from './src/screens/SubsScreen';
import AccountScreen from './src/screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Text glyphs keep the dependency list short. Swap for @expo/vector-icons if
// you want proper icons.
const icon = ch => ({ color }) => <Text style={{ fontSize: 17, color }}>{ch}</Text>;

function NavBar() {
  const navigation = useNavigation();

  return (
    <View style={{ backgroundColor: C.card, borderBottomColor: C.line, borderBottomWidth: 1, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink }}>Hi, User</Text>
      <Pressable onPress={() => navigation.navigate('AccountPage')}>
        <PersonCircleIcon size={28} color={C.ink} />
      </Pressable>
    </View>
  );
}

function HomeTabs({ onEdit }) {
  const { S, setBalance } = useStore();
  const [balSheet, setBalSheet] = React.useState(false);
  const [balVal, setBalVal] = React.useState(0);

  const openBalanceSheet = () => {
    setBalVal(S.balance);
    setBalSheet(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <NavBar />
      <Header onEdit={openBalanceSheet} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.ink,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}>
        <Tab.Screen name="Pockets" component={PocketsScreen} options={{ tabBarIcon: icon('◧') }} />
        <Tab.Screen name="Activity" component={TransactionsScreen} options={{ tabBarIcon: icon('⇄') }} />
        <Tab.Screen name="Owes" component={OwesScreen} options={{ tabBarIcon: icon('◐') }} />
        <Tab.Screen name="Loans" component={LoansScreen} options={{ tabBarIcon: icon('%') }} />
        <Tab.Screen name="Subs" component={SubsScreen} options={{ tabBarIcon: icon('↻') }} />
      </Tab.Navigator>

      <Sheet visible={balSheet} onClose={() => setBalSheet(false)}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: C.ink, letterSpacing: -0.3 }}>Edit your bank balance</Text>
        <Text style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 }}>
          Copy the current figure from your banking app. Everything else is worked out from this number.
        </Text>
        <Text style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted, fontWeight: '600', marginTop: 18, marginBottom: 7 }}>Balance right now</Text>
        <AmountField value={S.balance} onChange={setBalVal} placeholder="50" />
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
          <Btn label="Cancel" onPress={() => setBalSheet(false)} />
          <Btn label="Save balance" kind="dark" disabled={isNaN(balVal) || balVal < 0}
            onPress={() => { setBalance(balVal); setBalSheet(false); }} />
        </View>
      </Sheet>
    </View>
  );
}

function AccountPage() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ fontSize: 24, color: C.ink, padding: 12 }}>{"<"}</Text>
      </Pressable>
      <AccountScreen />
    </View>
  );
}

function HomePageContent() {
  return (
    <SafeAreaProvider style={Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight } : {}}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="HomeTabs">
            {props => <HomeTabs {...props} />}
          </Stack.Screen>
          <Stack.Screen name="AccountPage" component={AccountPage} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function HomePage() {
  useEffect(() => { requestPermission(); }, []);

  return (
    <StoreProvider>
      <HomePageContent />
    </StoreProvider>
  );
}
