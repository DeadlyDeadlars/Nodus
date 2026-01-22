import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { StickerPack, Sticker } from '../types';
import { CheckIcon, BackIcon } from '../components/Icons';

// Default sticker packs
const defaultPacks: StickerPack[] = [
  {
    id: 'pack_emoji',
    name: 'Классика',
    stickers: [
      { id: 's1', emoji: '😀' }, { id: 's2', emoji: '😂' }, { id: 's3', emoji: '🥰' },
      { id: 's4', emoji: '😎' }, { id: 's5', emoji: '🤔' }, { id: 's6', emoji: '😴' },
      { id: 's7', emoji: '🥳' }, { id: 's8', emoji: '😱' }, { id: 's9', emoji: '🤯' },
      { id: 's10', emoji: '👍' }, { id: 's11', emoji: '👎' }, { id: 's12', emoji: '❤️' },
    ],
    isInstalled: true,
  },
  {
    id: 'pack_animals',
    name: 'Животные',
    stickers: [
      { id: 'a1', emoji: '🐶' }, { id: 'a2', emoji: '🐱' }, { id: 'a3', emoji: '🐼' },
      { id: 'a4', emoji: '🦊' }, { id: 'a5', emoji: '🦁' }, { id: 'a6', emoji: '🐸' },
      { id: 'a7', emoji: '🐧' }, { id: 'a8', emoji: '🦄' }, { id: 'a9', emoji: '🐙' },
    ],
    isInstalled: false,
  },
  {
    id: 'pack_food',
    name: 'Еда',
    stickers: [
      { id: 'f1', emoji: '🍕' }, { id: 'f2', emoji: '🍔' }, { id: 'f3', emoji: '🍟' },
      { id: 'f4', emoji: '🌮' }, { id: 'f5', emoji: '🍣' }, { id: 'f6', emoji: '🍩' },
      { id: 'f7', emoji: '🍺' }, { id: 'f8', emoji: '☕' }, { id: 'f9', emoji: '🍷' },
    ],
    isInstalled: false,
  },
  {
    id: 'pack_gestures',
    name: 'Жесты',
    stickers: [
      { id: 'g1', emoji: '👋' }, { id: 'g2', emoji: '✌️' }, { id: 'g3', emoji: '🤞' },
      { id: 'g4', emoji: '🤙' }, { id: 'g5', emoji: '👊' }, { id: 'g6', emoji: '🙏' },
      { id: 'g7', emoji: '💪' }, { id: 'g8', emoji: '👏' }, { id: 'g9', emoji: '🤝' },
    ],
    isInstalled: false,
  },
];

export const StickerPacksScreen = ({ navigation }: any) => {
  const { colors, spacing, radius } = useTheme();
  const { stickerPacks, installStickerPack } = useStore();
  const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);

  // Merge default packs with installed
  const allPacks = defaultPacks.map(dp => {
    const installed = stickerPacks.find(p => p.id === dp.id);
    return installed || dp;
  });

  const PackItem = ({ pack }: { pack: StickerPack }) => (
    <TouchableOpacity 
      style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.sm }}
      onPress={() => setSelectedPack(pack)}
    >
      <View style={{ width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 28 }}>{pack.stickers[0]?.emoji || '📦'}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{pack.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{pack.stickers.length} стикеров</Text>
      </View>
      {pack.isInstalled ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><CheckIcon size={12} color={colors.online} /><Text style={{ color: colors.online, fontSize: 12, marginLeft: 4 }}>Установлен</Text></View>
      ) : (
        <TouchableOpacity 
          style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.full }}
          onPress={() => installStickerPack(pack)}
        >
          <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>Добавить</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <BackIcon size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 16, marginLeft: 4 }}>Назад</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: spacing.md }}>Стикеры</Text>
      </View>

      <FlatList
        data={allPacks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PackItem pack={item} />}
        contentContainerStyle={{ padding: spacing.md }}
      />

      {/* Pack Preview Modal */}
      <Modal visible={!!selectedPack} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{selectedPack?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedPack(null)}>
                <Text style={{ color: colors.textSecondary, fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {selectedPack?.stickers.map(sticker => (
                  <View key={sticker.id} style={{ width: '20%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 36 }}>{sticker.emoji}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            {selectedPack && !selectedPack.isInstalled && (
              <TouchableOpacity 
                style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.accent, borderRadius: radius.full }}
                onPress={() => { installStickerPack(selectedPack); setSelectedPack(null); }}
              >
                <Text style={{ color: colors.background, textAlign: 'center', fontWeight: '600' }}>Добавить набор</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Sticker picker for chat
export const StickerPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => {
  const { colors, spacing, radius } = useTheme();
  const { stickerPacks } = useStore();
  const [activePackId, setActivePackId] = useState<string>(stickerPacks[0]?.id || defaultPacks[0].id);

  const installedPacks = [...defaultPacks.filter(p => p.isInstalled), ...stickerPacks.filter(p => p.isInstalled)];
  const activePack = installedPacks.find(p => p.id === activePackId) || installedPacks[0];

  return (
    <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
      {/* Pack tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {installedPacks.map(pack => (
          <TouchableOpacity 
            key={pack.id}
            style={{ padding: spacing.md, borderBottomWidth: 2, borderBottomColor: activePackId === pack.id ? colors.accent : 'transparent' }}
            onPress={() => setActivePackId(pack.id)}
          >
            <Text style={{ fontSize: 20 }}>{pack.stickers[0]?.emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stickers grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, maxHeight: 200 }}>
        {activePack?.stickers.map(sticker => (
          <TouchableOpacity 
            key={sticker.id}
            style={{ width: '16.66%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => { onSelect(sticker.emoji); onClose(); }}
          >
            <Text style={{ fontSize: 32 }}>{sticker.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
