import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';

export const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const { colors, spacing, radius } = useTheme();
  const { settings } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(false);
    
    if (newPin.length === 4) {
      if (newPin === settings.pinCode) {
        Vibration.vibrate(50);
        onUnlock();
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
        setError(true);
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const dots = [0, 1, 2, 3].map(i => (
    <View key={i} style={[styles.dot, { borderColor: error ? colors.error : colors.accent, backgroundColor: i < pin.length ? (error ? colors.error : colors.accent) : 'transparent' }]} />
  ));

  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Введите PIN-код</Text>
      <View style={styles.dots}>{dots}</View>
      {error && <Text style={[styles.error, { color: colors.error }]}>Неверный PIN</Text>}
      <View style={styles.keypad}>
        {nums.map((n, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, { backgroundColor: n ? colors.surface : 'transparent', borderRadius: radius.full }]}
            onPress={() => n === '⌫' ? handleDelete() : n && handlePress(n)}
            disabled={!n}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 30 },
  dots: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { fontSize: 14, marginBottom: 20 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 70, height: 70, margin: 8, justifyContent: 'center', alignItems: 'center' },
  keyText: { fontSize: 28 },
});
