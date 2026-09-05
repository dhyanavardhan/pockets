import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money, alt } from '../lib/money';
import { normal, goalTotal } from '../lib/calc';
import { T, Donut } from './ui';

// Balance card plus the allocation bar. Shown above every tab, because it is
// the one number the whole app is derived from.
export default function Header({ onEdit }) {
  const { S } = useStore();
  const nm = normal(S), over = nm < 0, gt = goalTotal(S);

  const ago = !S.balanceAt ? 'Not set yet — tap Edit to enter it'
    : (d => d === 0 ? 'Last changed today' : d === 1 ? 'Last changed yesterday' : `Last changed ${d} days ago`)
      (Math.floor((Date.now() - S.balanceAt) / 86400000));

  const segments = S.balance > 0 ? [
    ...S.pockets.filter(p => p.amount > 0).map(p => ({ pct: p.amount / S.balance, color: p.color })),
    ...(nm > 0 ? [{ pct: nm / S.balance, color: C.slate }] : []),
  ] : [];

  return (
    <View style={{ backgroundColor: "white", paddingBottom: 18}}>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 16,
                     flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={T.eyebrow}>Bank balance</Text>
          <Pressable onPress={onEdit} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 34, fontWeight: '500', color: C.ink,
                           borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 2 }}>
              {S.balanceAt ? money(S.balance, 1e8) : '—'}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>
            {S.balanceAt && alt(S.balance, 1e8) ? alt(S.balance, 1e8) + ' · ' : ''}{ago}
          </Text>
        </View>
        <View style={{ marginLeft: 14 }}>
          <Donut segments={segments} size={64} strokeWidth={9} />
        </View>
      </View>

      {over && (
        <View style={{ marginTop: 14, borderWidth: 1, borderLeftWidth: 4, borderColor: C.warn,
                       backgroundColor: '#FBF1EE', padding: 12 }}>
          <Text style={{ fontSize: 13.5, color: C.ink, lineHeight: 19 }}>
            Your goal pockets hold {money(-nm)} more than your balance. Take money out of a pocket,
            or update your balance if it has changed.
          </Text>
        </View>
      )}
    </View>
  );
}
