// My Profile Screen - VK style
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Modal, RefreshControl } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { socialService } from '../services/social';
import { SocialPost } from '../types/social';
import { EditIcon, CameraIcon, SettingsIcon, HeartIcon, UserIcon, ChatBubbleIcon, ShareIcon, TrashIcon, CloseIcon } from '../components/Icons';
import { CustomAlert } from '../components/CustomAlert';

const getTimeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} д`;
};

export const MyProfileScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const { profile, updateProfile } = useStore();
  const myId = profile?.fingerprint || '';

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editAlias, setEditAlias] = useState(profile?.alias || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editUsername, setEditUsername] = useState(profile?.username || '');
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [deleteAlert, setDeleteAlert] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const userPosts = await socialService.getUserPosts(myId);
    setPosts(userPosts);
    setRefreshing(false);
  }, [myId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const pickAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) updateProfile({ avatar: result.assets[0].uri });
  };

  const handleSaveProfile = async () => {
    try {
      updateProfile({ alias: editAlias, bio: editBio, username: editUsername });
      await socialService.updateProfile({ alias: editAlias, bio: editBio, username: editUsername }, myId);
      
      // ✅ КРИТИЧНО: Публикуем профиль на relay для поиска
      const updatedProfile = { ...profile, alias: editAlias, bio: editBio, username: editUsername };
      const RELAY_URL = 'http://194.87.103.193:3000/relay'; // TODO: Move to config
      const publishResult = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publishProfile',
          profile: updatedProfile,
          fingerprint: myId
        })
      });
      
      const result = await publishResult.json();
      if (!result.ok) {
        console.error('[Profile] Publish failed:', result);
      } else {
        console.log('[Profile] Published successfully');
      }
      
      setEditModal(false);
    } catch (e) {
      console.error('[Profile] Save error:', e);
    }
  };

  const confirmDelete = async () => {
    if (!selectedPost) return;
    await socialService.deletePost(selectedPost.id, myId);
    setSelectedPost(null);
    setDeleteAlert(false);
    loadData();
  };

  const stats = { posts: posts.length, followers: socialService.getFollowers().length, following: socialService.getFollowing().length };

  const renderHeader = () => (
    <View>
      <View style={[styles.header, { padding: spacing.lg }]}>
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={[styles.avatar, { borderRadius: radius.full }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' }]}>
              <UserIcon size={32} color={colors.background} />
            </View>
          )}
          <View style={[styles.cameraBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]}>
            <CameraIcon size={12} color={colors.background} />
          </View>
        </TouchableOpacity>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={[styles.statNum, { color: colors.text }]}>{stats.posts}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>постов</Text></View>
          <View style={styles.stat}><Text style={[styles.statNum, { color: colors.text }]}>{stats.followers}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>подписчиков</Text></View>
          <View style={styles.stat}><Text style={[styles.statNum, { color: colors.text }]}>{stats.following}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>подписок</Text></View>
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.alias || 'Пользователь'}</Text>
        {profile?.username && <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>}
        {profile?.bio && <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>}
      </View>
      <View style={[styles.actions, { padding: spacing.lg, gap: spacing.sm }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.surface, borderRadius: radius.md, flex: 1 }]} onPress={() => setEditModal(true)}>
          <EditIcon size={16} color={colors.accent} />
          <Text style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '500' }}>Редактировать</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.surface, borderRadius: radius.md }]} onPress={() => navigation.navigate('Настройки')}>
          <SettingsIcon size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={{ height: spacing.md }} />
    </View>
  );

  const renderPost = ({ item }: { item: SocialPost }) => (
    <TouchableOpacity 
      style={[styles.postCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg }]}
      onLongPress={() => setSelectedPost(item)}
      activeOpacity={0.8}
    >
      <View style={styles.postHeader}>
        {profile?.avatar ? (
          <Image source={{ uri: profile.avatar }} style={[styles.postAvatar, { borderRadius: radius.full }]} />
        ) : (
          <View style={[styles.postAvatar, { backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' }]}>
            <UserIcon size={16} color={colors.background} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.postAuthor, { color: colors.text }]}>{profile?.alias || 'Пользователь'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{getTimeAgo(item.timestamp)}</Text>
        </View>
      </View>
      {item.content ? <Text style={[styles.postContent, { color: colors.text }]}>{item.content}</Text> : null}
      {item.mediaUri && <Image source={{ uri: item.mediaUri }} style={[styles.postMedia, { borderRadius: radius.md }]} resizeMode="cover" />}
      <View style={styles.postActions}>
        <View style={styles.actionBtn}><HeartIcon size={18} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, marginLeft: 4 }}>{item.likes.length || ''}</Text></View>
        <View style={styles.actionBtn}><ChatBubbleIcon size={18} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, marginLeft: 4 }}>{item.comments.length || ''}</Text></View>
        <View style={styles.actionBtn}><ShareIcon size={18} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, marginLeft: 4 }}>{item.reposts.length || ''}</Text></View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={colors.accent} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ color: colors.textSecondary }}>Нет постов</Text></View>}
      />

      <Modal visible={editModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Редактировать профиль</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Имя</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, borderRadius: radius.md }]} value={editAlias} onChangeText={setEditAlias} placeholder="Имя" placeholderTextColor={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text, borderRadius: radius.md }]} value={editUsername} onChangeText={setEditUsername} placeholder="username" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>О себе</Text>
            <TextInput style={[styles.input, styles.bioInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderRadius: radius.md }]} value={editBio} onChangeText={setEditBio} placeholder="О себе" placeholderTextColor={colors.textSecondary} multiline />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]} onPress={() => setEditModal(false)}><Text style={{ color: colors.text, fontWeight: '600' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]} onPress={handleSaveProfile}><Text style={{ color: colors.background, fontWeight: '600' }}>Сохранить</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedPost} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]} activeOpacity={1} onPress={() => setSelectedPost(null)}>
          <View style={[styles.postMenu, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setDeleteAlert(true)}>
              <TrashIcon size={20} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 12, fontSize: 16 }}>Удалить пост</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setSelectedPost(null)}>
              <CloseIcon size={20} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginLeft: 12, fontSize: 16 }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert visible={deleteAlert} title="Удалить пост?" message="Это действие нельзя отменить" buttons={[{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: confirmDelete }]} onClose={() => setDeleteAlert(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 16 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  name: { fontSize: 18, fontWeight: '700' },
  username: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: 'row' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  postCard: { padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 36, height: 36 },
  postAuthor: { fontSize: 14, fontWeight: '600' },
  postContent: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postMedia: { width: '100%', height: 200, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modal: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: { padding: 12, fontSize: 16 },
  bioInput: { height: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  postMenu: { padding: 20, marginHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
});
