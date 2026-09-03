import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, F } from '../theme';
import { useStore } from '../store';
import { money, alt } from '../lib/money';
import { normal, goalTotal } from '../lib/calc';
import { T } from './ui';

// Balance card plus the allocation bar. Shown above every tab, because it is
// the one number the whole app is derived from.
export default function Header({ onEdit }) {
  const { S } = useStore();
  const nm = normal(S), over = nm < 0, gt = goalTotal(S);

  const ago = !S.balanceAt ? 'Not set yet — tap Edit to enter it'
    : (d => d === 0 ? 'Last changed today' : d === 1 ? 'Last changed yesterday' : `Last changed ${d} days ago`)
      (Math.floor((Date.now() - S.balanceAt) / 86400000));

  return (
    <View style={{ backgroundColor: "white", paddingBottom: 18}}>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={T.eyebrow}>Bank balance</Text>
          <Pressable onPress={onEdit}
            style={{ backgroundColor: C.ink, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12.5 }}>Edit balance</Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: F.mono, fontSize: 34, fontWeight: '500', color: C.ink, marginTop: 8 }}>
          {S.balanceAt ? money(S.balance) : '—'}
        </Text>
        <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>
          {S.balanceAt && alt(S.balance) ? alt(S.balance) + ' · ' : ''}{ago}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', height: 30, borderRadius: 5, overflow: 'hidden',
                     borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 18 }}>
        {S.balance > 0 && S.pockets.filter(p => p.amount > 0).map(p => (
          <View key={p.id} style={{ backgroundColor: p.color,
            width: `${Math.min(100, (p.amount / S.balance) * 100)}%` }} />
        ))}
        {S.balance > 0 && nm > 0 && (
          <View style={{ backgroundColor: C.slate, width: `${(nm / S.balance) * 100}%` }} />
        )}
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
