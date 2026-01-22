import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../theme';

export const NetworkStatus = () => {
  const { colors, spacing, radius } = useTheme();
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const translateY = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);
      
      if (!connected) {
        setShowBanner(true);
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      } else if (showBanner) {
        Animated.timing(translateY, { toValue: -50, duration: 300, useNativeDriver: true }).start(() => {
          setShowBanner(false);
        });
      }
    });

    return () => unsubscribe();
  }, [showBanner]);

  if (!showBanner) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor: colors.error }]}>
      <Text style={[styles.text, { color: '#fff' }]}>
        Нет подключения к интернету
      </Text>
      <Text style={[styles.subtext, { color: 'rgba(255,255,255,0.8)' }]}>
        Сообщения будут отправлены при восстановлении связи
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
