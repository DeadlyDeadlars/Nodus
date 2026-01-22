/**
 * Быстрые реакции на сообщения
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

interface Props {
  messageId: string;
  onReaction: (emoji: string) => void;
  existingReactions?: { [emoji: string]: number };
}

export const QuickReactions: React.FC<Props> = ({ messageId, onReaction, existingReactions = {} }) => {
  const [showAll, setShowAll] = useState(false);
  
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const allEmojis = [
    ...quickEmojis,
    '👎', '😍', '🤔', '😡', '🎉', '👏', 
    '🙏', '💯', '🔥', '⚡', '💀', '🤡'
  ];

  const emojisToShow = showAll ? allEmojis : quickEmojis;

  return (
    <View style={styles.container}>
      <View style={styles.reactions}>
        {emojisToShow.map(emoji => {
          const count = existingReactions[emoji] || 0;
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reaction, count > 0 && styles.activeReaction]}
              onPress={() => onReaction(emoji)}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              {count > 0 && <Text style={styles.count}>{count}</Text>}
            </TouchableOpacity>
          );
        })}
        
        <TouchableOpacity 
          style={styles.moreButton} 
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.moreText}>{showAll ? '−' : '+'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 25, padding: 8, margin: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  reaction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 16, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    margin: 2,
    minWidth: 32,
    justifyContent: 'center'
  },
  activeReaction: { backgroundColor: 'rgba(0,122,255,0.3)' },
  emoji: { fontSize: 16 },
  count: { fontSize: 10, color: '#fff', marginLeft: 2, fontWeight: '600' },
  moreButton: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 12, 
    width: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 4
  },
  moreText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
