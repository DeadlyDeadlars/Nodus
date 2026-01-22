import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import Video from 'react-native-video';

interface Props {
  uri: string;
  duration: number;
  size?: number;
  onLongPress?: () => void;
}

export const CircleVideoMessage: React.FC<Props> = ({ uri, duration, size = 200, onLongPress }) => {
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!paused) {
      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      wave.start();
      return () => wave.stop();
    } else {
      waveAnim.setValue(1);
    }
  }, [paused]);

  const handlePress = () => {
    setPaused(!paused);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime);
    const progress = data.currentTime / duration;
    progressAnim.setValue(progress);
  };

  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[{ transform: [{ scale: waveAnim }] }]}>
        <Pressable 
          onPress={handlePress}
          onLongPress={onLongPress}
          style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
        >
        <Video
          source={{ uri }}
          style={[styles.video, { width: size, height: size, borderRadius: size / 2 }]}
          paused={paused}
          repeat={false}
          resizeMode="cover"
          onProgress={handleProgress}
          onEnd={() => setPaused(true)}
          bufferConfig={{
            minBufferMs: 1500,
            maxBufferMs: 3000,
            bufferForPlaybackMs: 800,
            bufferForPlaybackAfterRebufferMs: 1200,
          }}
        />
        
        <View style={[styles.overlay, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Progress ring */}
          <Animated.View style={[styles.progressRing, { width: size, height: size }]}>
            <Animated.View
              style={[
                styles.progressStroke,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 3,
                  transform: [{ rotate: '-90deg' }],
                  borderColor: 'transparent',
                  borderTopColor: '#fff',
                  borderRightColor: '#fff',
                  opacity: paused ? 0 : 0.8,
                }
              ]}
            />
          </Animated.View>
          
          {paused && (
            <View style={styles.playButton}>
              <View style={styles.playTriangle} />
            </View>
          )}
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {Math.floor((paused ? duration : currentTime) / 60)}:
              {Math.floor((paused ? duration : currentTime) % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  video: {
    backgroundColor: '#1a1a1a',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressStroke: {
    position: 'absolute',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: '#000',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  timeContainer: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
