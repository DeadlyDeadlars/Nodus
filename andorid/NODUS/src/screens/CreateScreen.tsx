import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { CheckIcon, BackIcon, ChatBubbleIcon, UsersIcon, ChannelIcon, UserIcon } from '../components/Icons';

// Placeholders
const b64encode = (s: string) => s;
const b64decode = (s: string) => s;
const nacl = { box: { keyPair: () => ({ publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }) } };
const addContact = async (peerId: string, pubKey: string) => true;

type CreateType = 'chat' | 'group' | 'channel' | 'contact';

const postRelay = async (action: string, body: any) => {
  return null;
};

const bytesToB64 = (bytes: Uint8Array): string => '';

export const CreateScreen = ({ navigation, route }: any) => {
  const initialType = route?.params?.type || 'chat';
  const { colors, spacing, radius } = useTheme();
  const { profile, addChat, addSpace, addChannel, getOrCreateChat, joinRelayGroup } = useStore();
  
  const [type, setType] = useState<CreateType>(initialType);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [peerId, setPeerId] = useState('');
  const [token, setToken] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreate = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (type === 'chat' || type === 'contact') {
        const input = peerId.trim();
        if (!input) { setError('Введите ID'); setIsLoading(false); return; }
        
        let targetId = input;
        if (input.includes('/p2p/')) targetId = input.split('/p2p/').pop() || input;
        
        // Prevent creating chat with self
        if (targetId === profile?.fingerprint) {
          setError('Нельзя создать чат с самим собой');
          setIsLoading(false);
          return;
        }
        
        const chat = getOrCreateChat(targetId);
        const fetchedProfile = await useStore.getState().fetchPeerProfile(targetId);
        if (fetchedProfile) {
          // Save to E2EE storage if publicKey available
          if (fetchedProfile.publicKey) {
            await addContact(targetId, fetchedProfile.publicKey);
          }
          
          useStore.setState(s => ({
            chats: s.chats.map(c => c.id === chat.id ? {
              ...c,
              username: fetchedProfile.username || c.username,
              alias: fetchedProfile.alias || c.alias,
              avatar: fetchedProfile.avatar || c.avatar,
              bio: fetchedProfile.bio || c.bio,
              publicKey: fetchedProfile.publicKey || c.publicKey,
            } : c)
          }));
        }
        
        navigation.replace('ChatDetail', { chatId: chat.id });
      } else if (type === 'group') {
        if (mode === 'join') {
          await handleJoinGroup();
          return;
        }
        
        if (!name.trim()) { setError('Введите название'); setIsLoading(false); return; }
        
        const id = Date.now().toString();
        const fingerprint = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
        const groupKey = bytesToB64(nacl.randomBytes(32));
        
        const relayRes = await postRelay('groupCreate', {
          name: name.trim(),
          username: username.trim().toLowerCase() || undefined,
          description: description.trim() || undefined,
          ownerId: profile?.fingerprint,
          groupKey,
        });
        
        const finalGroupId = relayRes?.groupId || id;
        
        addSpace({ id: finalGroupId, name: name.trim(), fingerprint, nodeCount: 1, hasVoice, groupKey, createdAt: Date.now() });
        
        if (!useStore.getState().chats.find(c => c.isGroup && c.groupId === finalGroupId)) {
          addChat({
            id: `group-${finalGroupId}`,
            peerId: `group:${finalGroupId}`,
            alias: name.trim(),
            bio: description.trim(),
            isOnline: true,
            messages: [],
            lastMessageTime: Date.now(),
            isGroup: true,
            groupId: finalGroupId,
            groupKey,
            lastGroupTimestamp: 0,
          });
        }
        
        await joinRelayGroup(finalGroupId, name.trim());
        navigation.replace('ChatDetail', { chatId: `group-${finalGroupId}` });
      } else if (type === 'channel') {
        if (!name.trim() || !profile) { setError('Введите название'); setIsLoading(false); return; }
        
        const res = await postRelay('channelCreate', {
          name: name.trim(),
          username: username.trim().toLowerCase(),
          description: description.trim(),
          ownerId: profile.fingerprint,
        });
        
        const channelId = res?.channelId || `ch_${Date.now()}`;
        addChannel({
          id: channelId,
          name: name.trim(),
          description: description.trim(),
          ownerId: profile.fingerprint,
          subscriberCount: 1,
          isPublic: true,
          createdAt: Date.now(),
          posts: [],
        });
        
        // Добавляем канал в список чатов
        if (!useStore.getState().chats.find(c => c.peerId === `channel:${channelId}`)) {
          addChat({
            id: `channel-${channelId}`,
            peerId: `channel:${channelId}`,
            alias: name.trim(),
            bio: description.trim(),
            isOnline: true,
            messages: [],
            lastMessageTime: Date.now(),
          });
        }
        
        navigation.replace('ChannelDetail', { channelId });
      }
    } catch (e) {
      setError('Ошибка создания');
    }
    
    setIsLoading(false);
  };

  const handleJoinGroup = async () => {
    const input = token.trim().replace(/\s+/g, '');
    if (!input) { setError('Введите токен'); setIsLoading(false); return; }
    
    try {
      const decoded = b64decode(input);
      const data = JSON.parse(decoded);
      
      if (!data.id || !data.name) { setError('Неверный токен'); setIsLoading(false); return; }
      
      const groupKey = data.groupKey || bytesToB64(nacl.randomBytes(32));
      const groupId = String(data.id);
      
      const ok = await joinRelayGroup(groupId, data.name);
      if (!ok) { setError('Не удалось вступить'); setIsLoading(false); return; }
      
      if (!useStore.getState().chats.find(c => c.isGroup && c.groupId === groupId)) {
        addChat({
          id: `group-${groupId}`,
          peerId: `group:${groupId}`,
          alias: data.name,
          isOnline: true,
          messages: [],
          lastMessageTime: Date.now(),
          isGroup: true,
          groupId,
          groupKey,
          lastGroupTimestamp: 0,
        });
      }
      
      if (!useStore.getState().spaces.find(s => s.id === data.id)) {
        addSpace({
          id: data.id,
          name: data.name,
          fingerprint: data.fingerprint || groupId,
          nodeCount: data.nodeCount || 1,
          hasVoice: data.hasVoice || false,
          groupKey,
          createdAt: Date.now(),
        });
      }
      
      navigation.replace('ChatDetail', { chatId: `group-${groupId}` });
    } catch {
      setError('Неверный формат токена');
      setIsLoading(false);
    }
  };

  const types: { key: CreateType; label: string; Icon: any }[] = [
    { key: 'chat', label: 'Чат', Icon: ChatBubbleIcon },
    { key: 'group', label: 'Группа', Icon: UsersIcon },
    { key: 'channel', label: 'Канал', Icon: ChannelIcon },
    { key: 'contact', label: 'Контакт', Icon: UserIcon },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.md }}>
          <BackIcon size={18} color={colors.accent} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>Создать</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg }}>
          {types.map(t => (
            <TouchableOpacity key={t.key} style={{ flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: type === t.key ? colors.accent : 'transparent', alignItems: 'center' }} onPress={() => { setType(t.key); setError(''); setMode('create'); }}>
              <t.Icon size={20} color={type === t.key ? colors.background : colors.textSecondary} />
              <Text style={{ color: type === t.key ? colors.background : colors.textSecondary, fontSize: 11, marginTop: 2 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(type === 'chat' || type === 'contact') && (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm }}>Введите Peer ID или fingerprint пользователя</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 14, fontFamily: 'monospace', marginBottom: spacing.md }}
              value={peerId}
              onChangeText={t => { setPeerId(t); setError(''); }}
              placeholder="QmXxx... или fingerprint"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
          </>
        )}

        {type === 'group' && (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg }}>
              <TouchableOpacity style={{ flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: mode === 'create' ? colors.accent : 'transparent' }} onPress={() => setMode('create')}>
                <Text style={{ color: mode === 'create' ? colors.background : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Создать</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: mode === 'join' ? colors.accent : 'transparent' }} onPress={() => setMode('join')}>
                <Text style={{ color: mode === 'join' ? colors.background : colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>По токену</Text>
              </TouchableOpacity>
            </View>

            {mode === 'create' ? (
              <>
                <TextInput
                  style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 16, marginBottom: spacing.md }}
                  value={name}
                  onChangeText={t => { setName(t); setError(''); }}
                  placeholder="Название группы"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16, paddingLeft: spacing.md }}>@</Text>
                  <TextInput
                    style={{ flex: 1, padding: spacing.md, color: colors.text, fontSize: 16 }}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username (необязательно)"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
                <TextInput
                  style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 16, marginBottom: spacing.md, minHeight: 80 }}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Описание (необязательно)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => setIsPublic(!isPublic)}>
                  <View style={[{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }, isPublic && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    {isPublic && <CheckIcon size={14} color={colors.background} />}
                  </View>
                  <Text style={{ color: colors.text, flex: 1 }}>Публичная группа</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md }} onPress={() => setHasVoice(!hasVoice)}>
                  <View style={[{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }, hasVoice && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    {hasVoice && <CheckIcon size={14} color={colors.background} />}
                  </View>
                  <Text style={{ color: colors.text, flex: 1 }}>Голосовой чат</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm }}>Введите токен приглашения в группу</Text>
                <TextInput
                  style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 14, fontFamily: 'monospace', marginBottom: spacing.md, minHeight: 80, textAlign: 'center' }}
                  value={token}
                  onChangeText={t => { setToken(t); setError(''); }}
                  placeholder="Токен группы"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </>
            )}
          </>
        )}

        {type === 'channel' && (
          <>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 16, marginBottom: spacing.md }}
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              placeholder="Название канала"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16, paddingLeft: spacing.md }}>@</Text>
              <TextInput
                style={{ flex: 1, padding: spacing.md, color: colors.text, fontSize: 16 }}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 16, marginBottom: spacing.md, minHeight: 80 }}
              value={description}
              onChangeText={setDescription}
              placeholder="Описание"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </>
        )}

        {error && <Text style={{ color: colors.error, textAlign: 'center', marginBottom: spacing.md }}>{error}</Text>}
        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginBottom: spacing.md }} />}

        <TouchableOpacity style={{ backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.full, marginTop: spacing.md }} onPress={handleCreate} disabled={isLoading}>
          <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
            {type === 'group' && mode === 'join' ? 'Вступить' : 'Создать'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
