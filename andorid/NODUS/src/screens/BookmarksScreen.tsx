import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useTheme } from '../theme';
import { BackIcon, BookmarkIcon, TrashIcon, ImageIcon, VoiceIcon, FileIcon, LocationIcon } from '../components/Icons';
// TODO: Replace with actual bookmark service
interface Bookmark {
  id: string;
  chatId: string;
  text?: string;
  type: string;
  mediaUri?: string;
  savedAt: number;
}

const getBookmarks = (): Bookmark[] => [];
const removeBookmark = (id: string) => {};
const clearAllBookmarks = () => {};
import { useStore } from '../store';

export const BookmarksScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
  const chats = useStore(s => s.chats);

  React.useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  const handleDelete = (id: string) => {
    removeBookmark(id);
    setBookmarks(getBookmarks());
  };

  const handleClearAll = () => {
    Alert.alert('Очистить избранное?', 'Все закладки будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => { clearAllBookmarks(); setBookmarks([]); } }
    ]);
  };

  const openMessage = (b: Bookmark) => {
    const chat = chats.find(c => c.id === b.chatId);
    if (chat) navigation.navigate('ChatDetail', { chatId: chat.id });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': case 'video': case 'videoMessage': return <ImageIcon size={20} color={colors.accent} />;
      case 'voice': return <VoiceIcon size={20} color={colors.accent} />;
      case 'file': return <FileIcon size={20} color={colors.accent} />;
      case 'location': return <LocationIcon size={20} color={colors.accent} />;
      default: return null;
    }
  };

  const renderItem = ({ item }: { item: Bookmark }) => {
    const chat = chats.find(c => c.id === item.chatId);
    return (
      <TouchableOpacity 
        style={{ flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, marginBottom: 1 }}
        onPress={() => openMessage(item)}
      >
        {item.mediaUri ? (
          <Image source={{ uri: item.mediaUri }} style={{ width: 50, height: 50, borderRadius: radius.sm, marginRight: spacing.md }} />
        ) : (
          <View style={{ width: 50, height: 50, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
            {getIcon(item.type) || <BookmarkIcon size={24} color={colors.textSecondary} />}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontSize: 13 }}>{chat?.alias || chat?.username || 'Чат'}</Text>
          <Text style={{ color: colors.text, fontSize: 15, marginTop: 2 }} numberOfLines={2}>
            {item.text || (item.type === 'image' ? 'Фото' : item.type === 'voice' ? 'Голосовое' : item.type === 'file' ? 'Файл' : item.type)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
            {new Date(item.savedAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: spacing.sm }}>
          <TrashIcon size={20} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
          <BackIcon size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: spacing.sm }}>Избранное</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={{ padding: spacing.sm }}>
            <TrashIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {bookmarks.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BookmarkIcon size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: spacing.md }}>Нет сохранённых сообщений</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
