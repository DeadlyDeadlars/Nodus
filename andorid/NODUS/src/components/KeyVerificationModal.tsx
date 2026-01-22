import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Share, Alert } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
// TODO: Replace with actual key verification service
const generateSafetyNumber = (key1: string, key2: string) => '12345';
const formatSafetyNumber = (number: string) => ['12345', '67890', '11111'];
const generateQRData = (id: string, key: string, username?: string) => 'placeholder-qr-data';
const parseQRData = (data: string) => ({ id: '', key: '', username: '' });
const markKeyAsVerified = (peerId: string, key: string) => {};
const isKeyVerified = (peerId: string, key: string) => false;
const generateEmojiFingerprint = (key: string) => '🔐🛡️🔑';
import { BackIcon, CheckIcon, ShieldIcon, CopyClipboardIcon, ShareExternalIcon, WarningIcon } from '../components/Icons';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  visible: boolean;
  onClose: () => void;
  peerId: string;
  peerName: string;
  peerPublicKey: string;
}

export const KeyVerificationModal = ({ visible, onClose, peerId, peerName, peerPublicKey }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const { profile } = useStore();
  const [tab, setTab] = useState<'safety' | 'qr'>('safety');
  const [isVerified, setIsVerified] = useState(false);
  const [keyChanged, setKeyChanged] = useState(false);

  const myPublicKey = profile?.publicKey || '';
  const safetyNumber = generateSafetyNumber(myPublicKey, peerPublicKey);
  const formattedNumber = formatSafetyNumber(safetyNumber);
  const qrData = generateQRData(profile?.fingerprint || '', myPublicKey, profile?.username);
  const emojiFingerprint = generateEmojiFingerprint(peerPublicKey);

  useEffect(() => {
    setIsVerified(isKeyVerified(peerId, peerPublicKey));
    setKeyChanged(false); // Simplified - always false
  }, [peerId, peerPublicKey]);

  const handleVerify = () => {
    markKeyAsVerified(peerId, peerPublicKey);
    setIsVerified(true);
    setKeyChanged(false);
    Alert.alert('Ключ верифицирован', `Ключ ${peerName} отмечен как проверенный`);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Safety Number с ${peerName}:\n\n${formattedNumber.join('\n')}`
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: spacing.md }}>
              <BackIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Верификация ключа</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{peerName}</Text>
            </View>
            {isVerified && <ShieldIcon size={24} color={colors.online} />}
          </View>

          {/* Warning if key changed */}
          {keyChanged && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error + '20', padding: spacing.md, margin: spacing.md, borderRadius: radius.lg }}>
              <WarningIcon size={24} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: spacing.sm, flex: 1 }}>
                Ключ изменился! Возможна атака MITM. Проверьте ключ лично.
              </Text>
            </View>
          )}

          {/* Tabs */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }}>
            <TouchableOpacity 
              style={{ flex: 1, padding: spacing.md, borderBottomWidth: 2, borderBottomColor: tab === 'safety' ? colors.accent : 'transparent' }}
              onPress={() => setTab('safety')}
            >
              <Text style={{ color: tab === 'safety' ? colors.accent : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Safety Number</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, padding: spacing.md, borderBottomWidth: 2, borderBottomColor: tab === 'qr' ? colors.accent : 'transparent' }}
              onPress={() => setTab('qr')}
            >
              <Text style={{ color: tab === 'qr' ? colors.accent : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>QR-код</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: spacing.lg }}>
            {tab === 'safety' ? (
              <>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 }}>
                  Сравните эти числа с числами на устройстве {peerName}. Если они совпадают — соединение защищено.
                </Text>

                {/* Emoji fingerprint */}
                <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                  <Text style={{ fontSize: 32, letterSpacing: 4 }}>{emojiFingerprint}</Text>
                </View>

                {/* Safety number grid */}
                <View style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
                  {formattedNumber.map((line, i) => (
                    <Text key={i} style={{ color: colors.text, fontSize: 18, fontFamily: 'monospace', textAlign: 'center', marginVertical: 4, letterSpacing: 2 }}>
                      {line}
                    </Text>
                  ))}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                  <TouchableOpacity 
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: spacing.md, borderRadius: radius.lg }}
                    onPress={handleShare}
                  >
                    <ShareExternalIcon size={18} color={colors.accent} />
                    <Text style={{ color: colors.accent, marginLeft: spacing.sm }}>Поделиться</Text>
                  </TouchableOpacity>
                </View>

                {!isVerified && (
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' }}
                    onPress={handleVerify}
                  >
                    <Text style={{ color: colors.background, fontWeight: '600' }}>Отметить как проверенный</Text>
                  </TouchableOpacity>
                )}

                {isVerified && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md }}>
                    <CheckIcon size={20} color={colors.online} />
                    <Text style={{ color: colors.online, marginLeft: spacing.sm }}>Ключ верифицирован</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 }}>
                  Покажите этот QR-код собеседнику для сканирования, или отсканируйте его код.
                </Text>

                {/* QR Code */}
                <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.lg }}>
                  <QRCode value={qrData} size={200} />
                </View>

                <TouchableOpacity 
                  style={{ backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' }}
                  onPress={() => Alert.alert('Сканер', 'Функция сканирования QR будет добавлена')}
                >
                  <Text style={{ color: colors.background, fontWeight: '600' }}>Сканировать QR-код</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          <View style={{ height: 40 }} />
        </View>
      </View>
    </Modal>
  );
};
