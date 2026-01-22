import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Animated } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';

interface PinScreenProps {
  mode: 'set' | 'verify' | 'change';
  onSuccess: (pin?: string, type?: 'normal' | 'fake' | 'panic') => void;
  onCancel?: () => void;
  fakePin?: string;
  panicPin?: string;
}

export const PinScreen = ({ mode, onSuccess, onCancel, fakePin, panicPin }: PinScreenProps) => {
  const { colors, spacing, radius } = useTheme();
  const { settings, updateSettings } = useStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const shakeAnim = useState(new Animated.Value(0))[0];

  const shake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      setTimeout(() => {
        if (mode === 'verify') {
          if (panicPin && newPin === panicPin) {
            onSuccess(newPin, 'panic');
          } else if (fakePin && newPin === fakePin) {
            onSuccess(newPin, 'fake');
          } else if (newPin === settings.pinCode) {
            onSuccess(newPin, 'normal');
          } else {
            shake();
            setError('Неверный PIN');
            setPin('');
          }
        } else if (mode === 'set' || mode === 'change') {
          if (step === 'enter') {
            setConfirmPin(newPin);
            setPin('');
            setStep('confirm');
          } else {
            if (newPin === confirmPin) {
              updateSettings({ pinCode: newPin, pinEnabled: true });
              onSuccess();
            } else {
              shake();
              setError('PIN не совпадает');
              setPin('');
              setStep('enter');
              setConfirmPin('');
            }
          }
        }
      }, 100);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const title = mode === 'verify' ? 'Введите PIN' : step === 'enter' ? 'Создайте PIN' : 'Подтвердите PIN';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, { borderColor: colors.accent, backgroundColor: i < pin.length ? colors.accent : 'transparent' }]} />
        ))}
      </Animated.View>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, { backgroundColor: key ? colors.surface : 'transparent' }]}
            onPress={() => key === '⌫' ? handleDelete() : key ? handlePress(key) : null}
            disabled={!key}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={{ color: colors.textSecondary }}>Отмена</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 40 },
  dotsContainer: { flexDirection: 'row', marginBottom: 20 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, marginHorizontal: 8 },
  error: { fontSize: 14, marginBottom: 20 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center' },
  key: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', margin: 10 },
  keyText: { fontSize: 28 },
  cancelBtn: { marginTop: 30, padding: 10 },
});
