import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StatusBar } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { Channel } from '../types';
import { MegaphoneIcon, SearchIcon, PlusIcon, BackIcon, SettingsGearIcon, SendIcon, EyeIcon } from '../components/Icons';
const postRelay = async (action: string, body: any) => {
  try {
    const res = await fetch('RELAY_URL_PLACEHOLDER', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    return await res.json();
  } catch { return { ok: false }; }
};

export const ChannelsScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const { channels } = useStore();
  const [search, setSearch] = useState('');

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.accent} barStyle="light-content" />
      
      {/* Header */}
      <View style={{ backgroundColor: colors.accent, paddingTop: spacing.xl, paddingBottom: spacing.md, paddingHorizontal: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ color: colors.background, fontSize: 22, fontWeight: '700' }}>Каналы</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => navigation.navigate('Чаты', { screen: 'GlobalSearch' })}>
              <SearchIcon size={22} color={colors.background} />
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => navigation.navigate('Чаты', { screen: 'Create', params: { type: 'channel' } })}>
              <PlusIcon size={22} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search */}
        <View style={{ backgroundColor: colors.background + '20', borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
          <SearchIcon size={18} color={colors.background + '80'} />
          <TextInput
            style={{ flex: 1, padding: spacing.sm, color: colors.background, fontSize: 16 }}
            placeholder="Поиск"
            placeholderTextColor={colors.background + '80'}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MegaphoneIcon size={64} color={colors.textSecondary + '50'} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginTop: spacing.lg }}>Нет каналов</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }}>
            Создайте свой канал или найдите интересные каналы
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.full, marginTop: spacing.lg }}
            onPress={() => navigation.navigate('Чаты', { screen: 'Create', params: { type: 'channel' } })}
          >
            <Text style={{ color: colors.background, fontWeight: '600' }}>Создать канал</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceLight }}
              onPress={() => navigation.navigate('ChannelDetail', { channelId: item.id })}
            >
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                {item.avatar ? <Image source={{ uri: item.avatar }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : <Text style={{ color: colors.background, fontSize: 22, fontWeight: '700' }}>{item.name[0]}</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MegaphoneIcon size={14} color={colors.accent} />
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: 4 }}>{item.name}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }} numberOfLines={1}>
                  {item.posts?.[item.posts.length - 1]?.content || 'Нет публикаций'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {item.posts?.[item.posts.length - 1]?.timestamp ? new Date(item.posts[item.posts.length - 1].timestamp).toLocaleDateString('ru', { day: 'numeric', month: 'short' }) : ''}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>{item.subscriberCount} подп.</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export const ChannelDetailScreen = ({ route, navigation }: any) => {
  const { channelId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const { channels, profile, publishToChannel, updateChannel } = useStore();
  const channel = channels.find(c => c.id === channelId);
  const [postText, setPostText] = useState('');

  useEffect(() => {
    const poll = async () => {
      if (!channel) return;
      const res = await postRelay('channelPoll', { channelId, since: 0 });
      if (res?.ok && res.posts?.length) {
        const newPosts = res.posts.filter((p: any) => !channel.posts.find(cp => cp.id === p.id));
        if (newPosts.length > 0) updateChannel(channelId, { posts: [...channel.posts, ...newPosts] });
      }
    };
    poll();
    // const interval = setInterval(poll, 5000); // Отключено
    return () => clearInterval(interval);
  }, [channelId]);

  if (!channel) return null;

  const isOwner = channel.ownerId === profile?.fingerprint;

  const addPost = async () => {
    if (!postText.trim() || !profile) return;
    await postRelay('channelPost', { channelId, from: profile.fingerprint, content: postText.trim() });
    publishToChannel(channelId, postText.trim());
    setPostText('');
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!profile) return;
    await postRelay('channelReact', { channelId, postId, emoji, userId: profile.fingerprint });
    const updatedPosts = channel.posts.map(p => {
      if (p.id !== postId) return p;
      const reactions = { ...(p.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      if (!reactions[emoji].includes(profile.fingerprint)) reactions[emoji] = [...reactions[emoji], profile.fingerprint];
      return { ...p, reactions };
    });
    updateChannel(channelId, { posts: updatedPosts });
  };

  const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢'];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.accent} barStyle="light-content" />
      
      {/* Header */}
      <View style={{ backgroundColor: colors.accent, paddingTop: spacing.xl, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
            <BackIcon size={24} color={colors.background} />
          </TouchableOpacity>
          
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm }} onPress={() => navigation.navigate('ChannelSettings', { channelId })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background + '30', justifyContent: 'center', alignItems: 'center' }}>
              {channel.avatar ? <Image source={{ uri: channel.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '700' }}>{channel.name[0]}</Text>}
            </View>
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={{ color: colors.background, fontSize: 18, fontWeight: '600' }} numberOfLines={1}>{channel.name}</Text>
              <Text style={{ color: colors.background + 'CC', fontSize: 13 }}>{channel.subscriberCount} подписчиков</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => navigation.navigate('ChannelSettings', { channelId })} style={{ padding: spacing.sm }}>
            <SettingsGearIcon size={22} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts */}
      <FlatList
        data={[...channel.posts].reverse()}
        keyExtractor={(item) => item.id}
        inverted={false}
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: spacing.md, marginVertical: spacing.sm }}>
            {/* Post card */}
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
              {item.mediaUri && <Image source={{ uri: item.mediaUri }} style={{ width: '100%', height: 200 }} resizeMode="cover" />}
              <View style={{ padding: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
                
                {/* Footer */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <EyeIcon size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>{item.views || 0}</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatTime(item.timestamp)}</Text>
                </View>
                
                {/* Reactions */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
                  {REACTIONS.map(emoji => {
                    const count = item.reactions?.[emoji]?.length || 0;
                    const isReacted = item.reactions?.[emoji]?.includes(profile?.fingerprint || '');
                    return (
                      <TouchableOpacity 
                        key={emoji} 
                        onPress={() => handleReaction(item.id, emoji)} 
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: isReacted ? colors.accent + '30' : colors.surfaceLight, 
                          paddingHorizontal: 10, 
                          paddingVertical: 6, 
                          borderRadius: radius.full,
                          borderWidth: isReacted ? 1 : 0,
                          borderColor: colors.accent
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{emoji}</Text>
                        {count > 0 && <Text style={{ color: isReacted ? colors.accent : colors.text, fontSize: 13, marginLeft: 4, fontWeight: '500' }}>{count}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 }}>
            <MegaphoneIcon size={48} color={colors.textSecondary + '50'} />
            <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>Нет публикаций</Text>
          </View>
        }
        contentContainerStyle={{ paddingVertical: spacing.md }}
      />

      {/* Compose */}
      {isOwner && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.surfaceLight }}>
          <TextInput 
            style={{ flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 16, maxHeight: 100 }} 
            placeholder="Написать публикацию..." 
            placeholderTextColor={colors.textSecondary} 
            value={postText} 
            onChangeText={setPostText} 
            multiline 
          />
          <TouchableOpacity 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: postText.trim() ? colors.accent : colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm }} 
            onPress={addPost}
            disabled={!postText.trim()}
          >
            <SendIcon size={20} color={postText.trim() ? colors.background : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
