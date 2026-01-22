import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const CustomAlert = ({ visible, title, message, buttons, onClose }: CustomAlertProps) => {
  const { colors, spacing, radius } = useTheme();
  const btns = buttons?.length ? buttons : [{ text: 'OK', onPress: onClose }];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message && <Text style={[styles.message, { color: colors.textSecondary }]} selectable>{message}</Text>}
          <View style={[styles.buttons, { marginTop: spacing.lg, gap: spacing.sm }]}>
            {btns.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.btn, { backgroundColor: btn.style === 'destructive' ? colors.error : btn.style === 'cancel' ? colors.surfaceLight : colors.accent, borderRadius: radius.full, paddingVertical: spacing.md }]}
                onPress={() => { btn.onPress?.(); onClose(); }}
              >
                <Text style={{ color: btn.style === 'cancel' ? colors.text : colors.background, fontWeight: '600', textAlign: 'center' }}>{btn.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 320 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  buttons: { flexDirection: 'column' },
  btn: { paddingHorizontal: 16 },
});
