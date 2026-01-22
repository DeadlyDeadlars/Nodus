import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Image, ScrollView, Animated, Clipboard, Share } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { Chat } from '../types';
import { ArchiveIcon, FolderIcon, CloseIcon, PlusIcon, SearchIcon, UsersIcon, ChannelIcon, PinIcon, UnpinIcon, BellIcon, BellOffIcon, BoxIcon, BroomIcon, BlockIcon, TrashIcon, DraftIcon, EncryptedIcon, BackIcon, CircleIcon } from '../components/Icons';
import { StoriesBar } from '../components/StoriesBar';

// Placeholder
const messageQueue = { sendMessage: (m: any) => {} };

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const ChatsScreen = ({ navigation }: any) => {
  const { colors, spacing, radius, density } = useTheme();
  const { chats, pinChat, searchQuery, setSearchQuery, archiveChat, unarchiveChat, setChatFolder, settings, profile, removeChat, muteChat, blockChat, clearChat, myPeerId } = useStore();
  
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [folderModal, setFolderModal] = useState<string | null>(null);
  const [chatMenuModal, setChatMenuModal] = useState<Chat | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);

  const folders = settings.folders || [];
  
  const filteredChats = chats.filter(chat => {
    if (chat.isHidden) return false;
    if (showArchive) return chat.isArchived;
    if (chat.isArchived) return false;
    if (activeFolder && chat.folder !== activeFolder) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (chat.alias?.toLowerCase().includes(query) || chat.username?.toLowerCase().includes(query) || chat.peerId.toLowerCase().includes(query) || chat.lastMessage?.toLowerCase().includes(query));
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
  });

  const avatarSize = density === 'compact' ? 44 : density === 'comfortable' ? 64 : 56;
  const fontSize = density === 'compact' ? 14 : density === 'comfortable' ? 18 : 16;

  const handleDeleteChat = (forBoth: boolean) => {
    if (!chatMenuModal) return;
    if (forBoth) {
      const targetId = chatMenuModal.fingerprint || chatMenuModal.peerId;
      messageQueue.sendMessage({
        id: 'del_' + Date.now(),
        chatId: chatMenuModal.id,
        peerId: targetId,
        content: JSON.stringify({ type: 'chat_deleted' }),
        type: 'delete',
        createdAt: Date.now(),
        retries: 0
      });
    }
    removeChat(chatMenuModal.id);
    setDeleteConfirmModal(false);
    setChatMenuModal(null);
  };

  const ChatItem = ({ chat }: { chat: Chat }) => {
    const hasCustomAvatar = chat.avatar && (chat.avatar.startsWith('file://') || chat.avatar.startsWith('content://') || chat.avatar.startsWith('http') || chat.avatar.startsWith('data:'));
    const isGroup = chat.isGroup;
    const isChannel = chat.peerId?.startsWith('channel:');
    const avatarLetter = (chat.alias || chat.username || chat.peerId || 'U')[0].toUpperCase();
    const swipeRef = useRef<Swipeable>(null);

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
      const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
      return (
        <Animated.View style={{ width: 80, transform: [{ translateX: trans }] }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: colors.accent, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }} onPress={() => { setFolderModal(chat.id); swipeRef.current?.close(); }}>
            <FolderIcon size={24} color={colors.background} />
            <Text style={{ color: colors.background, fontSize: 10, marginTop: 2 }}>Папка</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
      const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
      return (
        <Animated.View style={{ width: 80, transform: [{ translateX: trans }] }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: chat.isArchived ? colors.online : colors.textSecondary, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }} onPress={() => { chat.isArchived ? unarchiveChat(chat.id) : archiveChat(chat.id); swipeRef.current?.close(); }}>
            <ArchiveIcon size={24} color={colors.background} />
            <Text style={{ color: colors.background, fontSize: 10, marginTop: 2 }}>{chat.isArchived ? 'Вернуть' : 'Архив'}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    const handlePress = () => {
      if (isChannel) {
        const channelId = chat.peerId.replace('channel:', '');
        navigation.navigate('ChannelDetail', { channelId });
      } else {
        navigation.navigate('ChatDetail', { chatId: chat.id });
      }
    };
    
    return (
      <Swipeable ref={swipeRef} renderLeftActions={renderLeftActions} renderRightActions={renderRightActions} overshootLeft={false} overshootRight={false}>
        <TouchableOpacity style={[styles.chatItem, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm }]} onPress={handlePress} onLongPress={() => setChatMenuModal(chat)} activeOpacity={0.7}>
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: isGroup ? radius.lg : radius.full, backgroundColor: colors.accent, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }]}>
            {hasCustomAvatar ? <Image source={{ uri: chat.avatar }} style={{ width: avatarSize, height: avatarSize }} resizeMode="cover" /> : isGroup ? <UsersIcon size={avatarSize * 0.5} color={colors.background} /> : isChannel ? <ChannelIcon size={avatarSize * 0.5} color={colors.background} /> : <Text style={{ color: colors.background, fontSize: avatarSize * 0.45, fontWeight: '700' }}>{avatarLetter}</Text>}
            {!isGroup && !isChannel && <View style={[styles.statusIndicator, { backgroundColor: chat.isOnline ? colors.online : colors.offline, borderColor: colors.surface }]} />}
          </View>
          <View style={[styles.chatInfo, { marginLeft: spacing.md }]}>
            <View style={styles.chatHeader}>
              <View style={styles.nameRow}>
                {chat.isPinned && <PinIcon size={12} color={colors.accent} />}
                {isGroup && <UsersIcon size={12} color={colors.accent} />}
                {isChannel && <ChannelIcon size={12} color={colors.accent} />}
                <Text style={{ color: colors.text, fontSize, fontWeight: '600', flex: 1, marginLeft: (chat.isPinned || isGroup || isChannel) ? 4 : 0 }} numberOfLines={1}>{chat.alias || chat.username || `${chat.peerId.slice(0, 8)}...`}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatTime(chat.lastMessageTime)}</Text>
            </View>
            {chat.username && <Text style={{ color: colors.accent, fontSize: 12, marginBottom: 2 }}>@{chat.username}</Text>}
            <View style={styles.messageRow}>
              {chat.draft ? (
                <>
                  <DraftIcon size={12} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: fontSize - 2, flex: 1, marginLeft: 4 }} numberOfLines={1}>{chat.draft}</Text>
                </>
              ) : chat.isTyping ? (
                <Text style={{ color: colors.accent, fontSize: fontSize - 2, flex: 1, fontStyle: 'italic' }}>печатает...</Text>
              ) : (
                <>
                  <EncryptedIcon size={12} color={colors.accent} />
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize - 2, flex: 1, marginLeft: 4 }} numberOfLines={1}>{chat.lastMessage || (isGroup ? 'Группа' : isChannel ? 'Канал' : 'Зашифрованный чат')}</Text>
                </>
              )}
              {(chat.unreadCount ?? 0) > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.accent, borderRadius: radius.full }]}>
                  <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>{chat.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const archivedCount = chats.filter(c => c.isArchived && !c.isHidden).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md }]}>
        <Text style={{ color: colors.text, fontSize: density === 'compact' ? 24 : 28, fontWeight: '700' }}>{showArchive ? 'Архив' : 'Чаты'}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {showArchive ? (
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]} onPress={() => setShowArchive(false)}>
              <BackIcon size={18} color={colors.accent} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]} onPress={() => navigation.navigate('Create')}>
                <PlusIcon size={18} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderRadius: radius.full }]} onPress={() => navigation.navigate('GlobalSearch')}>
                <SearchIcon size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {!showArchive && folders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: spacing.sm }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <TouchableOpacity style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: activeFolder === null ? colors.accent : colors.surface }} onPress={() => setActiveFolder(null)}>
            <Text style={{ color: activeFolder === null ? colors.background : colors.textSecondary, fontWeight: '600' }}>Все</Text>
          </TouchableOpacity>
          {folders.map(f => (
            <TouchableOpacity key={f} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: activeFolder === f ? colors.accent : colors.surface }} onPress={() => setActiveFolder(f)}>
              <Text style={{ color: activeFolder === f ? colors.background : colors.textSecondary, fontWeight: '600' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!showArchive && !searchVisible && <StoriesBar />}

      {!showArchive && archivedCount > 0 && (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg }} onPress={() => setShowArchive(true)}>
          <ArchiveIcon size={20} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }}>Архив</Text>
          <Text style={{ color: colors.textSecondary }}>{archivedCount}</Text>
        </TouchableOpacity>
      )}

      {searchVisible && (
        <View style={[styles.searchContainer, { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md }]}>
          <TextInput style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.md }} value={searchQuery} onChangeText={setSearchQuery} placeholder="Поиск чатов..." placeholderTextColor={colors.textSecondary} autoFocus />
          <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => { setSearchVisible(false); setSearchQuery(''); }}>
            <CloseIcon size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      
      {sortedChats.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <CircleIcon size={36} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: spacing.sm }}>{searchQuery ? 'Ничего не найдено' : 'Нет активных чатов'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{searchQuery ? 'Попробуйте другой запрос' : 'Добавьте пользователя или\nсоздайте группу'}</Text>
          {!searchQuery && (
            <TouchableOpacity style={{ backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, marginTop: spacing.lg }} onPress={() => navigation.navigate('Create')}>
              <Text style={{ color: colors.background, fontWeight: '600' }}>Создать</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList data={sortedChats} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChatItem chat={item} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }} initialNumToRender={15} maxToRenderPerBatch={10} removeClippedSubviews />
      )}

      <Modal visible={!!folderModal} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { padding: spacing.lg }]} activeOpacity={1} onPress={() => setFolderModal(null)}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>Выбрать папку</Text>
            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => { if (folderModal) setChatFolder(folderModal, undefined); setFolderModal(null); }}>
              <Text style={{ color: colors.textSecondary }}>Без папки</Text>
            </TouchableOpacity>
            {folders.map(f => (
              <TouchableOpacity key={f} style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => { if (folderModal) setChatFolder(folderModal, f); setFolderModal(null); }}>
                <Text style={{ color: colors.text }}>{f}</Text>
              </TouchableOpacity>
            ))}
            {folders.length === 0 && <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Нет папок. Создайте в настройках.</Text>}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!chatMenuModal} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { padding: spacing.lg }]} activeOpacity={1} onPress={() => setChatMenuModal(null)}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' }}>{chatMenuModal?.alias || chatMenuModal?.username || chatMenuModal?.peerId?.slice(0, 12)}</Text>
            
            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (chatMenuModal) { pinChat(chatMenuModal.id); setChatMenuModal(null); } }}>
              {chatMenuModal?.isPinned ? <UnpinIcon size={18} color={colors.text} /> : <PinIcon size={18} color={colors.text} />}
              <Text style={{ color: colors.text, flex: 1, marginLeft: spacing.md }}>{chatMenuModal?.isPinned ? 'Открепить' : 'Закрепить'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (chatMenuModal) { muteChat(chatMenuModal.id); setChatMenuModal(null); } }}>
              {chatMenuModal?.isMuted ? <BellIcon size={18} color={colors.text} /> : <BellOffIcon size={18} color={colors.text} />}
              <Text style={{ color: colors.text, flex: 1, marginLeft: spacing.md }}>{chatMenuModal?.isMuted ? 'Включить уведомления' : 'Отключить уведомления'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (chatMenuModal) { chatMenuModal.isArchived ? unarchiveChat(chatMenuModal.id) : archiveChat(chatMenuModal.id); setChatMenuModal(null); } }}>
              <BoxIcon size={18} color={colors.text} />
              <Text style={{ color: colors.text, flex: 1, marginLeft: spacing.md }}>{chatMenuModal?.isArchived ? 'Разархивировать' : 'Архивировать'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setFolderModal(chatMenuModal?.id || null); setChatMenuModal(null); }}>
              <FolderIcon size={18} color={colors.text} />
              <Text style={{ color: colors.text, flex: 1, marginLeft: spacing.md }}>Переместить в папку</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (chatMenuModal) { clearChat(chatMenuModal.id); setChatMenuModal(null); } }}>
              <BroomIcon size={18} color={colors.text} />
              <Text style={{ color: colors.text, flex: 1, marginLeft: spacing.md }}>Очистить историю</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => { if (chatMenuModal) { blockChat(chatMenuModal.id); setChatMenuModal(null); } }}>
              <BlockIcon size={18} color={chatMenuModal?.isBlocked ? colors.text : colors.error} />
              <Text style={{ color: chatMenuModal?.isBlocked ? colors.text : colors.error, flex: 1, marginLeft: spacing.md }}>{chatMenuModal?.isBlocked ? 'Разблокировать' : 'Заблокировать'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.error + '20', borderRadius: radius.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => setDeleteConfirmModal(true)}>
              <TrashIcon size={18} color={colors.error} />
              <Text style={{ color: colors.error, flex: 1, marginLeft: spacing.md }}>Удалить чат</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, marginTop: spacing.sm }} onPress={() => setChatMenuModal(null)}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={deleteConfirmModal} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { padding: spacing.lg }]} activeOpacity={1} onPress={() => setDeleteConfirmModal(false)}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' }}>Удалить чат?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing.lg, textAlign: 'center' }}>Выберите как удалить чат</Text>
            
            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => handleDeleteChat(false)}>
              <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Удалить только у меня</Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 4 }}>Чат останется у собеседника</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, backgroundColor: colors.error + '20', borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => handleDeleteChat(true)}>
              <Text style={{ color: colors.error, textAlign: 'center', fontWeight: '600' }}>Удалить у обоих</Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 4 }}>Чат будет удалён у вас и собеседника</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '100%', padding: spacing.md, marginTop: spacing.sm }} onPress={() => setDeleteConfirmModal(false)}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  chatItem: { flexDirection: 'row', alignItems: 'center' },
  avatar: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'center' },
  unreadBadge: { minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 400, alignItems: 'center' },
});
