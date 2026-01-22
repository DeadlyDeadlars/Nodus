/**
 * QR код для обмена контактами - генерация и сканирование
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Share, Vibration } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { CloseIcon, ShareIcon, CameraIcon, QRIcon } from './Icons';

interface QRData {
  type: 'nodus_contact';
  v: number;
  id: string;           // fingerprint
  pk?: string;          // publicKey
  name?: string;
  username?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onContactScanned?: (data: QRData) => void;
}

export const QRContactShare: React.FC<Props> = ({ visible, onClose, onContactScanned }) => {
  const { colors, spacing, radius } = useTheme();
  const { profile, addChat, chats } = useStore();
  const [mode, setMode] = useState<'show' | 'scan'>('show');
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  
  const device = useCameraDevice('back');

  useEffect(() => {
    if (mode === 'scan') {
      Camera.requestCameraPermission().then(status => {
        setHasPermission(status === 'granted');
      });
    }
  }, [mode]);

  // QR data to encode
  const qrData: QRData = {
    type: 'nodus_contact',
    v: 1,
    id: profile?.fingerprint || '',
    pk: profile?.publicKey,
    name: profile?.alias,
    username: profile?.username,
  };

  const qrValue = JSON.stringify(qrData);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (scanned || codes.length === 0) return;
      
      const code = codes[0];
      if (!code.value) return;

      try {
        const data = JSON.parse(code.value) as QRData;
        
        if (data.type !== 'nodus_contact' || !data.id) {
          Alert.alert('Ошибка', 'Неверный QR-код');
          return;
        }

        if (data.id === profile?.fingerprint) {
          Alert.alert('Ошибка', 'Это ваш собственный QR-код');
          return;
        }

        setScanned(true);
        Vibration.vibrate(100);

        // Check if contact exists
        const existing = chats.find(c => c.fingerprint === data.id || c.peerId === data.id);
        
        if (existing) {
          Alert.alert('Контакт найден', `${data.name || data.id.slice(0, 8)} уже в ваших контактах`, [
            { text: 'OK', onPress: () => { setScanned(false); onClose(); } }
          ]);
          return;
        }

        // Add new contact
        Alert.alert(
          'Добавить контакт?',
          `${data.name || 'Пользователь'}\n${data.username ? '@' + data.username : data.id.slice(0, 16) + '...'}`,
          [
            { text: 'Отмена', style: 'cancel', onPress: () => setScanned(false) },
            { 
              text: 'Добавить', 
              onPress: () => {
                const newChat = {
                  id: `chat_${Date.now()}`,
                  peerId: data.id,
                  fingerprint: data.id,
                  publicKey: data.pk,
                  alias: data.name,
                  username: data.username,
                  isOnline: false,
                  messages: [],
                };
                addChat(newChat);
                onContactScanned?.(data);
                setScanned(false);
                onClose();
                Alert.alert('Готово', 'Контакт добавлен');
              }
            }
          ]
        );
      } catch {
        Alert.alert('Ошибка', 'Не удалось прочитать QR-код');
        setScanned(false);
      }
    },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Добавь меня в NODUS!\n\nID: ${profile?.fingerprint}\nИмя: ${profile?.alias || 'Пользователь'}`,
        title: 'Мой контакт NODUS',
      });
    } catch { /* silent */ }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {mode === 'show' ? 'Мой QR-код' : 'Сканировать'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <CloseIcon size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode tabs */}
          <View style={[styles.tabs, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]}>
            <TouchableOpacity 
              style={[styles.tab, mode === 'show' && { backgroundColor: colors.accent }]}
              onPress={() => setMode('show')}
            >
              <QRIcon size={18} color={mode === 'show' ? colors.background : colors.textSecondary} />
              <Text style={{ color: mode === 'show' ? colors.background : colors.textSecondary, marginLeft: 6, fontWeight: '600' }}>
                Мой код
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, mode === 'scan' && { backgroundColor: colors.accent }]}
              onPress={() => { setMode('scan'); setScanned(false); }}
            >
              <CameraIcon size={18} color={mode === 'scan' ? colors.background : colors.textSecondary} />
              <Text style={{ color: mode === 'scan' ? colors.background : colors.textSecondary, marginLeft: 6, fontWeight: '600' }}>
                Сканировать
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {mode === 'show' ? (
            <View style={styles.qrSection}>
              <View style={[styles.qrWrapper, { backgroundColor: '#fff', borderRadius: radius.lg }]}>
                <QRCode
                  value={qrValue}
                  size={200}
                  backgroundColor="#fff"
                  color="#000"
                  logo={undefined}
                />
              </View>

              <Text style={[styles.name, { color: colors.text }]}>
                {profile?.alias || 'Пользователь'}
              </Text>
              
              {profile?.username && (
                <Text style={[styles.username, { color: colors.accent }]}>
                  @{profile.username}
                </Text>
              )}

              <Text style={[styles.fingerprint, { color: colors.textSecondary }]}>
                {profile?.fingerprint?.slice(0, 8)}...{profile?.fingerprint?.slice(-8)}
              </Text>

              <TouchableOpacity 
                style={[styles.shareBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]}
                onPress={handleShare}
              >
                <ShareIcon size={18} color={colors.background} />
                <Text style={{ color: colors.background, marginLeft: 8, fontWeight: '600' }}>
                  Поделиться
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scanSection}>
              {hasPermission && device ? (
                <View style={[styles.cameraWrapper, { borderRadius: radius.lg }]}>
                  <Camera
                    style={styles.camera}
                    device={device}
                    isActive={visible && mode === 'scan' && !scanned}
                    codeScanner={codeScanner}
                  />
                  <View style={styles.scanOverlay}>
                    <View style={[styles.scanCorner, styles.topLeft, { borderColor: colors.accent }]} />
                    <View style={[styles.scanCorner, styles.topRight, { borderColor: colors.accent }]} />
                    <View style={[styles.scanCorner, styles.bottomLeft, { borderColor: colors.accent }]} />
                    <View style={[styles.scanCorner, styles.bottomRight, { borderColor: colors.accent }]} />
                  </View>
                </View>
              ) : (
                <View style={[styles.noCamera, { backgroundColor: colors.surfaceLight, borderRadius: radius.lg }]}>
                  <CameraIcon size={48} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>
                    {hasPermission ? 'Камера недоступна' : 'Нет доступа к камере'}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.permBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]}
                    onPress={() => Camera.requestCameraPermission()}
                  >
                    <Text style={{ color: colors.background, fontWeight: '600' }}>Разрешить</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <Text style={[styles.scanHint, { color: colors.textSecondary }]}>
                Наведите камеру на QR-код контакта
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 360, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  tabs: { flexDirection: 'row', padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 20 },
  qrSection: { alignItems: 'center' },
  qrWrapper: { padding: 16, marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  username: { fontSize: 14, marginTop: 4 },
  fingerprint: { fontSize: 12, fontFamily: 'monospace', marginTop: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  scanSection: { alignItems: 'center' },
  cameraWrapper: { width: 260, height: 260, overflow: 'hidden', position: 'relative' },
  camera: { width: '100%', height: '100%' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scanCorner: { position: 'absolute', width: 30, height: 30, borderWidth: 3 },
  topLeft: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },
  noCamera: { width: 260, height: 260, justifyContent: 'center', alignItems: 'center' },
  permBtn: { paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 },
  scanHint: { fontSize: 14, marginTop: 16, textAlign: 'center' },
});

export default QRContactShare;
