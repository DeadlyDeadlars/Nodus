/**
 * VideoMessageRecorder - Полноэкранный интерфейс записи видеосообщения в стиле Telegram
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, StatusBar, InteractionManager, Vibration } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Svg, { Circle } from 'react-native-svg';
import { VideoCompressor } from '../utils/videoCompressor';
import { VideoOptimizer } from '../utils/videoOptimizer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.75;

interface Props {
  onClose: () => void;
  onSend: (path: string, duration: number) => void;
  hasCameraPermission: boolean;
  hasMicPermission: boolean;
}

export const VideoMessageRecorder: React.FC<Props> = ({ 
  onClose, 
  onSend,
  hasCameraPermission,
  hasMicPermission 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordedPath, setRecordedPath] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');
  
  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<any>(null);
  const startYRef = useRef(0);
  const recordingRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const device = useCameraDevice(cameraType);

  const radius = (CIRCLE_SIZE - 8) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (isRecording) {
      InteractionManager.runAfterInteractions(() => {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 60000,
          useNativeDriver: false,
        }).start();
      });
    } else {
      progressAnim.setValue(0);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || recordingRef.current) return;
    
    recordingRef.current = true;
    setIsRecording(true);
    setRecordTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordTime(t => {
        if (t >= 60) {
          stopRecording();
          return 60;
        }
        return t + 1;
      });
    }, 1000);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (cameraRef.current && recordingRef.current) {
        cameraRef.current.startRecording({
          flash: 'off',
          videoCodec: 'h264',
          videoQuality: 'hd-1280x720', // HD качество
          onRecordingFinished: (video) => {
            setRecordedPath(video.path);
          },
          onRecordingError: (error) => {
            __DEV__ && console.error('Recording error:', error);
            recordingRef.current = false;
            setIsRecording(false);
          },
        });
      }
    } catch (e) {
      __DEV__ && console.error('Start recording error:', e);
      recordingRef.current = false;
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    
    recordingRef.current = false;
    setIsRecording(false);
    setIsLocked(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (cameraRef.current) {
      try {
        await cameraRef.current.stopRecording();
      } catch { /* silent */ }
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (recordedPath && recordTime >= 1) {
      Vibration.vibrate(30);
      
      try {
        // Быстрая оптимизация для передачи
        const optimized = await VideoOptimizer.optimizeForTransfer(recordedPath, {
          maxSize: 100, // 100MB нормальный лимит
          quality: 'balanced' // Баланс качества и скорости
        });
        
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onSend(optimized.path, recordTime);
        });
      } catch (error) {
        __DEV__ && console.error('Optimization failed:', error);
        onSend(recordedPath, recordTime);
      }
    }
  }, [recordedPath, recordTime, onSend]);

  const handleDelete = useCallback(() => {
    setRecordedPath(null);
    setRecordTime(0);
  }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      InteractionManager.runAfterInteractions(() => {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      });
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      VideoOptimizer.cleanup();
    };
  }, []);

  const handleTouchStart = useCallback((e: any) => {
    startYRef.current = e.nativeEvent.pageY;
    Vibration.vibrate(50);
    Animated.timing(buttonScaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }).start();
    startRecording();
  }, [startRecording]);

  const handleTouchMove = useCallback((e: any) => {
    if (!isRecording) return;
    const deltaY = startYRef.current - e.nativeEvent.pageY;
    if (deltaY > 50 && !isLocked) {
      setIsLocked(true);
      Vibration.vibrate(100);
    }
  }, [isRecording, isLocked]);

  const handleTouchEnd = useCallback(() => {
    Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    if (isRecording && !isLocked && recordTime >= 1) {
      stopRecording();
    }
  }, [isRecording, isLocked, recordTime, stopRecording]);

  const toggleCamera = useCallback(() => {
    setCameraType(t => t === 'front' ? 'back' : 'front');
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  if (!hasCameraPermission || !hasMicPermission || !device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Нет доступа к камере или микрофону</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.flipBtn} onPress={toggleCamera}>
        <Text style={styles.flipBtnText}>⟲</Text>
      </TouchableOpacity>

      {(isRecording || recordedPath) && (
        <View style={styles.timerContainer}>
          {isRecording && <View style={styles.recordDot} />}
          <Text style={styles.timerText}>{formatTime(recordTime)}</Text>
        </View>
      )}

      <Animated.View style={[styles.circleContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.cameraCircle}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={!recordedPath}
            video={true}
            audio={true}
            format={device?.formats?.find(f => 
              f.videoWidth === 1280 && f.videoHeight === 720 && f.maxFps >= 30
            ) || device?.formats?.[0]}
            fps={30}
            videoStabilizationMode="auto"
            enableBufferCompression={true}
            lowLightBoost={device?.supportsLowLightBoost}
          />
        </View>

        <View style={styles.progressRing}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={radius}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={4}
              fill="none"
            />
            {isRecording && (
              <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={radius}
                stroke="#ff3b30"
                strokeWidth={4}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            )}
          </Svg>
        </View>
      </Animated.View>

      <View style={styles.bottomPanel}>
        {!recordedPath ? (
          <Animated.View 
            style={[
              styles.recordBtnOuter, 
              { transform: [{ scale: buttonScaleAnim }] }
            ]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Animated.View 
              style={[
                styles.recordBtnInner, 
                isRecording && styles.recordBtnActive,
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            {isLocked && (
              <Animated.View 
                style={[
                  styles.lockIcon,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <Text style={styles.lockText}>🔒</Text>
              </Animated.View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.previewButtons}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording && !isLocked && (
          <Text style={styles.hint}>↑ Сдвиньте вверх для фиксации</Text>
        )}
        
        {isLocked && (
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16 },
  closeBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  closeBtnText: { color: '#fff', fontSize: 24 },
  flipBtn: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  flipBtnText: { color: '#fff', fontSize: 28 },
  timerContainer: { position: 'absolute', top: 110, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b30', marginRight: 8 },
  timerText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  circleContainer: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' },
  cameraCircle: { width: CIRCLE_SIZE - 8, height: CIRCLE_SIZE - 8, borderRadius: (CIRCLE_SIZE - 8) / 2, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  progressRing: { position: 'absolute', top: 0, left: 0 },
  bottomPanel: { position: 'absolute', bottom: 60, alignItems: 'center' },
  recordBtnOuter: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    borderWidth: 4, 
    borderColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordBtnInner: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#ff3b30',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  recordBtnActive: { 
    width: 40, 
    height: 40, 
    borderRadius: 8,
    backgroundColor: '#ff1744',
  },
  lockIcon: { position: 'absolute', top: -40 },
  lockText: { fontSize: 24 },
  previewButtons: { flexDirection: 'row', gap: 40 },
  deleteBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,59,48,0.3)', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#ff3b30', fontSize: 28 },
  sendBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#34c759', justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 28, marginLeft: 4 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 20 },
  stopBtn: { marginTop: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  stopSquare: { width: 20, height: 20, backgroundColor: '#ff3b30', borderRadius: 4 },
});
