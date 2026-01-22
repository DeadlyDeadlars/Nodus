import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Image, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { TrustedRelay } from '../types';
import { PaletteIcon, ChatBubbleIcon, ClockIcon, WifiIcon, ShieldIcon, TrashIcon, StorageIcon, InfoIcon, GlobeIcon, SettingsIcon, NotificationIcon, PrivacyIcon, HelpIcon, EditIcon, CheckIcon, DoubleCheckIcon, CloseIcon, MegaphoneIcon, WarningIcon, FolderIcon, PlusIcon, RelayIcon, BookmarkIcon } from '../components/Icons';

// Placeholder
const testNotification = async () => {};

const WALLPAPERS = [
  null, // No wallpaper
  '#1a1a2e',
  '#16213e', 
  '#0f3460',
  '#1b262c',
  '#0d1b2a',
  '#1b2838',
  '#2d132c',
  '#1a1a1a',
  '#0a192f',
];

const SelectModal = ({ visible, title, options, selected, onSelect, onClose, colors, spacing, radius }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>{title}</Text>
        {options.map((opt: any) => (
          <TouchableOpacity key={opt.value} style={[styles.selectOption, { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomColor: colors.border }, selected === opt.value && { backgroundColor: colors.accent + '20' }]} onPress={() => { onSelect(opt.value); onClose(); }}>
            <Text style={[{ color: colors.text, fontSize: 16 }, selected === opt.value && { color: colors.accent, fontWeight: '600' }]}>{opt.label}</Text>
            {selected === opt.value && <CheckIcon size={18} color={colors.accent} />}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ paddingVertical: spacing.md }} onPress={onClose}><Text style={{ color: colors.textSecondary, fontWeight: '500', textAlign: 'center' }}>Закрыть</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export const MoreScreen = ({ navigation }: any) => {
  const { colors, spacing, radius, density } = useTheme();
  const { settings, updateSettings, updateChatAppearance, clearAllData, chats, addTrustedRelay, removeTrustedRelay } = useStore();
  const [clearChatsModal, setClearChatsModal] = useState(false);
  const [clearAllModal, setClearAllModal] = useState(false);
  const [relayPolicyModal, setRelayPolicyModal] = useState(false);
  const [addRelayModal, setAddRelayModal] = useState(false);
  const [newRelayName, setNewRelayName] = useState('');
  const [newRelayAddress, setNewRelayAddress] = useState('');
  const [durationModal, setDurationModal] = useState(false);
  const [priorityModal, setPriorityModal] = useState(false);
  const [chatSettingsModal, setChatSettingsModal] = useState(false);
  const [wallpaperModal, setWallpaperModal] = useState(false);
  const [bubbleStyleModal, setBubbleStyleModal] = useState(false);
  const [foldersModal, setFoldersModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fontSize = density === 'compact' ? 14 : density === 'comfortable' ? 18 : 16;
  const { chatAppearance } = settings;

  const durations = [{ label: '5 минут', value: '300' }, { label: '15 минут', value: '900' }, { label: '1 час', value: '3600' }, { label: '6 часов', value: '21600' }, { label: '24 часа', value: '86400' }];
  const priorityOptions = [{ value: 'direct', label: 'Только Direct' }, { value: 'auto', label: 'Авто (Direct → Relay)' }, { value: 'relay', label: 'Только Relay' }];
  const bubbleStyles = [{ value: 'rounded', label: 'Скруглённые' }, { value: 'sharp', label: 'Острые углы' }, { value: 'minimal', label: 'Минимальные' }];

  const currentDuration = durations.find(d => d.value === String(settings.tempMessageDuration)) || durations[2];
  const getPriorityLabel = () => priorityOptions.find(o => o.value === settings.connectionPriority)?.label || 'Только Direct';
  const getBubbleStyleLabel = () => bubbleStyles.find(o => o.value === chatAppearance.bubbleStyle)?.label || 'Скруглённые';

  const handleClearChats = () => { chats.forEach(chat => useStore.getState().clearChat(chat.id)); setClearChatsModal(false); };
  const handleClearAll = () => { clearAllData(); setClearAllModal(false); };
  const handleAddRelay = () => {
    if (!newRelayName.trim() || !newRelayAddress.trim()) return;
    addTrustedRelay({ id: Date.now().toString(), name: newRelayName.trim(), address: newRelayAddress.trim(), addedAt: Date.now() });
    setNewRelayName(''); setNewRelayAddress(''); setAddRelayModal(false);
  };

  const pickWallpaper = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]?.uri) {
      updateChatAppearance({ wallpaper: result.assets[0].uri });
      setWallpaperModal(false);
    }
  };

  const Section = ({ title, children }: any) => (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.sm }}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>{children}</View>
    </View>
  );

  const Row = ({ icon, label, value, onPress }: any) => (
    <TouchableOpacity style={[styles.row, { padding: spacing.md, borderBottomColor: colors.border }]} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={{ marginRight: spacing.md, width: 28, alignItems: 'center' }}>
        {typeof icon === 'string' ? <Text style={{ fontSize: 18, color: colors.textSecondary }}>{icon}</Text> : icon}
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize }}>{label}</Text>
      {value && <Text style={{ color: colors.textSecondary, fontSize: fontSize - 2, marginRight: spacing.sm }}>{value}</Text>}
      {onPress && <Text style={{ color: colors.textSecondary, fontSize: 20 }}>›</Text>}
    </TouchableOpacity>
  );

  const Toggle = ({ icon, label, desc, value, onToggle }: any) => (
    <View style={[styles.row, { padding: spacing.md, borderBottomColor: colors.border }]}>
      <View style={{ marginRight: spacing.md, width: 28, alignItems: 'center' }}>
        {typeof icon === 'string' ? <Text style={{ fontSize: 18, color: colors.textSecondary }}>{icon}</Text> : icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize }}>{label}</Text>
        {desc && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{desc}</Text>}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.surfaceLight }} thumbColor={colors.text} />
    </View>
  );

  const DangerBtn = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: colors.error + '15', borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={onPress} activeOpacity={0.7}>
      <View style={{ marginRight: spacing.sm }}>
        {typeof icon === 'string' ? <Text style={{ fontSize: 18, color: colors.error }}>{icon}</Text> : icon}
      </View>
      <Text style={{ color: colors.error, fontSize, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: density === 'compact' ? 24 : 28, fontWeight: '700' }}>Дополнительно</Text>
      </View>

      <Section title="Контент">
        <Row icon={<FolderIcon size={20} color={colors.accent} />} label="Папки чатов" onPress={() => setFoldersModal(true)} />
        <Row icon={<PaletteIcon size={20} color={colors.accent} />} label="Стикеры" onPress={() => navigation.navigate('StickerPacks')} />
        <Row icon={<ShieldIcon size={20} color={colors.accent} />} label="Бэкап и восстановление" onPress={() => navigation.navigate('Backup')} />
        <Row icon={<BookmarkIcon size={20} color={colors.accent} />} label="Избранное" onPress={() => navigation.navigate('Bookmarks')} />
        <Row icon={<ClockIcon size={20} color={colors.accent} />} label="Запланированные" onPress={() => navigation.navigate('ScheduledMessages')} />
      </Section>

      <Section title="Синхронизация">
        <Toggle icon={<GlobeIcon size={18} color={colors.accent} />} label="Синхронизация устройств" desc="Синхронизировать контакты между устройствами" value={settings.cloudSync || false} onToggle={() => updateSettings({ cloudSync: !settings.cloudSync })} />
        <Toggle icon={<NotificationIcon size={18} color={colors.accent} />} label="Push-уведомления" desc="Получать уведомления когда приложение закрыто" value={settings.pushNotifications !== false} onToggle={() => updateSettings({ pushNotifications: !settings.pushNotifications })} />
        <Row icon={<NotificationIcon size={18} color={colors.accent} />} label="Тест уведомлений" onPress={() => testNotification().then(ok => ok && Alert.alert('OK', 'Уведомление отправлено'))} />
      </Section>

      <Section title="Оформление чатов">
        <Row icon={<PaletteIcon size={18} color={colors.accent} />} label="Настройки чата" onPress={() => setChatSettingsModal(true)} />
      </Section>

      <Section title="Relay Policy">
        <Toggle icon={<GlobeIcon size={18} color={colors.accent} />} label="Разрешить Relay" desc="Использовать промежуточные узлы" value={settings.relayEnabled} onToggle={() => updateSettings({ relayEnabled: !settings.relayEnabled })} />
        <Row icon={<StorageIcon size={18} color={colors.accent} />} label="Доверенные relay-узлы" value={`${settings.trustedRelays.length}`} onPress={() => setRelayPolicyModal(true)} />
        <Row icon={<WifiIcon size={18} color={colors.accent} />} label="Приоритет соединения" value={getPriorityLabel()} onPress={() => setPriorityModal(true)} />
      </Section>

      <Section title="Временные сообщения">
        <Toggle icon={<ClockIcon size={18} color={colors.accent} />} label="По умолчанию временные" desc="Новые сообщения будут удаляться" value={settings.tempMessagesByDefault} onToggle={() => updateSettings({ tempMessagesByDefault: !settings.tempMessagesByDefault })} />
        <Row icon={<ClockIcon size={18} color={colors.accent} />} label="Время жизни" value={currentDuration.label} onPress={() => setDurationModal(true)} />
      </Section>

      <Section title="Очистка данных">
        <DangerBtn icon={<TrashIcon size={18} color={colors.error} />} label="Очистить все чаты" onPress={() => setClearChatsModal(true)} />
        <DangerBtn icon={<TrashIcon size={18} color={colors.error} />} label="Удалить все данные" onPress={() => setClearAllModal(true)} />
      </Section>

      <Section title="Информация">
        <Row icon={<InfoIcon size={18} color={colors.accent} />} label="Версия приложения" value="1.0.0" />
        <Row icon={<WifiIcon size={18} color={colors.accent} />} label="Протокол" value="libp2p + WebRTC" />
        <Row icon={<ShieldIcon size={18} color={colors.accent} />} label="Шифрование" value="E2E NaCl" />
      </Section>

      <View style={{ alignItems: 'center', marginTop: spacing.xl * 2, paddingBottom: spacing.lg }}>
        <View style={{ marginBottom: spacing.sm }}><RelayIcon size={40} color={colors.accent} /></View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>NODUS</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Direct. Private. Decentralized.</Text>
      </View>

      <View style={{ height: 120 }} />

      {/* Chat Settings Modal */}
      <Modal visible={chatSettingsModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' }}>Оформление чатов</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Font Size */}
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm }}>Размер шрифта: {chatAppearance.fontSize}px</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }} onPress={() => updateChatAppearance({ fontSize: Math.max(12, chatAppearance.fontSize - 1) })}>
                  <Text style={{ color: colors.text, fontSize: 20 }}>−</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, height: 4, backgroundColor: colors.surfaceLight, marginHorizontal: spacing.md, borderRadius: 2 }}>
                  <View style={{ width: `${((chatAppearance.fontSize - 12) / 12) * 100}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 2 }} />
                </View>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }} onPress={() => updateChatAppearance({ fontSize: Math.min(24, chatAppearance.fontSize + 1) })}>
                  <Text style={{ color: colors.text, fontSize: 20 }}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <View style={{ backgroundColor: chatAppearance.wallpaper || colors.background, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.lg }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surfaceLight, padding: spacing.md, borderRadius: radius.lg, borderBottomLeftRadius: 4, marginBottom: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: chatAppearance.fontSize }}>Привет! Как дела?</Text>
                  {chatAppearance.showTime && <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>12:00</Text>}
                </View>
                <View style={{ alignSelf: 'flex-end', backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.lg, borderBottomRightRadius: 4 }}>
                  <Text style={{ color: colors.background, fontSize: chatAppearance.fontSize }}>Отлично! 👍</Text>
                  {chatAppearance.showTime && <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}><Text style={{ color: colors.accentDark, fontSize: 10 }}>12:01 </Text>{chatAppearance.showStatus && <DoubleCheckIcon size={10} color={colors.accentDark} />}</View>}
                </View>
              </View>

              {/* Bubble Style */}
              <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }]} onPress={() => setBubbleStyleModal(true)}>
                <Text style={{ color: colors.text, flex: 1 }}>Стиль пузырьков</Text>
                <Text style={{ color: colors.textSecondary }}>{getBubbleStyleLabel()}</Text>
                <Text style={{ color: colors.textSecondary, marginLeft: spacing.sm }}>›</Text>
              </TouchableOpacity>

              {/* Wallpaper */}
              <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }]} onPress={() => setWallpaperModal(true)}>
                <Text style={{ color: colors.text, flex: 1 }}>Обои чата</Text>
                <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: chatAppearance.wallpaper || colors.background, borderWidth: 1, borderColor: colors.border }} />
                <Text style={{ color: colors.textSecondary, marginLeft: spacing.sm }}>›</Text>
              </TouchableOpacity>

              {/* Show Time */}
              <View style={[styles.settingRow, { backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }]}>
                <Text style={{ color: colors.text, flex: 1 }}>Показывать время</Text>
                <Switch value={chatAppearance.showTime} onValueChange={(v) => updateChatAppearance({ showTime: v })} trackColor={{ true: colors.accent, false: colors.surface }} />
              </View>

              {/* Show Status */}
              <View style={[styles.settingRow, { backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}>
                <Text style={{ color: colors.text, flex: 1 }}>Показывать статус доставки</Text>
                <Switch value={chatAppearance.showStatus} onValueChange={(v) => updateChatAppearance({ showStatus: v })} trackColor={{ true: colors.accent, false: colors.surface }} />
              </View>
            </ScrollView>

            <TouchableOpacity style={{ paddingVertical: spacing.md }} onPress={() => setChatSettingsModal(false)}>
              <Text style={{ color: colors.accent, fontWeight: '600', textAlign: 'center' }}>Готово</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Wallpaper Modal */}
      <Modal visible={wallpaperModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' }}>Обои чата</Text>
            
            <TouchableOpacity style={{ backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: radius.full, marginBottom: spacing.lg }} onPress={pickWallpaper}>
              <Text style={{ color: colors.background, fontWeight: '600', textAlign: 'center' }}>Загрузить изображение</Text>
            </TouchableOpacity>

            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm, textAlign: 'center' }}>Или выберите цвет</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
              {WALLPAPERS.map((wp, i) => (
                <TouchableOpacity key={i} style={[{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: wp || colors.background, borderWidth: 2, borderColor: chatAppearance.wallpaper === wp ? colors.accent : colors.border }]} onPress={() => { updateChatAppearance({ wallpaper: wp }); setWallpaperModal(false); }}>
                  {!wp && <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 16 }}>Нет</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={{ paddingVertical: spacing.md, marginTop: spacing.md }} onPress={() => setWallpaperModal(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500', textAlign: 'center' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Other modals... */}
      <Modal visible={clearChatsModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ fontSize: 48, marginBottom: spacing.md, color: colors.warning }}>⌫</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Очистить все чаты?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg }}>История сообщений будет удалена.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.surfaceLight }} onPress={() => setClearChatsModal(false)}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.error }} onPress={handleClearChats}><Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Очистить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Folders Modal */}
      <Modal visible={foldersModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Папки чатов</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {(settings.folders || []).map((folder: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }}>
                  <FolderIcon size={18} color={colors.accent} />
                  <Text style={{ flex: 1, color: colors.text, marginLeft: spacing.sm }}>{folder}</Text>
                  <TouchableOpacity onPress={() => updateSettings({ folders: (settings.folders || []).filter((_: string, j: number) => j !== i) })}>
                    <CloseIcon size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
              {(settings.folders || []).length === 0 && <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }}>Нет папок</Text>}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm }}>
              <TextInput style={{ flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.sm, color: colors.text }} placeholder="Новая папка" placeholderTextColor={colors.textSecondary} value={newFolderName} onChangeText={setNewFolderName} />
              <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.sm, justifyContent: 'center' }} onPress={() => { if (newFolderName.trim()) { updateSettings({ folders: [...(settings.folders || []), newFolderName.trim()] }); setNewFolderName(''); } }}>
                <PlusIcon size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' }}>Свайп влево на чате → выбор папки</Text>
            <TouchableOpacity style={{ paddingVertical: spacing.md, marginTop: spacing.md }} onPress={() => setFoldersModal(false)}>
              <Text style={{ color: colors.accent, fontWeight: '600', textAlign: 'center' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={clearAllModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' }]}>
            <WarningIcon size={48} color={colors.warning} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.md, textAlign: 'center' }}>Удалить все данные?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg }}>Все данные будут удалены безвозвратно.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.surfaceLight }} onPress={() => setClearAllModal(false)}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.error }} onPress={handleClearAll}><Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Удалить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={relayPolicyModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Доверенные Relay-узлы</Text>
            {settings.trustedRelays.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Text style={{ fontSize: 40, color: colors.accent, marginBottom: spacing.md }}>◈</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Нет добавленных узлов</Text>
              </View>
            ) : (
              <View style={{ width: '100%', marginBottom: spacing.md }}>
                {settings.trustedRelays.map(relay => (
                  <View key={relay.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{relay.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{relay.address}</Text>
                    </View>
                    <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => removeTrustedRelay(relay.id)}><CloseIcon size={16} color={colors.error} /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={{ backgroundColor: colors.surfaceLight, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.full, marginBottom: spacing.md }} onPress={() => setAddRelayModal(true)}><Text style={{ color: colors.accent, fontWeight: '600' }}>+ Добавить узел</Text></TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: spacing.md }} onPress={() => setRelayPolicyModal(false)}><Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Закрыть</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addRelayModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Добавить Relay-узел</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, width: '100%', marginBottom: spacing.sm }} value={newRelayName} onChangeText={setNewRelayName} placeholder="Название узла" placeholderTextColor={colors.textSecondary} />
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, width: '100%', marginBottom: spacing.md }} value={newRelayAddress} onChangeText={setNewRelayAddress} placeholder="Адрес (/ip4/...)" placeholderTextColor={colors.textSecondary} />
            <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.surfaceLight }} onPress={() => setAddRelayModal(false)}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.accent }} onPress={handleAddRelay}><Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Добавить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SelectModal visible={durationModal} title="Время жизни сообщений" options={durations} selected={String(settings.tempMessageDuration)} onSelect={(v: string) => updateSettings({ tempMessageDuration: parseInt(v) })} onClose={() => setDurationModal(false)} colors={colors} spacing={spacing} radius={radius} />
      <SelectModal visible={priorityModal} title="Приоритет соединения" options={priorityOptions} selected={settings.connectionPriority} onSelect={(v: string) => updateSettings({ connectionPriority: v as any })} onClose={() => setPriorityModal(false)} colors={colors} spacing={spacing} radius={radius} />
      <SelectModal visible={bubbleStyleModal} title="Стиль пузырьков" options={bubbleStyles} selected={chatAppearance.bubbleStyle} onSelect={(v: string) => updateChatAppearance({ bubbleStyle: v as any })} onClose={() => setBubbleStyleModal(false)} colors={colors} spacing={spacing} radius={radius} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 400, alignItems: 'center' },
  selectOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderBottomWidth: 1 },
});
