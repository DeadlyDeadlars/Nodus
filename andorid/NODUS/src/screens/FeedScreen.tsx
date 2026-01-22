// Feed Screen - Social Network
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, RefreshControl, Modal, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { socialService } from '../services/social';
import { SocialPost, SocialComment } from '../types/social';
import { HeartIcon, ChatBubbleIcon, ShareIcon, PlusIcon, CloseIcon, SendIcon, ImageIcon, UserIcon } from '../components/Icons';

const PostCard = ({ post, myId, onLike, onComment, onRepost, onProfile, colors, spacing, radius }: any) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const isLiked = post.likes.includes(myId);
  const timeAgo = getTimeAgo(post.timestamp);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onComment(post.id, newComment.trim());
      setNewComment('');
    }
  };

  return (
    <View style={[styles.postCard, { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md }]}>
      {/* Header */}
      <TouchableOpacity style={styles.postHeader} onPress={() => onProfile(post.authorId)}>
        {post.authorAvatar ? (
          <Image source={{ uri: post.authorAvatar }} style={[styles.avatar, { borderRadius: radius.full }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' }]}>
            <UserIcon size={20} color={colors.background} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {post.isAnonymous ? 'Аноним' : (post.authorAlias || post.authorId.slice(0, 8))}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>

      {/* Repost indicator */}
      {post.repostOf && (
        <View style={[styles.repostBadge, { backgroundColor: colors.surfaceLight, borderRadius: radius.sm }]}>
          <ShareIcon size={12} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>Репост</Text>
        </View>
      )}

      {/* Content */}
      {post.content ? <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text> : null}

      {/* Media */}
      {post.mediaUri && (
        <Image source={{ uri: post.mediaUri }} style={[styles.postMedia, { borderRadius: radius.md }]} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <HeartIcon size={20} color={isLiked ? colors.error : colors.textSecondary} filled={isLiked} />
          <Text style={[styles.actionText, { color: isLiked ? colors.error : colors.textSecondary }]}>
            {post.likes.length || ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(!showComments)}>
          <ChatBubbleIcon size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {post.comments.length || ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onRepost(post.id)}>
          <ShareIcon size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {post.reposts.length || ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments */}
      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
          {post.comments.slice(0, 3).map((cmt: SocialComment) => (
            <View key={cmt.id} style={styles.comment}>
              <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>
                {cmt.isAnonymous ? 'Аноним' : (cmt.authorAlias || cmt.authorId.slice(0, 8))}
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>{cmt.content}</Text>
            </View>
          ))}
          {post.comments.length > 3 && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm }}>
              Ещё {post.comments.length - 3} комментариев...
            </Text>
          )}
          <View style={[styles.commentInput, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]}>
            <TextInput
              style={{ flex: 1, color: colors.text, paddingHorizontal: spacing.md }}
              placeholder="Комментарий..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={handleAddComment}>
              <SendIcon size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export const FeedScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const { profile } = useStore();
  const myId = profile?.fingerprint || '';

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'explore'>('feed');

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = activeTab === 'feed' 
        ? await socialService.getFeed(myId)
        : await socialService.getExploreFeed();
      setPosts(data);
    } catch (e) {
      __DEV__ && console.error('Load posts error:', e);
    }
    setRefreshing(false);
  }, [myId, activeTab]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleLike = async (postId: string) => {
    await socialService.toggleLike(postId, myId);
    loadPosts();
  };

  const handleComment = async (postId: string, content: string) => {
    await socialService.addComment(postId, content, myId);
    loadPosts();
  };

  const handleRepost = async (postId: string) => {
    Alert.alert('Репост', 'Добавить комментарий к репосту?', [
      { text: 'Без комментария', onPress: () => socialService.repost(postId, myId).then(loadPosts) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleProfile = (oderId: string) => {
    if (oderId === myId) {
      navigation.navigate('MyProfile');
    } else {
      navigation.navigate('UserProfile', { oderId });
    }
  };

  const pickMedia = async () => {
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8 });
    if (result.assets?.[0]?.uri) {
      setNewPostMedia(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() && !newPostMedia) return;
    
    try {
      // Get private key from store for signing
      const privateKey = new Uint8Array(32); // TODO: Get from crypto service
      await socialService.createPost(newPostText, myId, privateKey, {
        mediaUri: newPostMedia || undefined,
        mediaType: newPostMedia?.includes('video') ? 'video' : 'image',
        isAnonymous,
      });
      setNewPostText('');
      setNewPostMedia(null);
      setIsAnonymous(false);
      setCreateModal(false);
      loadPosts();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать пост');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }]}>
        <Text style={[styles.title, { color: colors.text }]}>Лента</Text>
        <TouchableOpacity 
          style={[styles.createBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]}
          onPress={() => setCreateModal(true)}
        >
          <PlusIcon size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feed' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={{ color: activeTab === 'feed' ? colors.accent : colors.textSecondary, fontWeight: '600' }}>
            Подписки
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'explore' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('explore')}
        >
          <Text style={{ color: activeTab === 'explore' ? colors.accent : colors.textSecondary, fontWeight: '600' }}>
            Интересное
          </Text>
        </TouchableOpacity>
      </View>

      {/* Posts */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            myId={myId}
            onLike={handleLike}
            onComment={handleComment}
            onRepost={handleRepost}
            onProfile={handleProfile}
            colors={colors}
            spacing={spacing}
            radius={radius}
          />
        )}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadPosts} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              {activeTab === 'feed' ? 'Подпишитесь на кого-нибудь' : 'Нет постов'}
            </Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.createModal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <CloseIcon size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Новый пост</Text>
              <TouchableOpacity onPress={handleCreatePost}>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>Опубликовать</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.postInput, { color: colors.text }]}
              placeholder="Что нового?"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={newPostText}
              onChangeText={setNewPostText}
            />

            {newPostMedia && (
              <View style={{ position: 'relative', marginBottom: spacing.md }}>
                <Image source={{ uri: newPostMedia }} style={[styles.previewMedia, { borderRadius: radius.md }]} />
                <TouchableOpacity 
                  style={[styles.removeMedia, { backgroundColor: colors.error }]}
                  onPress={() => setNewPostMedia(null)}
                >
                  <CloseIcon size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
                <ImageIcon size={24} color={colors.accent} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.anonToggle, isAnonymous && { backgroundColor: colors.accent + '30' }]}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                <UserIcon size={18} color={isAnonymous ? colors.accent : colors.textSecondary} />
                <Text style={{ color: isAnonymous ? colors.accent : colors.textSecondary, marginLeft: 6, fontSize: 13 }}>
                  Анонимно
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д`;
  return new Date(timestamp).toLocaleDateString('ru');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  createBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: 24 },
  tab: { paddingBottom: 8 },
  postCard: { padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40 },
  authorName: { fontSize: 15, fontWeight: '600' },
  timeAgo: { fontSize: 12, marginTop: 2 },
  repostBadge: { flexDirection: 'row', alignItems: 'center', padding: 6, marginBottom: 8, alignSelf: 'flex-start' },
  postContent: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postMedia: { width: '100%', height: 200, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14 },
  commentsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  comment: { marginBottom: 8 },
  commentInput: { flexDirection: 'row', alignItems: 'center', marginTop: 8, height: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  createModal: { padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  postInput: { fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  previewMedia: { width: '100%', height: 150 },
  removeMedia: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mediaBtn: { padding: 8 },
  anonToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
});
