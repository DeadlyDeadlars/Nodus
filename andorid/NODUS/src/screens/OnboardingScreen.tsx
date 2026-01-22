import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Clipboard, Alert } from 'react-native';
import { getColors, getSpacing } from '../theme';
import { useStore } from '../store';
import { CustomAlert } from '../components/CustomAlert';
import { CheckIcon, RelayIcon, P2PIcon, LockIcon, UsersIcon } from '../components/Icons';

// Placeholders
const p2p = { init: () => {} };
const getOrCreateKeyPair = async () => ({ publicKey: '', secretKey: '' });
const deriveFingerprint = (key: string) => key.slice(0, 16);
const initCore = async () => null;
const getIdentity = () => ({ fingerprint: '', publicKey: '' });

type NodeRoleType = 'user' | 'relay' | 'bootstrap';

export const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { settings, initKeyPair } = useStore();
  const colors = getColors(settings.theme);
  const spacing = getSpacing(settings.uiDensity);
  const radius = { sm: 8, md: 16, lg: 24, xl: 32, full: 999 };
  
  const [step, setStep] = useState(0);
  const [alias, setAlias] = useState('');
  const [importKey, setImportKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<NodeRoleType>('user');
  const [alertVisible, setAlertVisible] = useState(false);
  const { setProfile, setOnboarded } = useStore();

  const generateNewAccount = () => {
    setIsGenerating(true);
    setTimeout(async () => {
      try {
        const { clearAllData } = useStore.getState();
        clearAllData();
        __DEV__ && console.log('✓ Old data cleared before new account');

        // Initialize E2EE core and get identity
        const e2eeFingerprint = await initCore();
        const e2eeIdentity = getIdentity();
        
        const { keyPair, fingerprint } = initKeyPair();
        
        // Check if key generation was successful
        if (!keyPair.publicKey || !keyPair.secretKey || fingerprint === 'ERROR') {
          throw new Error('Key generation failed - invalid keys generated');
        }
        
        // Use E2EE fingerprint if available, otherwise use legacy
        const finalFingerprint = e2eeFingerprint || fingerprint;
        const finalPublicKey = e2eeIdentity?.publicKey || keyPair.publicKey;
        
        setGeneratedKey(finalFingerprint);
        setPublicKey(finalPublicKey);
        setIsGenerating(false);
        
        __DEV__ && console.log('✓ E2EE identity created:', finalFingerprint?.slice(0, 8) + '...');
      } catch (error) {
        __DEV__ && console.error('✗ Account generation error:', error);
        setIsGenerating(false);
        // Show user-friendly error message
        setAlertVisible(true);
      }
    }, 500);
  };

  const detectNodeRole = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json', { timeout: 5000 });
      if (!response.ok) throw new Error('Network error');
      
      const data = await response.json();
      const externalIp = data?.ip;
      
      if (externalIp && externalIp !== '127.0.0.1') {
        return 'relay';
      }
      return 'user';
    } catch (e) {
      return 'user';
    }
  };

  const completeRegistration = async () => {
    if (!generatedKey || !publicKey) {
      Alert.alert('Ошибка', 'Ключ не сгенерирован');
      return;
    }
    try {
      const profile = {
        fingerprint: generatedKey,
        alias: alias.trim() || 'Anonymous',
        publicKey,
        createdAt: Date.now(),
        nodeRole: 'user',
      };
      
      setProfile(profile);
      
      // Регистрируем на backend для поиска
      const regData = {
        user_id: generatedKey,
        username: alias.trim() || 'anonymous_' + generatedKey.slice(0, 8),
        public_key_hash: publicKey,
        is_discoverable: true
      };
      console.log('Registering user:', regData);
      fetch('http://bibliotekaznanyi.online/api/discovery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      }).then(r => r.json()).then(d => console.log('Register result:', d)).catch(e => console.error('Register error:', e));
      
      // Публикуем профиль на relay (не блокируем если не работает)
      fetch('http://194.87.103.193:3000/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publishProfile',
          profile: profile,
          fingerprint: generatedKey
        })
      }).catch(() => {});
      
      setOnboarded(true);
    } catch (error) {
      Alert.alert('Ошибка', String(error));
    }
  };

  const loginWithKey = async () => {
    const key = importKey.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
    if (key.length !== 32) {
      Alert.alert('Ошибка', 'Ключ должен быть 32 символа');
      return;
    }

    try {
      const { fetchPeerProfile, setProfile: storeSetProfile } = useStore.getState();

      const relayProfile = await fetchPeerProfile(key);
      
      const profile = relayProfile && (relayProfile.alias || relayProfile.username) ? {
        fingerprint: key,
        alias: relayProfile.alias || relayProfile.username || 'Anonymous',
        username: relayProfile.username,
        avatar: relayProfile.avatar,
        bio: relayProfile.bio,
        publicKey: relayProfile.publicKey || `pk_${key.slice(0, 16)}`,
        createdAt: Date.now(),
        nodeRole: 'user',
      } : {
        fingerprint: key,
        alias: 'Anonymous',
        publicKey: `pk_${key.slice(0, 16)}`,
        createdAt: Date.now(),
        nodeRole: 'user',
      };
      
      storeSetProfile(profile);
      
      // ✅ Публикуем профиль на relay
      try {
        await fetch('http://194.87.103.193:3000/relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'publishProfile',
            profile: profile,
            fingerprint: key
          })
        });
      } catch (e) {
        console.error('Publish profile failed:', e);
      }
      
      setOnboarded(true);
    } catch (error) {
      Alert.alert('Ошибка', String(error));
    }
  };

  const finish = () => {
    const { profile } = useStore.getState();
    if (!profile) {
      if (generatedKey && publicKey) {
        setProfile({
          fingerprint: generatedKey,
          alias: alias.trim() || 'Anonymous',
          publicKey,
          createdAt: Date.now(),
        });
      }
    }
    setOnboarded(true);
    onComplete();
  };

  const copyKey = () => {
    Clipboard.setString(generatedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const RoleCard = ({ 
    role, 
    icon, 
    title, 
    subtitle, 
    description, 
    benefits,
    warning 
  }: { 
    role: NodeRoleType;
    icon: string; 
    title: string; 
    subtitle: string;
    description: string;
    benefits: string[];
    warning?: string;
  }) => (
    <TouchableOpacity 
      style={[
        styles.roleCard, 
        { 
          backgroundColor: colors.surface, 
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: selectedRole === role ? colors.accent : 'transparent'
        }
      ]} 
      onPress={() => selectRole(role)}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{ width: 50, height: 50, borderRadius: radius.full, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
          <Text style={{ fontSize: 24, color: colors.accent }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
          <Text style={{ fontSize: 12, color: colors.accent }}>{subtitle}</Text>
        </View>
      </View>
      
      <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm }}>
        {description}
      </Text>
      
      <View style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.sm }}>
        {benefits.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < benefits.length - 1 ? 4 : 0 }}>
            <Text style={{ color: colors.accent, marginRight: spacing.sm }}>•</Text>
            <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>{b}</Text>
          </View>
        ))}
      </View>
      
      {warning && (
        <Text style={{ fontSize: 11, color: colors.warning, marginTop: spacing.sm, fontStyle: 'italic' }}>
          ⚡ {warning}
        </Text>
      )}
    </TouchableOpacity>
  );

  const steps: { [key: number]: JSX.Element } = {
    0: (
      <View style={styles.stepContent}>
        <View style={[styles.logoContainer, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <RelayIcon size={64} color={colors.accent} />
        </View>
        <Text style={{ fontSize: 42, fontWeight: '700', color: colors.text, marginBottom: spacing.xs }}>NODUS</Text>
        <Text style={{ fontSize: 16, color: colors.accent, marginBottom: spacing.xl, letterSpacing: 2 }}>Direct. Private. Decentralized.</Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.lg }}>
          Анонимный P2P-мессенджер{'\n'}с полным контролем над вашими данными
        </Text>
      </View>
    ),

    1: (
      <View style={styles.stepContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <LockIcon size={48} color={colors.accent} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>Вход в NODUS</Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md, marginBottom: spacing.xl }}>
          Создайте новый аккаунт или войдите с существующим ключом
        </Text>
        <View style={{ width: '100%', gap: spacing.md }}>
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, paddingVertical: spacing.lg, borderRadius: radius.lg, alignItems: 'center' }} 
            onPress={() => { setStep(2); generateNewAccount(); }}
          >
            <Text style={{ fontSize: 16, color: colors.background, fontWeight: '600' }}>Создать аккаунт</Text>
            <Text style={{ fontSize: 12, color: colors.background, opacity: 0.7, marginTop: 4 }}>Сгенерировать новый ключ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ backgroundColor: colors.surface, paddingVertical: spacing.lg, borderRadius: radius.lg, alignItems: 'center' }} 
            onPress={() => setStep(3)}
          >
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>Войти по ключу</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>У меня уже есть ключ</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),

    2: (
      <View style={styles.stepContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          {isGenerating ? <RelayIcon size={48} color={colors.accent} /> : <P2PIcon size={48} color={colors.accent} />}
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>Ваш ключ</Text>
        
        {isGenerating ? (
          <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xl }}>Генерация ключа...</Text>
        ) : (
          <>
            <Text style={{ fontSize: 14, color: colors.error, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
              Сохраните этот ключ! Он нужен для входа в аккаунт. Без него восстановить доступ невозможно.
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, width: '100%', marginBottom: spacing.md }}
              onPress={copyKey}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, color: colors.accent, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 1 }} selectable>
                {generatedKey.match(/.{1,8}/g)?.join(' ')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }}>
                {keyCopied && <CheckIcon size={14} color={colors.accent} />}
                <Text style={{ fontSize: 12, color: keyCopied ? colors.accent : colors.textSecondary, marginLeft: keyCopied ? 4 : 0 }}>
                  {keyCopied ? 'Скопировано' : 'Нажмите чтобы скопировать'}
                </Text>
              </View>
            </TouchableOpacity>

            <TextInput
              style={{ width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 16, textAlign: 'center', marginBottom: spacing.lg }}
              value={alias}
              onChangeText={setAlias}
              placeholder="Псевдоним (опционально)"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity 
              style={{ backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl * 2, borderRadius: radius.full }} 
              onPress={completeRegistration}
            >
              <Text style={{ color: colors.background, fontSize: 16, fontWeight: '600' }}>Я сохранил ключ</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    ),

    3: (
      <View style={styles.stepContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <Text style={{ fontSize: 48, color: colors.accent }}>◈</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>Вход по ключу</Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md, marginBottom: spacing.xl }}>
          Введите ваш 32-символьный ключ
        </Text>
        
        <TextInput
          style={{ width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, color: colors.text, fontSize: 16, textAlign: 'center', fontFamily: 'monospace', marginBottom: spacing.lg }}
          value={importKey}
          onChangeText={setImportKey}
          placeholder="XXXXXXXX XXXXXXXX XXXXXXXX XXXXXXXX"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: colors.surface, paddingVertical: spacing.md, borderRadius: radius.full }} 
            onPress={() => setStep(1)}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Назад</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: radius.full }} 
            onPress={loginWithKey}
          >
            <Text style={{ color: colors.background, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Войти</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),

    4: (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={[styles.stepContent, { paddingTop: spacing.lg }]}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' }}>Выберите роль</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg }}>
            Как вы хотите участвовать в сети NODUS?
          </Text>
          
          <RoleCard
            role="user"
            icon="📱"
            title="Пользователь"
            subtitle="Просто общаюсь"
            description="Ты просто разговариваешь с друзьями. Как обычный телефон — звонишь и пишешь."
            benefits={[
              "Все функции мессенджера",
              "Минимальный расход батареи",
              "Не нужен стабильный интернет"
            ]}
          />
          
          <RoleCard
            role="relay"
            icon="🌉"
            title="Мостик"
            subtitle="Помогаю другим соединиться"
            description="Ты как почтальон — помогаешь передавать письма тем, кто не может дотянуться друг до друга. Письма запечатаны, ты их не читаешь."
            benefits={[
              "Все функции мессенджера",
              "Помогаешь сети работать",
              "Статистика помощи другим"
            ]}
            warning="Больше расход батареи и трафика"
          />
          
          <RoleCard
            role="bootstrap"
            icon="🏠"
            title="Справочная"
            subtitle="Помогаю новым найти друзей"
            description="Ты как справочное бюро. Когда кто-то новый приходит и спрашивает «где тут все?», ты показываешь где искать друзей."
            benefits={[
              "Все функции мессенджера",
              "Ключевая роль в сети",
              "Помогаешь новым пользователям"
            ]}
            warning="Нужен стабильный интернет"
          />
        </View>
      </ScrollView>
    ),

    5: (
      <View style={styles.stepContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderRadius: radius.full }]}>
          <P2PIcon size={48} color={colors.accent} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>Добро пожаловать!</Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
          Вы вошли как {selectedRole === 'user' ? '📱 Пользователь' : selectedRole === 'relay' ? '🌉 Мостик' : '🏠 Справочная'}
        </Text>
        <View style={{ width: '100%', gap: spacing.md }}>
          {[
            { icon: <UsersIcon size={20} color={colors.accent} />, text: 'Добавьте друзей по их ID' },
            { icon: <RelayIcon size={20} color={colors.accent} />, text: 'Поделитесь своим ID для связи' },
            { icon: <LockIcon size={20} color={colors.accent} />, text: 'Все сообщения шифруются E2E' },
            selectedRole !== 'user' && { icon: <P2PIcon size={20} color={colors.accent} />, text: `Ваша роль: помощь сети NODUS` },
          ].filter(Boolean).map((t: any, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg }}>
              <View style={{ marginRight: spacing.md, width: 32, alignItems: 'center' }}>{t.icon}</View>
              <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{t.text}</Text>
            </View>
          ))}
        </View>
      </View>
    ),
  };

  const showDots = step <= 1 || step === 5;
  const dotCount = 3;
  const currentDot = step === 0 ? 0 : step === 1 ? 1 : 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <View style={{ flex: 1, justifyContent: step === 4 ? 'flex-start' : 'center' }}>{steps[step]}</View>
      <View style={{ alignItems: 'center', paddingBottom: spacing.lg }}>
        {showDots && (
          <View style={{ flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm }}>
            {Array(dotCount).fill(0).map((_, i) => (
              <View key={i} style={[
                { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight },
                i === currentDot && { backgroundColor: colors.accent, width: 24 },
                i < currentDot && { backgroundColor: colors.accent }
              ]} />
            ))}
          </View>
        )}
        {step === 0 && (
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl * 2, borderRadius: radius.full, minWidth: 200, alignItems: 'center' }} 
            onPress={() => setStep(1)}
          >
            <Text style={{ color: colors.background, fontSize: 18, fontWeight: '600' }}>Начать</Text>
          </TouchableOpacity>
        )}
        {step === 5 && (
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl * 2, borderRadius: radius.full, minWidth: 200, alignItems: 'center' }} 
            onPress={finish}
          >
            <Text style={{ color: colors.background, fontSize: 18, fontWeight: '600' }}>Войти</Text>
          </TouchableOpacity>
        )}
      </View>
      <CustomAlert visible={alertVisible} title="Ошибка" message="Ключ должен содержать 32 символа (A-F, 0-9)" onClose={() => setAlertVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  stepContent: { alignItems: 'center' },
  logoContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  roleCard: { width: '100%', padding: 16, marginBottom: 12 },
});
