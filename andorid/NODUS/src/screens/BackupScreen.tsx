import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Clipboard } from 'react-native';
import { useTheme } from '../theme';
// TODO: Replace with actual backup service
const createBackup = async (password: string) => 'NODUS_BACKUP_PLACEHOLDER';
const restoreBackup = async (data: string, password: string) => ({ success: true });
const exportBackupToFile = async (password: string) => '/path/to/backup.nodus';
const exportKeysOnly = () => 'KEYS_PLACEHOLDER';
import { BackIcon, ShieldIcon, DownloadIcon, CopyClipboardIcon } from '../components/Icons';

export const BackupScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupData, setBackupData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'backup' | 'restore'>('backup');

  const handleCreateBackup = async () => {
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    try {
      const backup = await createBackup(password);
      Clipboard.setString(backup);
      Alert.alert('Готово', 'Бэкап скопирован в буфер обмена. Сохраните его в надёжном месте!');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать бэкап');
    }
    setIsLoading(false);
  };

  const handleExportFile = async () => {
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    const path = await exportBackupToFile(password);
    setIsLoading(false);
    
    if (path) {
      Alert.alert('Готово', 'Бэкап сохранён и готов к отправке');
    } else {
      Alert.alert('Ошибка', 'Не удалось экспортировать бэкап');
    }
  };

  const handleRestoreFromClipboard = async () => {
    const content = await Clipboard.getString();
    if (!content.startsWith('NODUS_BACKUP')) {
      Alert.alert('Ошибка', 'В буфере обмена нет бэкапа NODUS');
      return;
    }
    if (!restorePassword) {
      Alert.alert('Ошибка', 'Введите пароль от бэкапа');
      return;
    }

    setIsLoading(true);
    const res = await restoreBackup(content, restorePassword);
    setIsLoading(false);

    if (res.success) {
      Alert.alert('Готово', 'Данные восстановлены. Перезапустите приложение.');
    } else {
      Alert.alert('Ошибка', res.error || 'Не удалось восстановить');
    }
  };

  const handleRestoreFromInput = async () => {
    if (!backupData.startsWith('NODUS_BACKUP')) {
      Alert.alert('Ошибка', 'Неверный формат бэкапа');
      return;
    }
    if (!restorePassword) {
      Alert.alert('Ошибка', 'Введите пароль от бэкапа');
      return;
    }

    setIsLoading(true);
    const res = await restoreBackup(backupData, restorePassword);
    setIsLoading(false);

    if (res.success) {
      Alert.alert('Готово', 'Данные восстановлены. Перезапустите приложение.');
    } else {
      Alert.alert('Ошибка', res.error || 'Не удалось восстановить');
    }
  };

  const handleExportKeys = () => {
    const keys = exportKeysOnly();
    Clipboard.setString(keys);
    Alert.alert('Внимание!', 'Ключи скопированы БЕЗ ШИФРОВАНИЯ. Используйте только для переноса на своё устройство!');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.md }}>
          <BackIcon size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Бэкап и восстановление</Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
        <TouchableOpacity 
          style={{ flex: 1, padding: spacing.md, borderBottomWidth: 2, borderBottomColor: tab === 'backup' ? colors.accent : 'transparent' }}
          onPress={() => setTab('backup')}
        >
          <Text style={{ color: tab === 'backup' ? colors.accent : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Создать</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, padding: spacing.md, borderBottomWidth: 2, borderBottomColor: tab === 'restore' ? colors.accent : 'transparent' }}
          onPress={() => setTab('restore')}
        >
          <Text style={{ color: tab === 'restore' ? colors.accent : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Восстановить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: spacing.lg }}>
        {tab === 'backup' ? (
          <>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <ShieldIcon size={24} color={colors.accent} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: spacing.sm }}>Зашифрованный бэкап</Text>
              </View>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 }}>
                Включает ключи, контакты, чаты и настройки.
              </Text>

              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs }}>ПАРОЛЬ</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.md }}
                value={password}
                onChangeText={setPassword}
                placeholder="Минимум 6 символов"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />

              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs }}>ПОДТВЕРДИТЕ</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.lg }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Повторите пароль"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: spacing.md, borderRadius: radius.lg }}
                  onPress={handleCreateBackup}
                  disabled={isLoading}
                >
                  <CopyClipboardIcon size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, marginLeft: spacing.sm }}>Копировать</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.lg }}
                  onPress={handleExportFile}
                  disabled={isLoading}
                >
                  <DownloadIcon size={18} color={colors.background} />
                  <Text style={{ color: colors.background, marginLeft: spacing.sm }}>В файл</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}
              onPress={handleExportKeys}
            >
              <Text style={{ color: colors.error, fontWeight: '600' }}>⚠️ Экспорт ключей (небезопасно)</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs }}>
                Только для переноса на своё устройство
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md }}>Восстановить из бэкапа</Text>

            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs }}>ПАРОЛЬ ОТ БЭКАПА</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.md }}
              value={restorePassword}
              onChangeText={setRestorePassword}
              placeholder="Введите пароль"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />

            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs }}>ДАННЫЕ БЭКАПА (опционально)</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.lg, minHeight: 80 }}
              value={backupData}
              onChangeText={setBackupData}
              placeholder="Вставьте бэкап сюда или используйте буфер обмена"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: colors.surfaceLight, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' }}
                onPress={handleRestoreFromClipboard}
                disabled={isLoading}
              >
                <Text style={{ color: colors.accent }}>Из буфера</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' }}
                onPress={handleRestoreFromInput}
                disabled={isLoading}
              >
                <Text style={{ color: colors.background }}>Восстановить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading && (
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};
