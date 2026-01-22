/**
 * Простые опросы в чатах
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { CloseIcon } from './Icons';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const CreatePoll: React.FC<Props> = ({ visible, onClose, onCreatePoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleCreate = () => {
    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question.trim(), validOptions);
      setQuestion('');
      setOptions(['', '']);
      onClose();
    }
  };

  const canCreate = question.trim().length > 0 && options.filter(opt => opt.trim().length > 0).length >= 2;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Создать опрос</Text>
            <TouchableOpacity onPress={onClose}>
              <CloseIcon size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.questionInput}
            placeholder="Вопрос опроса..."
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={200}
          />

          <Text style={styles.sectionTitle}>Варианты ответов:</Text>
          
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                placeholder={`Вариант ${index + 1}`}
                value={option}
                onChangeText={(text) => updateOption(index, text)}
                maxLength={100}
              />
              {options.length > 2 && (
                <TouchableOpacity onPress={() => removeOption(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 10 && (
            <TouchableOpacity style={styles.addOption} onPress={addOption}>
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addOptionText}>Добавить вариант</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.createButton, !canCreate && styles.disabledButton]}
            onPress={handleCreate}
            disabled={!canCreate}
          >
            <Text style={styles.pollIcon}>📊</Text>
            <Text style={styles.createText}>Создать опрос</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Компонент для отображения опроса
export const PollMessage: React.FC<{
  question: string;
  options: PollOption[];
  onVote: (optionId: string) => void;
  userVote?: string;
  totalVotes: number;
}> = ({ question, options, onVote, userVote, totalVotes }) => {
  return (
    <View style={styles.pollContainer}>
      <Text style={styles.pollQuestion}>{question}</Text>
      
      {options.map(option => {
        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        const isSelected = userVote === option.id;
        
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.pollOption, isSelected && styles.selectedOption]}
            onPress={() => onVote(option.id)}
          >
            <View style={[styles.pollBar, { width: `${percentage}%` }]} />
            <View style={styles.pollContent}>
              <Text style={[styles.pollOptionText, isSelected && styles.selectedText]}>
                {option.text}
              </Text>
              <Text style={styles.pollVotes}>
                {Math.round(percentage)}% ({option.votes})
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      
      <Text style={styles.pollTotal}>
        Всего голосов: {totalVotes}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600' },
  questionInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, minHeight: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '500', marginBottom: 12, color: '#333' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  removeButton: { marginLeft: 12, fontSize: 18, color: '#ff3b30', width: 24, textAlign: 'center' },
  addOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  addIcon: { fontSize: 16, color: '#007AFF', fontWeight: 'bold' },
  addOptionText: { marginLeft: 8, color: '#007AFF', fontSize: 14 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  disabledButton: { backgroundColor: '#ccc' },
  pollIcon: { fontSize: 16, color: '#fff' },
  createText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  // Poll display styles
  pollContainer: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, margin: 4 },
  pollQuestion: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  pollOption: { position: 'relative', backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0' },
  selectedOption: { borderColor: '#007AFF' },
  pollBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,122,255,0.1)' },
  pollContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, zIndex: 1 },
  pollOptionText: { flex: 1, fontSize: 14, color: '#333' },
  selectedText: { fontWeight: '600', color: '#007AFF' },
  pollVotes: { fontSize: 12, color: '#666', marginLeft: 8 },
  pollTotal: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8 }
});
