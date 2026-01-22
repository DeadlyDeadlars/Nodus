/**
 * VideoTest - Компонент для тестирования видео
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CircleVideoMessage } from './CircleVideoMessage';

export const VideoTest: React.FC = () => {
  const [testUri, setTestUri] = useState<string>('');

  const testVideo = () => {
    // Тестовое видео (замените на реальный путь к файлу)
    const uri = 'file:///storage/emulated/0/Download/test_video.mp4';
    setTestUri(uri);
  };

  const clearTest = () => {
    setTestUri('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Тест видеосообщений</Text>
      
      <TouchableOpacity style={styles.button} onPress={testVideo}>
        <Text style={styles.buttonText}>Загрузить тестовое видео</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearTest}>
        <Text style={styles.buttonText}>Очистить</Text>
      </TouchableOpacity>

      {testUri ? (
        <View style={styles.videoContainer}>
          <CircleVideoMessage
            uri={testUri}
            duration={30}
            size={150}
            onLongPress={() => Alert.alert('Видео', 'Длинное нажатие работает!')}
          />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Видео не загружено</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  placeholder: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
});
