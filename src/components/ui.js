import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, F } from '../theme';
import { UNITS, splitAmount, joinAmount, exact } from '../lib/money';
import { fmtDate, iso } from '../lib/dates';

export const T = StyleSheet.create({
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.muted, fontWeight: '600' },
  h3:      { fontSize: 19, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  hint:    { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
  label:   { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted, fontWeight: '600', marginTop: 18, marginBottom: 7 },
  fig:     { fontFamily: F.mono, fontSize: 17, fontWeight: '500', color: C.ink },
  note:    { fontSize: 12, color: C.muted, lineHeight: 17 },
  err:     { fontSize: 12.5, color: C.warn, marginTop: 8, minHeight: 16 },
  card:    { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 15, marginBottom: 10 },
  group:   { fontSize: 13.5, fontWeight: '700', color: C.muted, marginTop: 18, marginBottom: 9 },
});

export function Btn({ label, onPress, kind = 'plain', disabled, style }) {
  const bg = kind === 'dark' ? C.ink : C.card;
  const fg = kind === 'dark' ? '#fff' : kind === 'danger' ? C.warn : C.ink;
  const bd = kind === 'dark' ? C.ink : kind === 'danger' ? C.warn : C.line;
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={[{ flex: 1, paddingVertical: 11, borderRadius: 7, borderWidth: 1,
                borderColor: bd, backgroundColor: bg, opacity: disabled ? 0.4 : 1,
                alignItems: 'center' }, style]}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 13.5 }}>{label}</Text>
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(23,28,36,0.42)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 14, borderTopRightRadius: 14,
                     paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30, maxHeight: '88%' }}>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function Field({ value, onChangeText, placeholder, ...rest }) {
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={C.muted}
      style={{ borderWidth: 1, borderColor: C.line, borderRadius: 7, backgroundColor: '#FAFBFC',
               paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: C.ink }}
      {...rest}
    />
  );
}

// Number plus a unit picker. Never pre-fills a unit that would round the value.
export function AmountField({ value, onChange, placeholder = '0', compact }) {
  const init = splitAmount(value || 0);
  const [text, setText] = useState(init.n);
  const [unit, setUnit] = useState(init.u);

  const push = (t, u) => { onChange(joinAmount(t, u)); };
  const parsed = joinAmount(text, unit);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text} keyboardType="decimal-pad" placeholder={placeholder}
          placeholderTextColor={C.muted}
          onChangeText={t => { setText(t); push(t, unit); }}
          style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 7,
                   backgroundColor: '#FAFBFC', paddingHorizontal: 12,
                   paddingVertical: compact ? 9 : 11,
                   fontSize: compact ? 16 : 19, fontFamily: F.mono, color: C.ink }}
        />
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.line,
                       borderRadius: 7, overflow: 'hidden' }}>
          {UNITS.map(u => (
            <Pressable key={u.v} onPress={() => { setUnit(u.v); push(text, u.v); }}
              style={{ paddingHorizontal: compact ? 7 : 9, justifyContent: 'center',
                       backgroundColor: unit === u.v ? C.ink : '#FAFBFC' }}>
              <Text style={{ fontSize: 11, fontWeight: '700',
                             color: unit === u.v ? '#fff' : C.muted }}>
                {u.v === 1 ? '₹' : u.v === 1000 ? 'k' : u.v === 100000 ? 'L' : 'Cr'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={{ fontFamily: F.mono, fontSize: 12.5, color: C.muted, marginTop: 6, minHeight: 16 }}>
        {text.trim() === '' ? '' : isNaN(parsed) ? 'Enter numbers only' : exact(parsed)}
      </Text>
    </View>
  );
}

export function DateField({ value, onChange, allowClear }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen(true)}
        style={{ borderWidth: 1, borderColor: C.line, borderRadius: 7, backgroundColor: '#FAFBFC',
                 paddingHorizontal: 12, paddingVertical: 13 }}>
        <Text style={{ fontSize: 15, color: value ? C.ink : C.muted }}>
          {value ? fmtDate(value) : 'No date'}
        </Text>
      </Pressable>
      {allowClear && value ? (
        <Pressable onPress={() => onChange(null)}>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Clear date</Text>
        </Pressable>
      ) : null}
      {open && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (d) onChange(iso(d));
            if (Platform.OS === 'ios' && e.type === 'set') setOpen(false);
          }}
        />
      )}
    </View>
  );
}

export function Toggle({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
      {options.map(o => (
        <Pressable key={o.v} onPress={() => onChange(o.v)}
          style={{ flex: 1, paddingVertical: 11, borderRadius: 7, borderWidth: 1, alignItems: 'center',
                   borderColor: value === o.v ? C.ink : C.line,
                   backgroundColor: value === o.v ? C.ink : C.card }}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: value === o.v ? '#fff' : C.muted }}>
            {o.l}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Empty({ title, body }) {
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed',
                   borderRadius: 10, padding: 24, alignItems: 'center' }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{title}</Text>
      <Text style={{ fontSize: 13.5, color: C.muted, lineHeight: 20, marginTop: 6, textAlign: 'center' }}>{body}</Text>
    </View>
  );
}
