/**
 * Исчезающие сообщения (самоуничтожение)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TimerIcon } from './Icons';

interface Props {
  onSelect: (seconds: number) => void;
  currentTimer?: number;
}

export const DisappearingTimer: React.FC<Props> = ({ onSelect, currentTimer = 0 }) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const options = [
    { label: 'Выкл', seconds: 0 },
    { label: '10 сек', seconds: 10 },
    { label: '1 мин', seconds: 60 },
    { label: '5 мин', seconds: 300 },
    { label: '1 час', seconds: 3600 },
    { label: '1 день', seconds: 86400 }
  ];

  const currentLabel = options.find(o => o.seconds === currentTimer)?.label || 'Выкл';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, currentTimer > 0 && styles.activeButton]} 
        onPress={() => setShowOptions(!showOptions)}
      >
        <TimerIcon size={16} color={currentTimer > 0 ? '#fff' : '#666'} />
        <Text style={[styles.buttonText, currentTimer > 0 && styles.activeText]}>
          {currentLabel}
        </Text>
      </TouchableOpacity>
      
      {showOptions && (
        <View style={styles.options}>
          {options.map(option => (
            <TouchableOpacity
              key={option.seconds}
              style={[styles.option, option.seconds === currentTimer && styles.selectedOption]}
              onPress={() => {
                onSelect(option.seconds);
                setShowOptions(false);
              }}
            >
              <Text style={[styles.optionText, option.seconds === currentTimer && styles.selectedText]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative' },
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  activeButton: { backgroundColor: '#007AFF' },
  buttonText: { marginLeft: 4, fontSize: 12, color: '#666' },
  activeText: { color: '#fff' },
  options: { position: 'absolute', top: 35, right: 0, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, minWidth: 100 },
  option: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  selectedOption: { backgroundColor: '#007AFF' },
  optionText: { fontSize: 14, color: '#333' },
  selectedText: { color: '#fff' }
});
