import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { CloseIcon, BackIcon, SearchIcon } from '../components/Icons';

type SearchTab = 'all' | 'users' | 'groups' | 'channels' | 'chats';

// Placeholder
const postRelay = async (action: string, body: any) => {
  return { results: [] };
};

export const GlobalSearchScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const { chats, searchUsersByUsername, profile, getOrCreateChat, addChat } = useStore();
  const joinRelayGroup = async (id: string, name: string) => {};
  const addSpace = (s: any) => {};
  const addChannel = (c: any) => {};
  const spaces: any[] = [];
  const channels: any[] = [];
  
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [groupResults, setGroupResults] = useState<any[]>([]);
  const [channelResults, setChannelResults] = useState<any[]>([]);

  const localChats = chats.filter(c => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (c.alias?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q) || c.peerId.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));
  });

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    
    setIsSearching(true);
    
    const [users, groups, chs] = await Promise.all([
      (tab === 'all' || tab === 'users') ? searchUsersByUsername(q) : Promise.resolve([]),
      (tab === 'all' || tab === 'groups') ? postRelay('groupSearch', { query: q }).then(r => r?.results || []) : Promise.resolve([]),
      (tab === 'all' || tab === 'channels') ? postRelay('channelSearch', { query: q }).then(r => r?.results || []) : Promise.resolve([]),
    ]);
    
    setUserResults(users);
    setGroupResults(groups);
    setChannelResults(chs);
    setIsSearching(false);
  };

  useEffect(() => {
    if (query.trim().length >= 2) {
      const t = setTimeout(search, 300);
      return () => clearTimeout(t);
    } else {
      setUserResults([]);
      setGroupResults([]);
      setChannelResults([]);
    }
  }, [query, tab]);

  const handleSelectUser = (user: any) => {
    const chat = getOrCreateChat(user.peerId, user.publicKey, user.boxPublicKey);
    useStore.setState(s => ({
      chats: s.chats.map(c => c.id === chat.id ? {
        ...c,
        username: user.username || c.username,
        alias: user.alias || c.alias,
        avatar: user.avatar || c.avatar,
        bio: user.bio || c.bio,
        publicKey: user.publicKey || c.publicKey,
        boxPublicKey: user.boxPublicKey || c.boxPublicKey,
        fingerprint: !user.peerId.startsWith('Qm') ? user.peerId : (user.fingerprint || c.fingerprint),
      } : c)
    }));
    navigation.replace('ChatDetail', { chatId: chat.id });
  };

  const handleSelectGroup = async (group: any) => {
    await joinRelayGroup(group.id, group.name);
    const groupId = group.id;
    if (!chats.find(c => c.isGroup && c.groupId === groupId)) {
      addChat({
        id: `group-${groupId}`,
        peerId: `group:${groupId}`,
        alias: group.name,
        avatar: group.avatar,
        bio: group.description,
        isOnline: true,
        messages: [],
        lastMessageTime: Date.now(),
        isGroup: true,
        groupId,
        groupKey: group.groupKey,
        lastGroupTimestamp: 0,
      });
    }
    if (!spaces.find(s => s.id === groupId)) {
      addSpace({ id: groupId, name: group.name, fingerprint: groupId, nodeCount: group.memberCount || 1, groupKey: group.groupKey, createdAt: Date.now() });
    }
    navigation.replace('ChatDetail', { chatId: `group-${groupId}` });
  };

  const handleSelectChannel = async (ch: any) => {
    if (!profile) return;
    await postRelay('channelSubscribe', { channelId: ch.id, userId: profile.fingerprint });
    if (!channels.find(c => c.id === ch.id)) {
      addChannel({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        avatar: ch.avatar,
        ownerId: ch.ownerId || '',
        subscriberCount: ch.subscriberCount || 1,
        isPublic: true,
        createdAt: Date.now(),
        posts: [],
      });
    }
    // Добавляем канал в список чатов
    if (!chats.find(c => c.peerId === `channel:${ch.id}`)) {
      addChat({
        id: `channel-${ch.id}`,
        peerId: `channel:${ch.id}`,
        alias: ch.name,
        avatar: ch.avatar,
        bio: ch.description,
        isOnline: true,
        messages: [],
        lastMessageTime: Date.now(),
      });
    }
    navigation.replace('ChannelDetail', { channelId: ch.id });
  };

  const tabs: { key: SearchTab; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'chats', label: 'Чаты' },
    { key: 'users', label: 'Люди' },
    { key: 'groups', label: 'Группы' },
    { key: 'channels', label: 'Каналы' },
  ];

  const hasResults = localChats.length > 0 || userResults.length > 0 || groupResults.length > 0 || channelResults.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingTop: spacing.xl, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
          <BackIcon size={18} color={colors.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: radius.lg, paddingHorizontal: spacing.md }}>
          <SearchIcon size={16} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, padding: spacing.md, color: colors.text, fontSize: 16 }}
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск по @username..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <CloseIcon size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, backgroundColor: colors.surface }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' }}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: tab === t.key ? colors.accent : colors.surfaceLight }} onPress={() => setTab(t.key)}>
            <Text style={{ color: tab === t.key ? colors.background : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isSearching && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
        {!query.trim() && (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>Введите @username для поиска</Text>
        )}

        {query.trim() && !isSearching && !hasResults && (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>Ничего не найдено</Text>
        )}

        {(tab === 'all' || tab === 'chats') && localChats.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm }}>ЧАТЫ</Text>
            {localChats.map(chat => (
              <TouchableOpacity key={chat.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => navigation.replace('ChatDetail', { chatId: chat.id })}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                  {chat.avatar ? <Image source={{ uri: chat.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '700' }}>{(chat.alias || chat.username || chat.peerId)[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{chat.alias || chat.username || chat.peerId.slice(0, 12)}</Text>
                  {chat.username && <Text style={{ color: colors.accent, fontSize: 12 }}>@{chat.username}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(tab === 'all' || tab === 'users') && userResults.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm }}>ПОЛЬЗОВАТЕЛИ</Text>
            {userResults.map((user, i) => (
              <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => handleSelectUser(user)}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, overflow: 'hidden' }}>
                  <Text style={{ color: colors.accent, fontSize: 18 }}>⬡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{user.username || user.peerId.slice(0, 12)}</Text>
                  {user.username && <Text style={{ color: colors.accent, fontSize: 12 }}>@{user.username}</Text>}
                </View>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: user.isOnline ? colors.online : colors.offline }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(tab === 'all' || tab === 'groups') && groupResults.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm }}>ГРУППЫ</Text>
            {groupResults.map((group, i) => (
              <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => handleSelectGroup(group)}>
                <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, overflow: 'hidden' }}>
                  {group.avatar ? <Image source={{ uri: group.avatar }} style={{ width: 44, height: 44 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '700' }}>{(group.name || 'G')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{group.name}</Text>
                  {group.username && <Text style={{ color: colors.accent, fontSize: 12 }}>@{group.username}</Text>}
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{group.memberCount || 0} участников</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(tab === 'all' || tab === 'channels') && channelResults.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm }}>КАНАЛЫ</Text>
            {channelResults.map((ch, i) => (
              <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => handleSelectChannel(ch)}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, overflow: 'hidden' }}>
                  {ch.avatar ? <Image source={{ uri: ch.avatar }} style={{ width: 44, height: 44 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '700' }}>{(ch.name || 'C')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{ch.name}</Text>
                  {ch.username && <Text style={{ color: colors.accent, fontSize: 12 }}>@{ch.username}</Text>}
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{ch.subscriberCount || 0} подписчиков</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
