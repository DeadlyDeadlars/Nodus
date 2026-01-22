import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { CheckIcon, CloseIcon, VoiceIcon, VideoIcon, MuteIcon } from './Icons';
// TODO: Replace with actual call sounds service
const callSounds = {
  playRingtone: () => {},
  stopRingtone: () => {},
  playRingback: () => {},
  stopRingback: () => {},
  playCallEnd: () => {},
};

const { width, height } = Dimensions.get('window');

export const CallOverlay = () => {
  const { colors, spacing, radius } = useTheme();
  const { call, chats, localStream, remoteStream, acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleSpeaker } = useStore() as any;
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const pulseAnim = useState(new Animated.Value(1))[0];

  const visible = call?.status && call.status !== 'idle';

  // Log call state changes
  useEffect(() => {
    __DEV__ && console.log('CallOverlay: call state changed:', call?.status, 'visible:', visible);
  }, [call?.status, visible]);

  // Call duration timer
  useEffect(() => {
    if (call?.status === 'active') {
      const start = Date.now();
      const interval = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000);
      return () => clearInterval(interval);
    } else {
      setDuration(0);
    }
  }, [call?.status]);

  // Pulse animation for incoming call
  useEffect(() => {
    if (call?.status === 'incoming') {
      callSounds.playRingtone();
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); callSounds.stopRingtone(); };
    }
  }, [call?.status, pulseAnim]);

  // Ringback for outgoing call
  useEffect(() => {
    if (call?.status === 'outgoing' || call?.status === 'connecting') {
      callSounds.playRingback();
      return () => callSounds.stopRingback();
    }
  }, [call?.status]);

  // Call end sound
  useEffect(() => {
    if (call?.status === 'idle' && duration > 0) {
      callSounds.playCallEnd();
    }
  }, [call?.status]);

  if (!visible) return null;

  const peerId = call.peerId as string | undefined;
  const chat = peerId ? chats.find((c: any) => c.fingerprint === peerId || c.peerId === peerId || c.id === peerId) : null;
  const hasAvatar = chat?.avatar && (chat.avatar.startsWith('file://') || chat.avatar.startsWith('content://') || chat.avatar.startsWith('http') || chat.avatar.startsWith('data:'));
  const avatarLetter = (chat?.alias || chat?.username || peerId || 'U')[0].toUpperCase();

  const title = chat?.alias || chat?.username || (peerId ? `${peerId.slice(0, 6)}...${peerId.slice(-4)}` : 'Неизвестный');
  const isVideo = call.type === 'video';

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const statusText = call.status === 'incoming' ? 'Входящий вызов...' :
    call.status === 'outgoing' ? 'Вызов...' :
    call.status === 'connecting' ? 'Соединение...' :
    call.status === 'active' ? formatDuration(duration) : '';

  const remoteUrl = remoteStream?.toURL?.();
  const localUrl = localStream?.toURL?.();

  const handleMute = () => { setIsMuted(!isMuted); toggleMute?.(!isMuted); };
  const handleVideoToggle = () => { setIsVideoOff(!isVideoOff); toggleVideo?.(!isVideoOff); };
  const handleSpeaker = () => { setIsSpeaker(!isSpeaker); toggleSpeaker?.(!isSpeaker); };

  const ControlButton = ({ icon, label, active, danger, onPress }: any) => (
    <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: spacing.md }} onPress={onPress}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: danger ? colors.error : active ? colors.accent : colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
        {icon}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>{label}</Text>
    </TouchableOpacity>
  );

  // Video call active
  if (isVideo && (call.status === 'active' || call.status === 'connecting') && remoteUrl) {
    return (
      <Modal visible transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setShowControls(!showControls)}>
          <RTCView streamURL={remoteUrl} style={{ flex: 1, backgroundColor: '#000' }} objectFit="cover" />
          
          {/* Local video preview */}
          {localUrl && !isVideoOff && (
            <View style={{ position: 'absolute', right: 16, top: 50, width: 100, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent }}>
              <RTCView streamURL={localUrl} style={{ flex: 1 }} objectFit="cover" mirror />
            </View>
          )}

          {/* Top bar */}
          {showControls && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 4 }}>{statusText}</Text>
            </View>
          )}

          {/* Bottom controls */}
          {showControls && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <ControlButton icon={<MuteIcon size={24} color={isMuted ? colors.background : '#fff'} />} label={isMuted ? 'Вкл. звук' : 'Выкл. звук'} active={isMuted} onPress={handleMute} />
                <ControlButton icon={<VideoIcon size={24} color={isVideoOff ? colors.background : '#fff'} />} label={isVideoOff ? 'Вкл. видео' : 'Выкл. видео'} active={isVideoOff} onPress={handleVideoToggle} />
                <ControlButton icon={<CloseIcon size={24} color="#fff" />} label="Завершить" danger onPress={endCall} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    );
  }

  // Voice call or waiting state
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Gradient background effect */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: colors.accent, opacity: 0.1 }} />
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
          {/* Avatar with pulse */}
          <Animated.View style={{ transform: [{ scale: call.status === 'incoming' ? pulseAnim : 1 }] }}>
            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: call.status === 'active' ? colors.online : colors.accent }}>
              {hasAvatar ? (
                <Image source={{ uri: chat.avatar }} style={{ width: 140, height: 140 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 140, height: 140, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: colors.background, fontSize: 56, fontWeight: '700' }}>{avatarLetter}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Call info */}
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginTop: spacing.lg }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }}>{isVideo ? 'Видеозвонок' : 'Голосовой звонок'}</Text>
          
          {/* Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
            {call.status === 'active' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online, marginRight: 8 }} />}
            <Text style={{ color: call.status === 'active' ? colors.online : colors.accent, fontSize: 16 }}>{statusText}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={{ paddingBottom: 50, paddingTop: 30 }}>
          {call.status === 'incoming' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 60 }}>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={rejectCall}>
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center' }}>
                  <CloseIcon size={32} color="#fff" />
                </View>
                <Text style={{ color: colors.error, marginTop: 8, fontSize: 13 }}>Отклонить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={acceptCall}>
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.online, justifyContent: 'center', alignItems: 'center' }}>
                  <CheckIcon size={32} color="#fff" />
                </View>
                <Text style={{ color: colors.online, marginTop: 8, fontSize: 13 }}>Принять</Text>
              </TouchableOpacity>
            </View>
          ) : call.status === 'active' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <ControlButton icon={<MuteIcon size={22} color={isMuted ? colors.background : colors.text} />} label={isMuted ? 'Вкл.' : 'Микрофон'} active={isMuted} onPress={handleMute} />
              <ControlButton icon={<VoiceIcon size={22} color={isSpeaker ? colors.background : colors.text} />} label={isSpeaker ? 'Динамик' : 'Телефон'} active={isSpeaker} onPress={handleSpeaker} />
              {isVideo && <ControlButton icon={<VideoIcon size={22} color={isVideoOff ? colors.background : colors.text} />} label={isVideoOff ? 'Вкл.' : 'Камера'} active={isVideoOff} onPress={handleVideoToggle} />}
              <ControlButton icon={<CloseIcon size={22} color="#fff" />} label="Завершить" danger onPress={endCall} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={endCall}>
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center' }}>
                  <CloseIcon size={32} color="#fff" />
                </View>
                <Text style={{ color: colors.error, marginTop: 8, fontSize: 13 }}>Отмена</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
