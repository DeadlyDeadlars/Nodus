import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal, Image, Clipboard, Share, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { CustomAlert } from '../components/CustomAlert';
import { RefreshIcon, TrashIcon, LockIcon, MoonIcon, StorageIcon, UserIcon, SettingsIcon, KeyIcon, NotificationIcon, VideoIcon, QRIcon } from '../components/Icons';

// Placeholders
const storage = { clear: async () => {} };
const testNotification = async () => {};
const smartRouter = { setMode: (m: string) => {}, getMode: () => 'auto' };
type RoutingMode = 'direct' | 'relay' | 'auto';
const rotateKeys = async () => {};
const shouldRotateKeys = () => false;

const AVATAR_OPTIONS = ['◇', '◆', '○', '●', '◎', '◐', '◑', '◒', '◓', '⬡', '⬢', '△', '▲', '□', '■', '☆'];

const SelectModal = ({ visible, title, options, selected, onSelect, onClose, colors, spacing, radius }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>{title}</Text>
        {options.map((opt: any) => (
          <TouchableOpacity key={opt.value} style={[styles.selectOption, { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomColor: colors.border }, selected === opt.value && { backgroundColor: colors.accent + '20' }]} onPress={() => { onSelect(opt.value); onClose(); }}>
            <Text style={[{ color: colors.text, fontSize: 16 }, selected === opt.value && { color: colors.accent, fontWeight: '600' }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent, borderRadius: radius.full, marginTop: spacing.md, paddingVertical: spacing.md }]} onPress={onClose}>
          <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export const SettingsScreen = () => {
  const { colors, spacing, radius } = useTheme();
  const { profile, settings, updateSettings, updateProfile } = useStore();
  
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [densityModalVisible, setDensityModalVisible] = useState(false);
  const [rotateModalVisible, setRotateModalVisible] = useState(false);
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [fakePinModal, setFakePinModal] = useState(false);
  const [panicPinModal, setPanicPinModal] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [editAlias, setEditAlias] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [fakePinInput, setFakePinInput] = useState('');
  const [panicPinInput, setPanicPinInput] = useState('');
  const [videoTestModal, setVideoTestModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [keyRotationModal, setKeyRotationModal] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>([]);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [routingMode, setRoutingMode] = useState<RoutingMode>(smartRouter.getMode());

  const privacyOptions = [
    { value: 'auto', label: 'Авто (P2P + Relay)' },
    { value: 'p2p_only', label: 'Только P2P (быстрее)' },
    { value: 'relay_only', label: 'Только Relay (анонимнее)' },
    { value: 'max_privacy', label: 'Макс. приватность' },
  ];

  const handleRoutingChange = (mode: RoutingMode) => {
    smartRouter.setMode(mode);
    setRoutingMode(mode);
  };

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons || [{ text: 'OK', onPress: () => setAlertVisible(false) }]);
    setAlertVisible(true);
  };

  const clearCache = () => showAlert('Готово', 'Кэш очищен');

  const clearDatabase = () => {
    showAlert('Очистить базу данных', 'ВНИМАНИЕ! Это удалит все данные. Продолжить?', [
      { text: 'Отмена', style: 'cancel', onPress: () => setAlertVisible(false) },
      { text: 'УДАЛИТЬ', style: 'destructive', onPress: () => {
        setAlertVisible(false);
        storage.clearAll();
        setTimeout(() => showAlert('Готово', 'База данных очищена'), 100);
      }}
    ]);
  };

  const logout = () => {
    showAlert('Выход из аккаунта', 'Вы уверены? Все данные будут удалены.', [
      { text: 'Отмена', style: 'cancel', onPress: () => setAlertVisible(false) },
      { text: 'Выйти', style: 'destructive', onPress: () => {
        setAlertVisible(false);
        const { clearAllData } = useStore.getState();
        clearAllData();
        setTimeout(() => showAlert('Готово', 'Выход выполнен'), 100);
      }}
    ]);
  };

  const openProfileEdit = () => {
    setEditAlias(profile?.alias || '');
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setEditAvatar(profile?.avatar || '◇');
    setProfileModalVisible(true);
  };

  const saveProfile = () => {
    updateProfile({
      alias: editAlias.trim() || 'Anonymous',
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || undefined,
      bio: editBio.trim() || undefined,
      avatar: editAvatar,
    });
    setProfileModalVisible(false);
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', maxWidth: 512, maxHeight: 512, quality: 0.8 });
    if (result.assets?.[0]?.uri) {
      setEditAvatar(result.assets[0].uri);
      setAvatarModalVisible(false);
    }
  };

  const copyKey = () => {
    if (profile?.fingerprint) {
      Clipboard.setString(profile.fingerprint);
      showAlert('Скопировано', 'Ключ скопирован в буфер обмена');
    }
  };

  const shareKey = async () => {
    if (profile?.fingerprint) {
      await Share.share({ message: `Мой NODUS ключ:\n${profile.fingerprint}` });
    }
  };

  const togglePin = (enabled: boolean) => {
    if (enabled) {
      setPinInput('');
      setPinConfirm('');
      setPinStep('enter');
      setPinModal(true);
    } else {
      updateSettings({ pinEnabled: false, pinCode: undefined });
    }
  };

  const handlePinInput = (val: string) => {
    if (pinStep === 'enter') {
      setPinInput(val);
      if (val.length === 4) {
        setTimeout(() => { setPinStep('confirm'); setPinConfirm(''); }, 100);
      }
    } else {
      setPinConfirm(val);
      if (val.length === 4) {
        if (val === pinInput) {
          updateSettings({ pinCode: val, pinEnabled: true });
          setPinModal(false);
          showAlert('Готово', 'PIN-код установлен');
        } else {
          showAlert('Ошибка', 'PIN-коды не совпадают');
          setPinStep('enter');
          setPinInput('');
          setPinConfirm('');
        }
      }
    }
  };

  const saveFakePin = () => {
    if (fakePinInput.length >= 4) {
      updateSettings({ fakePin: fakePinInput });
      setFakePinModal(false);
      setFakePinInput('');
      showAlert('Готово', 'Фейковый PIN установлен. При его вводе откроется пустой мессенджер.');
    }
  };

  const savePanicPin = () => {
    if (panicPinInput.length >= 4) {
      updateSettings({ panicPin: panicPinInput });
      setPanicPinModal(false);
      setPanicPinInput('');
      showAlert('Готово', 'Экстренный PIN установлен. При его вводе все данные будут удалены.');
    }
  };

  const handleKeyRotation = async () => {
    setIsRotating(true);
    try {
      const result = await rotateKeys();
      if (result) {
        // Update profile with new public key
        const crypto = require('../services/crypto');
        const newFingerprint = crypto.deriveFingerprint(result.newKeyPair.publicKey);
        updateProfile({ 
          publicKey: result.newKeyPair.publicKey,
          fingerprint: newFingerprint,
        });
        setKeyRotationModal(false);
        showAlert('Ключи обновлены', 
          'Новый fingerprint:\n' + newFingerprint.slice(0, 16) + '...\n\nКонтакты будут уведомлены автоматически.');
      }
    } catch (e) {
      showAlert('Ошибка', 'Не удалось обновить ключи');
    }
    setIsRotating(false);
  };

  const { density } = { density: settings.uiDensity };
  const fontSize = density === 'compact' ? 14 : density === 'comfortable' ? 18 : 16;
  const isCustomAvatar = editAvatar?.startsWith('file://') || editAvatar?.startsWith('content://');
  const profileAvatarIsCustom = profile?.avatar && (profile.avatar.startsWith('file://') || profile.avatar.startsWith('content://') || profile.avatar.startsWith('http') || profile.avatar.startsWith('data:'));
  const profileLetter = (profile?.alias || profile?.username || 'U')[0].toUpperCase();

  const themeOptions = [
    { value: 'dark', label: 'Тёмная' }, 
    { value: 'light', label: 'Светлая' }, 
    { value: 'amoled', label: 'AMOLED' },
    { value: 'midnight', label: 'Midnight' },
    { value: 'stealth', label: 'Stealth' },
    { value: 'hacker', label: 'Hacker' },
  ];
  const densityOptions = [
    { value: 'compact', label: 'Компактная' }, 
    { value: 'normal', label: 'Стандартная' }, 
    { value: 'comfortable', label: 'Просторная' }
  ];

  const getLabel = (options: any[], value: string) => options.find(opt => opt.value === value)?.label || value;

  const Section = ({ title, children }: any) => (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.sm }}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>{children}</View>
    </View>
  );

  const Row = ({ icon, label, value, onPress, danger }: any) => (
    <TouchableOpacity style={[styles.row, { padding: spacing.md, borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ marginRight: spacing.md, width: 28, alignItems: 'center' }}>{icon}</View>
      <Text style={{ flex: 1, color: danger ? colors.error : colors.text, fontSize }}>{label}</Text>
      {value && <Text style={{ color: colors.textSecondary, fontSize: fontSize - 2, marginRight: spacing.sm }}>{value}</Text>}
      {onPress && <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>}
    </TouchableOpacity>
  );

  const Toggle = ({ icon, label, value, onToggle }: any) => (
    <View style={[styles.row, { padding: spacing.md, borderBottomColor: colors.border }]}>
      <View style={{ marginRight: spacing.md, width: 28, alignItems: 'center' }}>{icon}</View>
      <Text style={{ flex: 1, color: colors.text, fontSize }}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.surfaceLight }} thumbColor={colors.text} />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: density === 'compact' ? 24 : 28, fontWeight: '700' }}>Настройки</Text>
      </View>

      <TouchableOpacity style={[styles.profileCard, { margin: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl }]} activeOpacity={0.8} onPress={openProfileEdit}>
        <View style={{ width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {profileAvatarIsCustom ? <Image source={{ uri: profile?.avatar }} style={{ width: 72, height: 72 }} resizeMode="cover" /> : <Text style={{ color: colors.background, fontSize: 32, fontWeight: '700' }}>{profileLetter}</Text>}
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{profile?.alias || 'Anonymous'}</Text>
          {profile?.username && <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>@{profile.username}</Text>}
          {profile?.bio && <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>{profile.bio}</Text>}
          <Text style={{ color: colors.accent, fontSize: 13, marginTop: 8 }}>Нажмите для редактирования</Text>
        </View>
      </TouchableOpacity>

      <Section title="Интерфейс">
        <Row icon={<SettingsIcon size={18} color={colors.accent} />} label="Плотность UI" value={getLabel(densityOptions, settings.uiDensity)} onPress={() => setDensityModalVisible(true)} />
        <Row icon={<MoonIcon size={18} color={colors.accent} />} label="Тема" value={getLabel(themeOptions, settings.theme)} onPress={() => setThemeModalVisible(true)} />
      </Section>

      <Section title="Уведомления">
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Push-уведомления" value={settings.pushNotifications !== false} onToggle={() => updateSettings({ pushNotifications: !settings.pushNotifications })} />
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Звук сообщений" value={settings.notificationSound !== false} onToggle={() => updateSettings({ notificationSound: !settings.notificationSound })} />
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Вибрация" value={settings.notificationVibration !== false} onToggle={() => updateSettings({ notificationVibration: !settings.notificationVibration })} />
        <Toggle icon={<LockIcon size={18} color={colors.accent} />} label="Скрывать содержимое" value={settings.hideNotificationContent === true} onToggle={() => updateSettings({ hideNotificationContent: !settings.hideNotificationContent })} />
      </Section>

      <Section title="Звонки">
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Звук входящего звонка" value={settings.callRingtone !== false} onToggle={() => updateSettings({ callRingtone: !settings.callRingtone })} />
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Гудки при исходящем" value={settings.callRingback !== false} onToggle={() => updateSettings({ callRingback: !settings.callRingback })} />
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Звук завершения" value={settings.callSounds !== false} onToggle={() => updateSettings({ callSounds: !settings.callSounds })} />
        <Row icon={<NotificationIcon size={18} color={colors.accent} />} label="Тест уведомлений" onPress={() => testNotification().then(ok => ok && showAlert('OK', 'Уведомление отправлено'))} />
        <Row icon={<QRIcon size={18} color={colors.accent} />} label="Мой QR код" onPress={() => setQrModal(true)} />
        <Row icon={<VideoIcon size={18} color={colors.accent} />} label="Тест видео" onPress={() => setVideoTestModal(true)} />
      </Section>

      <Section title="Безопасность">
        <Toggle icon={<LockIcon size={18} color={colors.accent} />} label="PIN-код" value={settings.pinEnabled} onToggle={togglePin} />
        <Row icon={<LockIcon size={18} color={colors.textSecondary} />} label="Фейковый PIN" value={settings.fakePin ? '••••' : 'Не установлен'} onPress={() => setFakePinModal(true)} />
        <Row icon={<LockIcon size={18} color={colors.error} />} label="Экстренный PIN" value={settings.panicPin ? '••••' : 'Не установлен'} onPress={() => setPanicPinModal(true)} />
        <Row icon={<KeyIcon size={18} color={colors.accent} />} label="Мой ключ входа" onPress={() => setKeyModalVisible(true)} />
        <Row icon={<RefreshIcon size={18} color={colors.warning || '#FFA500'} />} label="Сменить ключи" value={shouldRotateKeys() ? 'Рекомендуется' : ''} onPress={() => setKeyRotationModal(true)} />
      </Section>

      <Section title="Приватность">
        <Row icon={<LockIcon size={18} color={colors.accent} />} label="Режим роутинга" value={privacyOptions.find(o => o.value === routingMode)?.label} onPress={() => setPrivacyModalVisible(true)} />
      </Section>

      <Section title="Данные">
        <Row icon={<StorageIcon size={18} color={colors.accent} />} label="Очистить кэш" onPress={clearCache} />
        <Row icon={<TrashIcon size={18} color={colors.error} />} label="Очистить базу данных" onPress={clearDatabase} danger />
        <Row icon={<UserIcon size={18} color={colors.error} />} label="Выйти из аккаунта" onPress={logout} danger />
      </Section>

      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} buttons={alertButtons} onClose={() => setAlertVisible(false)} />

      <SelectModal visible={themeModalVisible} title="Выберите тему" options={themeOptions} selected={settings.theme} onSelect={(theme: any) => updateSettings({ theme })} onClose={() => setThemeModalVisible(false)} colors={colors} spacing={spacing} radius={radius} />
      <SelectModal visible={densityModalVisible} title="Плотность интерфейса" options={densityOptions} selected={settings.uiDensity} onSelect={(uiDensity: any) => updateSettings({ uiDensity })} onClose={() => setDensityModalVisible(false)} colors={colors} spacing={spacing} radius={radius} />
      <SelectModal visible={privacyModalVisible} title="Режим роутинга" options={privacyOptions} selected={routingMode} onSelect={handleRoutingChange} onClose={() => setPrivacyModalVisible(false)} colors={colors} spacing={spacing} radius={radius} />

      {/* Модалка ключа */}
      <Modal visible={keyModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Ваш ключ входа</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.md, textAlign: 'center' }}>Сохраните этот ключ для восстановления аккаунта</Text>
            <View style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: 'monospace', textAlign: 'center' }} selectable>{profile?.fingerprint}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.full, padding: spacing.md }} onPress={copyKey}>
                <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Копировать</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.full, padding: spacing.md }} onPress={shareKey}>
                <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Поделиться</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ marginTop: spacing.md, padding: spacing.md }} onPress={() => setKeyModalVisible(false)}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Создание PIN */}
      <Modal visible={pinModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' }}>
              {pinStep === 'enter' ? 'Создайте PIN' : 'Подтвердите PIN'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' }}>
              {pinStep === 'enter' ? 'Введите 4-значный PIN-код' : 'Введите PIN-код ещё раз'}
            </Text>
            <TextInput 
              style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: spacing.md }} 
              value={pinStep === 'enter' ? pinInput : pinConfirm} 
              onChangeText={handlePinInput} 
              placeholder="••••" 
              placeholderTextColor={colors.textSecondary} 
              keyboardType="number-pad" 
              maxLength={4} 
              secureTextEntry 
              autoFocus
            />
            <TouchableOpacity style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.full, padding: spacing.md }} onPress={() => { setPinModal(false); setPinInput(''); setPinConfirm(''); }}>
              <Text style={{ color: colors.text, textAlign: 'center' }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Фейковый PIN */}
      <Modal visible={fakePinModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' }}>Фейковый PIN</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' }}>При вводе этого PIN откроется пустой мессенджер без ваших данных</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: spacing.md }} value={fakePinInput} onChangeText={setFakePinInput} placeholder="••••" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={6} secureTextEntry />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.full, padding: spacing.md }} onPress={() => { setFakePinModal(false); setFakePinInput(''); }}>
                <Text style={{ color: colors.text, textAlign: 'center' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.full, padding: spacing.md }} onPress={saveFakePin}>
                <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
            {settings.fakePin && (
              <TouchableOpacity style={{ marginTop: spacing.md }} onPress={() => { updateSettings({ fakePin: undefined }); setFakePinModal(false); showAlert('Готово', 'Фейковый PIN удалён'); }}>
                <Text style={{ color: colors.error, textAlign: 'center' }}>Удалить фейковый PIN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Экстренный PIN */}
      <Modal visible={panicPinModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.error, fontSize: 20, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' }}>⚠️ Экстренный PIN</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' }}>ВНИМАНИЕ! При вводе этого PIN все данные будут БЕЗВОЗВРАТНО удалены!</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: spacing.md }} value={panicPinInput} onChangeText={setPanicPinInput} placeholder="••••" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={6} secureTextEntry />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.full, padding: spacing.md }} onPress={() => { setPanicPinModal(false); setPanicPinInput(''); }}>
                <Text style={{ color: colors.text, textAlign: 'center' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: colors.error, borderRadius: radius.full, padding: spacing.md }} onPress={savePanicPin}>
                <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Установить</Text>
              </TouchableOpacity>
            </View>
            {settings.panicPin && (
              <TouchableOpacity style={{ marginTop: spacing.md }} onPress={() => { updateSettings({ panicPin: undefined }); setPanicPinModal(false); showAlert('Готово', 'Экстренный PIN удалён'); }}>
                <Text style={{ color: colors.error, textAlign: 'center' }}>Удалить экстренный PIN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Модалка редактирования профиля */}
      <Modal visible={profileModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}><Text style={{ color: colors.accent, fontSize: 16 }}>Отмена</Text></TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Редактировать профиль</Text>
            <TouchableOpacity onPress={saveProfile}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>Готово</Text></TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {isCustomAvatar ? <Image source={{ uri: editAvatar }} style={{ width: 100, height: 100 }} resizeMode="cover" /> : <Text style={{ color: colors.background, fontSize: 40, fontWeight: '700' }}>{editAvatar}</Text>}
              </View>
            </TouchableOpacity>
            <Text style={{ color: colors.accent, fontSize: 14, marginTop: spacing.sm }}>Изменить фото</Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>ИМЯ</Text>
            <TextInput style={{ color: colors.text, fontSize: 16, paddingVertical: spacing.sm }} value={editAlias} onChangeText={setEditAlias} placeholder="Введите имя" placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>НИКНЕЙМ</Text>
            <TextInput style={{ color: colors.text, fontSize: 16, paddingVertical: spacing.sm }} value={editUsername} onChangeText={setEditUsername} placeholder="username" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>О СЕБЕ</Text>
            <TextInput style={{ color: colors.text, fontSize: 16, paddingVertical: spacing.sm }} value={editBio} onChangeText={setEditBio} placeholder="Расскажите о себе" placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} />
          </View>
        </View>
      </Modal>

      {/* Модалка выбора аватара */}
      <Modal visible={avatarModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity onPress={() => setAvatarModalVisible(false)}><Text style={{ color: colors.accent, fontSize: 16 }}>Отмена</Text></TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Выбрать аватар</Text>
            <View style={{ width: 50 }} />
          </View>
          <TouchableOpacity style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md }} onPress={pickImage}>
            <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center' }}>Выбрать из галереи</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing.md, textAlign: 'center' }}>Или выберите символ:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {AVATAR_OPTIONS.map((avatar) => (
              <TouchableOpacity key={avatar} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: editAvatar === avatar ? colors.accent : colors.surface, justifyContent: 'center', alignItems: 'center', margin: spacing.sm }} onPress={() => { setEditAvatar(avatar); setAvatarModalVisible(false); }}>
                <Text style={{ fontSize: 24, color: editAvatar === avatar ? colors.background : colors.text }}>{avatar}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Модальное окно тестирования видео */}
      {React.createElement(require('../components/QRContactShare').QRContactShare, {
        visible: qrModal,
        onClose: () => setQrModal(false)
      })}

      <Modal visible={videoTestModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Тест видеосообщений</Text>
            
            <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
              {/* Импортируем компонент видео */}
              {React.createElement(require('../components/CircleVideoMessage').CircleVideoMessage, {
                uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                duration: 30,
                size: 150,
                onLongPress: () => showAlert('Видео', 'Длинное нажатие работает!')
              })}
            </View>
            
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg }}>
              Нажмите на видео для воспроизведения/паузы
            </Text>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: spacing.md }]} 
              onPress={() => setVideoTestModal(false)}
            >
              <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модалка ротации ключей */}
      <Modal visible={keyRotationModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Смена ключей</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg }}>
              Ротация ключей повышает безопасность. Рекомендуется выполнять каждые 30 дней.{'\n\n'}
              После смены ключей ваши контакты получат уведомление о новом ключе.
            </Text>
            {isRotating ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: spacing.lg }} />
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: colors.warning || '#FFA500', borderRadius: radius.full, paddingVertical: spacing.md, marginBottom: spacing.sm }]} 
                  onPress={handleKeyRotation}
                >
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Сменить ключи</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: colors.surfaceLight, borderRadius: radius.full, paddingVertical: spacing.md }]} 
                  onPress={() => setKeyRotationModal(false)}
                >
                  <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Отмена</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modal: { maxHeight: '80%' },
  selectOption: { borderBottomWidth: StyleSheet.hairlineWidth },
  modalButton: { alignItems: 'center' },
});
