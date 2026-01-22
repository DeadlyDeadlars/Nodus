import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Image, Dimensions, Animated, TextInput } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { Story } from '../types';
import { CameraIcon, GalleryIcon } from './Icons';

const { width, height } = Dimensions.get('window');

export const StoriesBar = () => {
  const { colors, spacing, radius } = useTheme();
  const { stories, chats, profile, addStory, broadcastStory } = useStore();
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Filter non-expired stories
  const activeStories = stories.filter(s => s.expiresAt > Date.now());
  
  // Group by peer
  const storyPeers = [...new Set(activeStories.map(s => s.peerId))];
  const myStories = activeStories.filter(s => s.peerId === profile?.fingerprint);
  const hasMyStory = myStories.length > 0;

  const addNewStory = async (type: 'camera' | 'gallery') => {
    setShowAdd(false);
    const result = type === 'camera' 
      ? await launchCamera({ mediaType: 'mixed' })
      : await launchImageLibrary({ mediaType: 'mixed' });
    
    if (result.assets?.[0] && profile) {
      const asset = result.assets[0];
      const story: Story = {
        id: `story_${Date.now()}`,
        peerId: profile.fingerprint,
        mediaUri: asset.uri!,
        mediaType: asset.type?.startsWith('video') ? 'video' : 'image',
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        viewedBy: [],
      };
      addStory(story);
      broadcastStory(story); // Send to all contacts
    }
  };

  const StoryCircle = ({ peerId, isAdd }: { peerId?: string; isAdd?: boolean }) => {
    const chat = chats.find(c => c.peerId === peerId);
    const peerStories = activeStories.filter(s => s.peerId === peerId);
    const hasUnviewed = peerStories.some(s => !s.viewedBy.includes(profile?.fingerprint || ''));
    const hasAvatar = chat?.avatar && (chat.avatar.startsWith('file://') || chat.avatar.startsWith('content://') || chat.avatar.startsWith('http'));
    const letter = (chat?.alias || chat?.username || peerId || 'U')[0].toUpperCase();
    
    return (
      <TouchableOpacity 
        style={{ alignItems: 'center', marginRight: spacing.md }}
        onPress={() => {
          if (isAdd) setShowAdd(true);
          else if (peerStories[0]) setViewingStory(peerStories[0]);
        }}
      >
        <View style={{ 
          width: 68, height: 68, borderRadius: 34, 
          borderWidth: 3, 
          borderColor: isAdd ? colors.surfaceLight : hasUnviewed ? colors.accent : colors.textSecondary,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: colors.surface,
        }}>
          {isAdd ? (
            <Text style={{ color: colors.accent, fontSize: 28 }}>+</Text>
          ) : (
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {hasAvatar ? (
                <Image source={{ uri: chat.avatar }} style={{ width: 60, height: 60 }} resizeMode="cover" />
              ) : (
                <Text style={{ color: colors.background, fontSize: 26, fontWeight: '700' }}>{letter}</Text>
              )}
            </View>
          )}
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
          {isAdd ? 'Добавить' : chat?.alias || chat?.username || 'User'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (storyPeers.length === 0 && !profile) return null;

  return (
    <>
      <View style={{ paddingVertical: spacing.md }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ isAdd: true, peerId: '' }, ...storyPeers.map(p => ({ peerId: p, isAdd: false }))]}
          keyExtractor={(item, i) => item.peerId || `add_${i}`}
          renderItem={({ item }) => <StoryCircle peerId={item.peerId} isAdd={item.isAdd} />}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
        />
      </View>

      {/* Add Story Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowAdd(false)}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, width: '80%' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: spacing.lg }}>Добавить историю</Text>
            <TouchableOpacity style={{ padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => addNewStory('camera')}>
              <CameraIcon size={24} color={colors.text} />
              <Text style={{ color: colors.text, textAlign: 'center', marginTop: 4 }}>Камера</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg }} onPress={() => addNewStory('gallery')}>
              <GalleryIcon size={24} color={colors.text} />
              <Text style={{ color: colors.text, textAlign: 'center', marginTop: 4 }}>Галерея</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Story Viewer */}
      <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />
    </>
  );
};

const StoryViewer = ({ story, onClose }: { story: Story | null; onClose: () => void }) => {
  const { colors, spacing } = useTheme();
  const { chats, profile, stories } = useStore();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (story) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onClose();
      });

      // Mark as viewed
      if (profile && !story.viewedBy.includes(profile.fingerprint)) {
        useStore.setState(s => ({
          stories: s.stories.map(st => st.id === story.id ? { ...st, viewedBy: [...st.viewedBy, profile.fingerprint] } : st)
        }));
      }
    }
  }, [story?.id]);

  if (!story) return null;

  const chat = chats.find(c => c.peerId === story.peerId);
  const timeAgo = Math.floor((Date.now() - story.timestamp) / 60000);

  return (
    <Modal visible={!!story} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1}>
          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 50, marginHorizontal: 10 }}>
            <Animated.View style={{ height: 3, backgroundColor: '#fff', width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>{chat?.avatar || '⬡'}</Text>
            </View>
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{chat?.alias || chat?.username || 'User'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{timeAgo} мин назад</Text>
            </View>
          </View>

          {/* Content */}
          <Image source={{ uri: story.mediaUri }} style={{ flex: 1, width, resizeMode: 'contain' }} />

          {story.caption && (
            <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, padding: spacing.lg }}>
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 5 }}>{story.caption}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
