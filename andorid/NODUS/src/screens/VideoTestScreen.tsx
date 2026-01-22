import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleVideoMessage } from '../components/CircleVideoMessage';

export const VideoTestScreen: React.FC = () => {
  // Тестовый URI - замените на реальный путь к видео файлу
  const testVideoUri = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Тест видеосообщений</Text>
      
      <View style={styles.videoContainer}>
        <CircleVideoMessage
          uri={testVideoUri}
          duration={30}
          size={200}
          onLongPress={() => __DEV__ && console.log('Long press on video')}
        />
      </View>
      
      <Text style={styles.info}>
        Нажмите на видео для воспроизведения/паузы
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  videoContainer: {
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
