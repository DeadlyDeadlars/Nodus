/**
 * Отложенные сообщения (отправка по времени)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ClockIcon, SendIcon } from './Icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
  message: string;
}

export const ScheduleMessage: React.FC<Props> = ({ visible, onClose, onSchedule, message }) => {
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  const quickOptions = [
    { label: 'Через 1 час', minutes: 60 },
    { label: 'Через 3 часа', minutes: 180 },
    { label: 'Завтра в 9:00', minutes: getMinutesUntilTomorrow9AM() },
    { label: 'Через неделю', minutes: 7 * 24 * 60 }
  ];

  function getMinutesUntilTomorrow9AM(): number {
    const now = new Date();
    const tomorrow9AM = new Date();
    tomorrow9AM.setDate(now.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);
    return Math.floor((tomorrow9AM.getTime() - now.getTime()) / (1000 * 60));
  }

  const handleQuickSelect = (minutes: number) => {
    const scheduledDate = new Date(Date.now() + minutes * 60 * 1000);
    setSelectedTime(scheduledDate);
  };

  const handleSchedule = () => {
    if (selectedTime) {
      onSchedule(selectedTime);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Отложить сообщение</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={3}>
              {message}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Быстрый выбор:</Text>
          {quickOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => handleQuickSelect(option.minutes)}
            >
              <ClockIcon size={16} color="#666" />
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}

          {selectedTime && (
            <View style={styles.selectedTime}>
              <Text style={styles.selectedText}>
                Отправить: {selectedTime.toLocaleString('ru-RU')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.scheduleButton, !selectedTime && styles.disabledButton]}
            onPress={handleSchedule}
            disabled={!selectedTime}
          >
            <SendIcon size={16} color="#fff" />
            <Text style={styles.scheduleText}>Запланировать</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600' },
  closeButton: { fontSize: 20, color: '#666' },
  messagePreview: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 20 },
  messageText: { fontSize: 14, color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: '500', marginBottom: 12, color: '#333' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { marginLeft: 12, fontSize: 16, color: '#333' },
  selectedTime: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginVertical: 16 },
  selectedText: { fontSize: 14, color: '#1976d2', textAlign: 'center' },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  disabledButton: { backgroundColor: '#ccc' },
  scheduleText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 }
});
