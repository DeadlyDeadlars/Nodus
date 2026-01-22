import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../theme';
import { BackIcon, EyeIcon, UsersIcon, ChartIcon } from '../components/Icons';
import { useStore } from '../store';

// Placeholders
const getChannelStats = (id: string) => ({ views: 0, subscribers: 0, posts: 0, engagement: 0 });
const getTotalViews = (id: string) => 0;

const { width } = Dimensions.get('window');

export const ChannelStatsScreen = ({ navigation, route }: any) => {
  const { channelId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const channel = useStore(s => s.channels.find(c => c.id === channelId));
  const stats = getChannelStats(channelId);
  const totalViews = getTotalViews(channelId);

  const maxSubs = Math.max(...(stats.subscribersHistory.map(h => h.count) || [1]), 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
          <BackIcon size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: spacing.sm }}>Статистика</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{channel?.name || 'Канал'}</Text>
          
          {/* Summary cards */}
          <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
              <UsersIcon size={28} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.sm }}>
                {channel?.subscriberCount || 0}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Подписчиков</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
              <EyeIcon size={28} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.sm }}>{totalViews}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Просмотров</Text>
            </View>
          </View>

          {/* Subscribers chart */}
          {stats.subscribersHistory.length > 1 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md }}>Подписчики</Text>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
                  {stats.subscribersHistory.slice(-14).map((h, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ 
                        width: '80%', 
                        height: (h.count / maxSubs) * 100, 
                        backgroundColor: colors.accent, 
                        borderRadius: 4 
                      }} />
                      <Text style={{ color: colors.textSecondary, fontSize: 8, marginTop: 4 }}>
                        {h.date.slice(5)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Top posts */}
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md }}>Топ публикаций</Text>
            {Object.entries(stats.views)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([postId, views], i) => (
                <View key={postId} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: colors.surface, 
                  padding: spacing.md, 
                  borderRadius: radius.md,
                  marginBottom: spacing.sm 
                }}>
                  <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700', width: 30 }}>#{i + 1}</Text>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14 }} numberOfLines={1}>Пост {postId.slice(-6)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <EyeIcon size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }}>{views}</Text>
                  </View>
                </View>
              ))}
            {Object.keys(stats.views).length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }}>Нет данных</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
