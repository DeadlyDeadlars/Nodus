// User Profile Screen - View other user's profile VK-style
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
// TODO: Replace with actual social service
const socialService = {
  getProfile: async (id: string) => null,
  isFollowing: (id: string) => false,
  getUserPosts: async (id: string) => [],
  toggleFollow: async (id: string, myId: string) => false,
};
import { SocialPost, SocialProfile } from '../types/social';
import { HeartIcon, ChatBubbleIcon, UserIcon, ImageIcon, GridIcon, CheckIcon, MoreIcon, BlockIcon, PhoneIcon, VideoIcon } from '../components/Icons';

const PostMini = ({ post, onPress, colors, radius }: any) => (
  <TouchableOpacity style={[styles.postMini, { backgroundColor: colors.surface, borderRadius: radius.md }]} onPress={onPress}>
    {post.mediaUri ? (
      <Image source={{ uri: post.mediaUri }} style={styles.postMiniImage} />
    ) : (
      <Text style={{ color: colors.text, fontSize: 13, padding: 8 }} numberOfLines={3}>{post.content}</Text>
    )}
    <View style={styles.postMiniStats}>
      <HeartIcon size={12} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 2 }}>{post.likes.length}</Text>
    </View>
  </TouchableOpacity>
);

export const UserProfileScreen = ({ route, navigation }: any) => {
  const { oderId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const { profile, addChat, chats, startCall } = useStore();
  const myId = profile?.fingerprint || '';

  const [userProfile, setUserProfile] = useState<SocialProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [oderId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Try social service first
      const prof = await socialService.getProfile(oderId);
      
      // Also check chat data
      const chat = chats.find(c => c.fingerprint === oderId || c.peerId === oderId);
      
      if (prof) {
        setUserProfile(prof);
      } else if (chat) {
        // Use chat data as fallback
        setUserProfile({
          oderId,
          alias: chat.alias,
          username: chat.username,
          avatar: chat.avatar,
          bio: chat.bio,
          isOnline: chat.isOnline,
          lastSeen: chat.lastSeen,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          isPrivate: false,
          createdAt: Date.now(),
        } as SocialProfile);
      }
      
      setIsFollowing(socialService.isFollowing(oderId));
      
      const userPosts = await socialService.getUserPosts(oderId);
      setPosts(userPosts);
    } catch (e) {
      __DEV__ && console.error('Load profile error:', e);
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    const nowFollowing = await socialService.toggleFollow(oderId, myId);
    setIsFollowing(nowFollowing);
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        followersCount: userProfile.followersCount + (nowFollowing ? 1 : -1),
      });
    }
  };

  const handleMessage = () => {
    // Check if chat exists
    const existingChat = chats.find(c => c.peerId === oderId || c.fingerprint === oderId);
    if (existingChat) {
      navigation.navigate('ChatDetail', { chatId: existingChat.id });
    } else {
      // Create new chat
      const newChat = {
        id: `chat_${Date.now()}`,
        peerId: oderId,
        fingerprint: oderId,
        alias: userProfile?.alias,
        avatar: userProfile?.avatar,
        isOnline: userProfile?.isOnline || false,
        messages: [],
      };
      addChat(newChat);
      navigation.navigate('ChatDetail', { chatId: newChat.id });
    }
  };

  const handleCall = (type: 'voice' | 'video') => {
    startCall(oderId, type);
  };

  const handleMore = () => {
    Alert.alert('Действия', '', [
      { text: 'Заблокировать', style: 'destructive', onPress: () => Alert.alert('Заблокировано') },
      { text: 'Пожаловаться', onPress: () => Alert.alert('Жалоба отправлена') },
      { text: 'Скопировать ссылку', onPress: () => {} },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const filteredPosts = activeTab === 'media' ? posts.filter(p => p.mediaUri) : posts;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 24 }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {userProfile?.alias || 'Профиль'}
        </Text>
        <TouchableOpacity onPress={handleMore} style={styles.moreBtn}>
          <MoreIcon size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Cover */}
      <View style={[styles.cover, { backgroundColor: colors.accent + '40' }]}>
        {userProfile?.coverImage && (
          <Image source={{ uri: userProfile.coverImage }} style={styles.coverImage} />
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        {userProfile?.avatar ? (
          <Image source={{ uri: userProfile.avatar }} style={[styles.avatar, { borderColor: colors.background }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.accent, borderColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <UserIcon size={40} color={colors.background} />
          </View>
        )}
        {userProfile?.isOnline && (
          <View style={[styles.onlineBadge, { backgroundColor: colors.success, borderColor: colors.background }]} />
        )}
      </View>

      {/* Info */}
      <View style={[styles.infoSection, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.name, { color: colors.text }]}>
          {userProfile?.alias || 'Пользователь'}
        </Text>

        {userProfile?.username && (
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{userProfile.username}</Text>
        )}

        {userProfile?.bio && (
          <Text style={[styles.bio, { color: colors.text }]}>{userProfile.bio}</Text>
        )}

        {userProfile?.lastSeen && !userProfile.isOnline && (
          <Text style={[styles.lastSeen, { color: colors.textSecondary }]}>
            был(а) {getLastSeenText(userProfile.lastSeen)}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
        <TouchableOpacity 
          style={[
            styles.followBtn, 
            { 
              backgroundColor: isFollowing ? colors.surfaceLight : colors.accent,
              borderRadius: radius.full,
              flex: 1,
            }
          ]}
          onPress={handleFollow}
        >
          {isFollowing ? (
            <>
              <CheckIcon size={18} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '600', marginLeft: 6 }}>Подписан</Text>
            </>
          ) : (
            <Text style={{ color: colors.background, fontWeight: '600' }}>Подписаться</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.messageBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]}
          onPress={handleMessage}
        >
          <ChatBubbleIcon size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.messageBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]}
          onPress={() => handleCall('voice')}
        >
          <PhoneIcon size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.messageBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]}
          onPress={() => handleCall('video')}
        >
          <VideoIcon size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{userProfile?.postsCount || posts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>постов</Text>
        </View>
        <TouchableOpacity style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{userProfile?.followersCount || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>подписчиков</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{userProfile?.followingCount || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>подписок</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border, marginTop: spacing.lg }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('posts')}
        >
          <GridIcon size={20} color={activeTab === 'posts' ? colors.accent : colors.textSecondary} />
          <Text style={{ color: activeTab === 'posts' ? colors.accent : colors.textSecondary, marginLeft: 6 }}>Записи</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'media' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('media')}
        >
          <ImageIcon size={20} color={activeTab === 'media' ? colors.accent : colors.textSecondary} />
          <Text style={{ color: activeTab === 'media' ? colors.accent : colors.textSecondary, marginLeft: 6 }}>Фото</Text>
        </TouchableOpacity>
      </View>

      {/* Posts Grid */}
      <View style={[styles.postsGrid, { padding: spacing.sm }]}>
        {filteredPosts.map(post => (
          <PostMini 
            key={post.id} 
            post={post} 
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            colors={colors}
            radius={radius}
          />
        ))}
        {filteredPosts.length === 0 && (
          <View style={styles.emptyPosts}>
            <Text style={{ color: colors.textSecondary }}>
              {activeTab === 'posts' ? 'Нет записей' : 'Нет фотографий'}
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

function getLastSeenText(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д назад`;
  return new Date(timestamp).toLocaleDateString('ru');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 48 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  cover: { height: 100 },
  coverImage: { width: '100%', height: '100%' },
  avatarSection: { alignItems: 'center', marginTop: -50 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4 },
  onlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  infoSection: { alignItems: 'center', marginTop: 12 },
  name: { fontSize: 22, fontWeight: '700' },
  username: { fontSize: 14, marginTop: 4 },
  bio: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  lastSeen: { fontSize: 12, marginTop: 8 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  postMini: { width: '32%', aspectRatio: 1, overflow: 'hidden' },
  postMiniImage: { width: '100%', height: '100%' },
  postMiniStats: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center' },
  emptyPosts: { width: '100%', paddingVertical: 40, alignItems: 'center' },
});
