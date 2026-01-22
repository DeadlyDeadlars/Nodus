import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../theme';
import { BackIcon, ClockIcon, TrashIcon, SendIcon } from '../components/Icons';
// TODO: Replace with actual scheduled messages service
interface ScheduledMessage {
  id: string;
  chatId: string;
  text: string;
  scheduledAt: number;
  silent?: boolean;
}

const getScheduledMessages = (): ScheduledMessage[] => [];
const removeScheduledMessage = (id: string) => {};
import { useStore } from '../store';

export const ScheduledMessagesScreen = ({ navigation, route }: any) => {
  const { chatId } = route.params || {};
  const { colors, spacing, radius } = useTheme();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const chats = useStore(s => s.chats);

  React.useEffect(() => {
    const all = getScheduledMessages();
    setMessages(chatId ? all.filter(m => m.chatId === chatId) : all);
  }, [chatId]);

  const handleDelete = (id: string) => {
    Alert.alert('Удалить?', 'Сообщение не будет отправлено', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => {
        removeScheduledMessage(id);
        setMessages(prev => prev.filter(m => m.id !== id));
      }}
    ]);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0, 5)}`;
  };

  const renderItem = ({ item }: { item: ScheduledMessage }) => {
    const chat = chats.find(c => c.id === item.chatId);
    return (
      <View style={{ backgroundColor: colors.surface, marginBottom: 1, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <ClockIcon size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 13, marginLeft: spacing.xs }}>{formatDate(item.scheduledAt)}</Text>
          {item.silent && <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: spacing.sm }}>🔕</Text>}
        </View>
        {!chatId && (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs }}>
            → {chat?.alias || chat?.username || 'Чат'}
          </Text>
        )}
        <Text style={{ color: colors.text, fontSize: 15 }} numberOfLines={3}>{item.text}</Text>
        <TouchableOpacity 
          onPress={() => handleDelete(item.id)} 
          style={{ position: 'absolute', top: spacing.md, right: spacing.md }}
        >
          <TrashIcon size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
          <BackIcon size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: spacing.sm }}>
          Запланированные
        </Text>
      </View>

      {messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ClockIcon size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: spacing.md }}>Нет запланированных сообщений</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
