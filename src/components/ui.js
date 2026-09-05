import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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

export function Sheet({ visible, onClose, children, loading, loadingLabel }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={loading ? undefined : onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(23,28,36,0.42)' }} onPress={loading ? undefined : onClose} />
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 14, borderTopRightRadius: 14,
                     paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30, maxHeight: '88%' }}>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {loading ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                         backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center',
                         borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
            <ActivityIndicator size="large" color={C.ink} />
            {loadingLabel ? (
              <Text style={{ marginTop: 10, fontSize: 13, color: C.muted, fontWeight: '600' }}>{loadingLabel}</Text>
            ) : null}
          </View>
        ) : null}
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

// segments: [{ pct: 0..1, color }]. Each pct is a fraction of the full
// circle, measured independently (mirrors how the old occupancy bar sized
// each slice off the same total) so over-allocated segments can overlap.
export function Donut({ size = 64, strokeWidth = 9, segments = [], trackColor = C.line }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      {segments.map((seg, i) => {
        const length = Math.max(0, Math.min(1, seg.pct)) * circumference;
        const dashoffset = -offset;
        offset += length;
        return (
          <Circle key={i} cx={size / 2} cy={size / 2} r={radius}
            stroke={seg.color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashoffset} />
        );
      })}
    </Svg>
  );
}

export function PersonCircleIcon({ size = 26, color = C.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M9.5 9.5C9.5 8.11875 10.6188 7 12 7C13.3813 7 14.5 8.11875 14.5 9.5C14.5 10.8813 13.3813 12 12 12C10.6188 12 9.5 10.8813 9.5 9.5ZM12 8.25C12.6875 8.25 13.25 8.8125 13.25 9.5C13.25 10.1875 12.6875 10.75 12 10.75C11.3125 10.75 10.75 10.1875 10.75 9.5C10.75 8.8125 11.3125 8.25 12 8.25Z" />
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M12 13.25C10.3313 13.25 7 14.0875 7 15.75V17H17V15.75C17 14.0875 13.6688 13.25 12 13.25ZM12 14.5C13.6875 14.5 15.625 15.3063 15.75 15.75H8.25C8.39375 15.3 10.3188 14.5 12 14.5Z" />
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" />
    </Svg>
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
