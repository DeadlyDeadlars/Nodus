import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, ScrollView, Image, Animated, PermissionsAndroid, Clipboard, Vibration, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { Message, Chat } from '../types';
import { EMOJI_CATEGORIES, STICKERS } from '../data/emoji';
import { SendIcon, VoiceIcon, SmileIcon, BackIcon, CloseIcon, CheckIcon, DoubleCheckIcon, VideoIcon, PhoneIcon, ClockIcon, AttachIcon, ReplyIcon, CopyIcon, ForwardMsgIcon, TrashIcon, CameraIcon, GalleryIcon, FileIcon, EditIcon, LocationIcon, LockIcon, SearchIcon, P2PIcon, RelayIcon, TimerIcon, CircleIcon, VoiceChatIcon, BoxIcon, BotIcon, BookmarkIcon, SilentIcon } from '../components/Icons';
import { CustomAlert } from '../components/CustomAlert';
import { MediaViewer } from '../components/MediaViewer';
import { CircleVideoMessage } from '../components/CircleVideoMessage';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { launchCamera, launchImageLibrary, CameraOptions } from 'react-native-image-picker';
import FileViewer from 'react-native-file-viewer';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import { VideoMessageRecorder } from '../components/VideoMessageRecorder';

// Placeholder functions - to be implemented
const addBookmark = async (b: any) => {};
const isBookmarked = (id: string) => false;
const removeBookmark = async (id: string) => {};
const getBookmarks = async () => [];
const addScheduledMessage = async (m: any) => {};
const getScheduledMessages = async () => [];
const checkSpam = (text: string) => ({ isSpam: false });
const sendFileChunked = async (peerId: string, path: string, opts: any) => ({ success: true });
const sendEncrypted = async (peerId: string, pubKey: string, content: string, type: string) => null;
const startMessagePolling = (chatId: string, cb: any) => {};
const stopMessagePolling = (chatId: string) => {};
const useTransportMode = () => 'relay';


const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatDateSeparator = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]}${date.getFullYear() !== today.getFullYear() ? ` ${date.getFullYear()}` : ''}`;
};

const getDateKey = (timestamp: number) => new Date(timestamp).toDateString();

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// URL regex and link preview fetcher
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

const fetchLinkPreview = async (url: string): Promise<{ url: string; title?: string; description?: string; image?: string } | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);
    const html = await res.text();
    
    const getMetaContent = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'));
      return match?.[1];
    };
    
    const title = getMetaContent('og:title') || getMetaContent('twitter:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const description = getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description');
    const image = getMetaContent('og:image') || getMetaContent('twitter:image');
    
    if (!title && !description && !image) return null;
    return { url, title: title?.slice(0, 100), description: description?.slice(0, 200), image };
  } catch {
    return null;
  }
};

const genWaveHeights = (seed: string, count: number) => {
  let x = hashSeed(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const v = (x % 1000) / 1000;
    out.push(6 + Math.floor(v * 14));
  }
  return out;
};

const VoiceWaveform = ({
  seed,
  progress,
  baseColor,
  activeColor,
}: {
  seed: string;
  progress: number;
  baseColor: string;
  activeColor: string;
}) => {
  const count = 26;
  const heights = genWaveHeights(seed, count);
  const filled = Math.max(0, Math.min(count, Math.floor(progress * count)));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 22 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: h,
            marginHorizontal: 1,
            borderRadius: 1,
            backgroundColor: i < filled ? activeColor : baseColor,
          }}
        />
      ))}
    </View>
  );
};

export const ChatDetailScreen = ({ route, navigation }: any) => {
  const { chatId } = route.params;
  const { colors, spacing, radius, displayMode, density } = useTheme();
  const { chats, addMessage, clearChat, settings, sendP2PMessage, clearUnreadCount, startCall: startWebRTCCall, sendPresence, fetchPeerProfile, processBotCommand, addReaction, editMessage } = useStore();
  const chat = chats.find((c) => c.id === chatId);
  const transportMode = useTransportMode(); // E2EE transport mode
  const [text, setText] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState('smileys');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecordingVideoMsg, setIsRecordingVideoMsg] = useState(false);
  const [videoRecordTime, setVideoRecordTime] = useState(0);
  const [recordMode, setRecordMode] = useState<'voice' | 'video'>('voice');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [recordedVideoPath, setRecordedVideoPath] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ visible: boolean; uri: string; type: 'image' | 'video' }>({ visible: false, uri: '', type: 'image' });
  const [showKeyVerification, setShowKeyVerification] = useState(false);
  const [isP2PConnected, setIsP2PConnected] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [silentMode, setSilentMode] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const videoRecordInterval = useRef<any>(null);
  const cameraRef = useRef<Camera>(null);
  const flatListRef = useRef<FlatList>(null);
  const recordingInterval = useRef<any>(null);
  const audioRef = useRef<AudioRecorderPlayer | null>(null);
  const recordingPathRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playPosMs, setPlayPosMs] = useState(0);
  const [playDurMs, setPlayDurMs] = useState(0);

  const { hasPermission: hasCamPerm, requestPermission: reqCamPerm } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: reqMicPerm } = useMicrophonePermission();
  const device = useCameraDevice('front');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };
  const typingTimeout = useRef<any>(null);

  // Initialize audio recorder lazily
  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new AudioRecorderPlayer();
    }
    return audioRef.current;
  };

  const chatAppearance = settings.chatAppearance || { fontSize: 16, bubbleStyle: 'rounded', wallpaper: null, showTime: true, showStatus: true };
  const fontSize = chatAppearance.fontSize;

  // Fetch peer profile on mount if missing info or publicKey
  useEffect(() => {
    // Используем fingerprint если доступен
    const targetId = chat?.fingerprint || chat?.peerId;
    if (chat && !chat.isGroup && targetId && (!chat.username || !chat.publicKey)) {
      fetchPeerProfile(targetId).then(profile => {
        if (profile) {
          useStore.setState((s) => ({
            chats: s.chats.map(c => c.id === chatId ? {
              ...c,
              username: profile.username || c.username,
              alias: profile.alias || c.alias,
              avatar: profile.avatar || c.avatar,
              bio: profile.bio || c.bio,
              publicKey: profile.publicKey || c.publicKey,
              fingerprint: profile.fingerprint || c.fingerprint,
            } : c)
          }));
        }
      });
    }
  }, [chatId, chat?.peerId, chat?.fingerprint]);

  // Check P2P connection status
  useEffect(() => {
    const checkP2P = async () => {
      const targetId = chat?.fingerprint || chat?.peerId;
      if (!targetId) return;
      try {
        const mq = require('../services/messageQueue');
        const connected = mq.messageQueue?.isP2PConnected?.(targetId) ?? false;
        setIsP2PConnected(connected);
      } catch { /* silent */ }
    };
    checkP2P();
    const interval = setInterval(checkP2P, 3000);
    return () => clearInterval(interval);
  }, [chat?.fingerprint, chat?.peerId]);

  // Auto-delete expired temporary messages
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const expired = chat?.messages.filter(m => m.expiresAt && m.expiresAt < now) || [];
      if (expired.length > 0) {
        useStore.setState((s) => ({
          chats: s.chats.map(c => c.id === chatId ? {
            ...c,
            messages: c.messages.filter(m => !m.expiresAt || m.expiresAt > now)
          } : c)
        }));
      }
    }, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [chatId]);

  // Send typing indicator
  const handleTextChange = (newText: string) => {
    setText(newText);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (newText.length > 0) {
      sendPresence(chatId, true, false);
      typingTimeout.current = setTimeout(() => {
        sendPresence(chatId, false, false);
      }, 3000);
    } else {
      sendPresence(chatId, false, false);
    }
  };

  useEffect(() => {
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      const audio = audioRef.current;
      if (audio) {
        audio.stopPlayer().catch(() => {});
        audio.stopRecorder().catch(() => {});
        audio.removePlayBackListener();
      }
      sendPresence(chatId, false, false);
    };
  }, [chatId]);

  // Clear unread count when chat is opened
  useEffect(() => {
    if (chat && (chat.unreadCount ?? 0) > 0) {
      clearUnreadCount(chatId);
    }
  }, [chatId, chat?.unreadCount]);

  // E2EE: Start listening for encrypted messages
  useEffect(() => {
    if (!chat?.publicKey) return;
    
    const { profile } = useStore.getState();
    if (!profile?.fingerprint) return;
    
    startMessagePolling(profile.fingerprint, (fromPeerId, msg) => {
      if (fromPeerId === chat.peerId) {
        addMessage(chatId, {
          id: msg.id,
          text: msg.content,
          timestamp: msg.ts,
          isOutgoing: false,
          isDirect: true,
          type: msg.type || 'text',
          status: 'delivered',
        });
      }
    });
    
    return () => stopMessagePolling();
  }, [chatId, chat?.peerId, chat?.publicKey]);

  if (!chat) return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 48, color: colors.warning }}>△</Text>
        <Text style={{ color: colors.text, fontSize: 18, marginVertical: spacing.md }}>Чат не найден</Text>
        <TouchableOpacity style={{ backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.background, fontWeight: '600' }}>Назад</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const sendMessage = async (type: Message['type'] = 'text', extra?: Partial<Message>) => {
    if (type === 'text' && !text.trim()) return;
    
    // Handle edit mode - используем fingerprint если доступен
    if (editingMessage && chat) {
      editMessage(chat.id, editingMessage.id, text.trim());
      const targetId = chat.fingerprint || chat.peerId;
      sendP2PMessage(targetId, JSON.stringify({ type: 'edit', messageId: editingMessage.id, text: text.trim() }), 'edit');
      setText('');
      setEditingMessage(null);
      return;
    }
    
    const content = type === 'text' ? text.trim() : (extra?.stickerEmoji || '');
    const tempDuration = settings.tempMessageDuration || 3600;
    
    // Check for URLs and fetch preview
    let linkPreview: Message['linkPreview'] = undefined;
    if (type === 'text') {
      const urls = content.match(URL_REGEX);
      if (urls?.[0]) {
        linkPreview = await fetchLinkPreview(urls[0]) || undefined;
      }
    }
    
    const msgExtra: Partial<Message> = {
      replyTo: replyTo?.id,
      isTemporary,
      expiresAt: isTemporary ? Date.now() + tempDuration * 1000 : undefined,
      linkPreview,
      silent: silentMode,
      ...extra,
    };

    let messageId: string | null = null;
    
    // Try E2EE first if peer has publicKey
    if (chat?.publicKey) {
      try {
        messageId = await sendEncrypted(chat.peerId, chat.publicKey, content, type);
        if (messageId) {
          // Add to local messages
          const msg: Message = {
            id: messageId,
            text: type === 'text' ? content : undefined,
            timestamp: Date.now(),
            isOutgoing: true,
            isDirect: true,
            isTemporary,
            expiresAt: isTemporary ? Date.now() + tempDuration * 1000 : undefined,
            linkPreview,
            type,
            status: 'sent',
            replyTo: replyTo?.id,
            ...extra,
          };
          addMessage(chatId, msg);
        }
      } catch (e) {
        console.warn('E2EE send failed, falling back to P2P:', e);
      }
    }
    
    // Fallback to existing P2P if E2EE failed or no publicKey
    if (!messageId) {
      messageId = await sendP2PMessage(chatId, content, type, msgExtra);
    }
    
    if (!messageId) {
      // Fallback to local-only message if all fails
      const msg: Message = {
        id: Date.now().toString(),
        text: type === 'text' ? text.trim() : undefined,
        timestamp: Date.now(),
        isOutgoing: true,
        isDirect: true,
        isTemporary,
        expiresAt: isTemporary ? Date.now() + tempDuration * 1000 : undefined,
        linkPreview,
        type,
        status: 'failed',
        replyTo: replyTo?.id,
        ...extra,
      };
      addMessage(chatId, msg);
    }
    
    setText('');
    setReplyTo(null);
    setShowEmoji(false);
    setSilentMode(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    // Process bot commands
    if (type === 'text' && content.startsWith('/')) {
      processBotCommand(chatId, content);
    }
  };

  const scheduleMessage = () => {
    if (!text.trim() || !chat) return;
    const scheduledAt = scheduleDate.getTime();
    if (scheduledAt <= Date.now()) {
      showAlert('Ошибка', 'Выберите время в будущем');
      return;
    }
    addScheduledMessage({
      chatId: chat.id,
      text: text.trim(),
      type: 'text',
      scheduledAt,
      silent: silentMode,
    });
    setText('');
    setShowScheduleModal(false);
    showAlert('Запланировано', `Сообщение будет отправлено ${scheduleDate.toLocaleString()}`);
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showAlert('Нет доступа', 'Разрешите доступ к микрофону');
          return;
        }
      }

      // Stop any existing recording/playback first
      const audio = getAudio();
      try {
        await audio.stopRecorder();
      } catch { /* silent */ }
      try {
        await audio.stopPlayer();
      } catch { /* silent */ }

      const path = Platform.OS === 'android' 
        ? `${RNFS.CachesDirectoryPath}/voice_${Date.now()}.mp4`
        : `${RNFS.DocumentDirectoryPath}/voice_${Date.now()}.m4a`;
      recordingPathRef.current = path;

      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

      // Send recording presence
      sendPresence(chatId, false, true).catch(() => {});

      // High quality audio settings
      const audioSet: Record<string, any> = Platform.OS === 'android'
        ? {
            AudioEncoderAndroid: 3, // AAC
            AudioSourceAndroid: 6, // VOICE_RECOGNITION (лучше для голоса)
            OutputFormatAndroid: 2, // MPEG_4
            AudioSamplingRateAndroid: 44100,
            AudioEncodingBitRateAndroid: 128000,
            AudioChannelsAndroid: 1,
          }
        : {
            AVEncoderAudioQualityKeyIOS: 127, // max quality
            AVNumberOfChannelsKeyIOS: 1,
            AVFormatIDKeyIOS: 'aac',
            AVSampleRateKeyIOS: 44100,
            AVEncoderBitRateKeyIOS: 128000,
          };

      await audio.startRecorder(path, audioSet);
    } catch (e) {
      __DEV__ && console.error('startRecording failed:', e);
      setIsRecording(false);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      sendPresence(chatId, false, false).catch(() => {});
      showAlert('Ошибка', 'Не удалось начать запись: ' + String(e));
    }
  };

  const stopRecording = async (send: boolean) => {
    try {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      const wasRecording = isRecording;
      const duration = recordingTime;
      const path = recordingPathRef.current;
      
      setIsRecording(false);
      setRecordingTime(0);
      recordingPathRef.current = null;
      
      sendPresence(chatId, false, false).catch(() => {});

      const audio = audioRef.current;
      if (audio) {
        try {
          await audio.stopRecorder();
        } catch { /* silent */ }
      }

      if (send && wasRecording && duration > 0 && path) {
        const exists = await RNFS.exists(path);
        if (!exists) {
          showAlert('Ошибка', 'Файл записи не найден');
          return;
        }
        const b64 = await RNFS.readFile(path, 'base64');
        const payload = JSON.stringify({ b64, duration });
        await sendP2PMessage(chatId, payload, 'voice', {
          mediaUri: `file://${path}`,
          mediaDuration: duration,
        });
      }
    } catch (e) {
      __DEV__ && console.error('stopRecording failed:', e);
      showAlert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  const startCall = (type: 'voice' | 'video') => {
    (async () => {
      try {
        if (Platform.OS === 'android') {
          const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (mic !== PermissionsAndroid.RESULTS.GRANTED) return;
          if (type === 'video') {
            const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
            if (cam !== PermissionsAndroid.RESULTS.GRANTED) return;
          }
        }
        if (chat?.isGroup) return;
        // Используем fingerprint если доступен, иначе peerId
        const callTarget = chat?.fingerprint || chat?.peerId;
        if (!callTarget) return;
        await startWebRTCCall(callTarget, type);
      } catch (e) {
        __DEV__ && console.error('startCall failed:', e);
      }
    })();
  };

  const handleFilePicker = async () => {
    setShowMediaPicker(false);
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'documentDirectory',
      });
      if (result?.[0]) await sendFileMessage(result[0].fileCopyUri ?? result[0].uri, result[0].name, result[0].size, result[0].type);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) showAlert('Ошибка', 'Не удалось выбрать файл');
    }
  };

  const sendFileMessage = async (uri: string | undefined, name?: string | null, size?: number | null, type?: string | null) => {
    if (!uri) { showAlert('Ошибка', 'Не удалось получить путь к файлу'); return; }
    const filePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    const exists = await RNFS.exists(filePath);
    if (!exists) { showAlert('Ошибка', 'Файл не найден'); return; }
    const fileName = name ?? 'file';
    const fileSize = size ?? 0;
    const fileType = type ?? undefined;
    if (fileSize > 4 * 1024 * 1024 * 1024) { showAlert('Ошибка', 'Файл слишком большой (макс. 4 ГБ)'); return; }
    
    const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    const isVideo = fileType?.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/i.test(fileName);
    
    // Оптимизация для больших файлов
    let processedUri = uri;
    if (fileSize > 50 * 1024 * 1024) { // Файлы больше 50MB
      if (isVideo) {
        // Сжимаем большие видео
        const { VideoOptimizer } = await import('../utils/videoOptimizer');
        const optimized = await VideoOptimizer.optimizeForTransfer(filePath, {
          maxSize: 200, // 200MB лимит для видео
          quality: 'balanced'
        });
        processedUri = optimized.path;
      } else if (isImage) {
        // Сжимаем большие изображения
        processedUri = await this.compressImage(filePath, fileSize);
      }
    }
    
    const b64 = await RNFS.readFile(processedUri.replace('file://', ''), 'base64');
    const payload = JSON.stringify({ b64, name: fileName, type: fileType, size: fileSize });
    const msgType = isImage ? 'image' : isVideo ? 'video' : 'file';
    await sendP2PMessage(chatId, payload, msgType, { fileName, fileSize, fileType, fileUri: uri, mediaUri: isImage || isVideo ? uri : undefined });
  };

  const compressImage = async (filePath: string, originalSize: number): Promise<string> => {
    // Простое сжатие изображений для больших файлов
    const quality = originalSize > 100 * 1024 * 1024 ? 0.6 : 0.8;
    // В реальной реализации здесь была бы библиотека сжатия изображений
    return filePath;
  };

  const pickFromGallery = async () => {
    setShowMediaPicker(false);
    const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
    if (result.assets?.[0]) {
      const a = result.assets[0];
      await sendFileMessage(a.uri, a.fileName, a.fileSize, a.type);
    }
  };

  const takePhoto = async () => {
    setShowMediaPicker(false);
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    const result = await launchCamera({ mediaType: 'photo', saveToPhotos: false });
    if (result.assets?.[0]) {
      const a = result.assets[0];
      await sendFileMessage(a.uri, a.fileName, a.fileSize, a.type);
    }
  };

  const startVideoMessage = async () => {
    if (!hasCamPerm) await reqCamPerm();
    if (!hasMicPerm) await reqMicPerm();
    if (!device) { showAlert('Ошибка', 'Камера недоступна'); return; }
    setShowVideoRecorder(true);
    setVideoRecordTime(0);
    setRecordedVideoPath(null);
  };

  const sendPoll = () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) {
      showAlert('Ошибка', 'Введите вопрос и минимум 2 варианта');
      return;
    }
    const poll = {
      question: pollQuestion.trim(),
      options: validOptions,
      votes: {},
      isAnonymous: false,
      isMultiple: false,
    };
    sendP2PMessage(chatId, JSON.stringify(poll), 'poll', { poll });
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const votePoll = (messageId: string, optionIndex: number) => {
    const currentProfile = useStore.getState().profile;
    if (!currentProfile || !chat) return;
    const msg = chat.messages.find(m => m.id === messageId);
    if (!msg?.poll || msg.poll.isClosed) return;
    
    const votes = { ...msg.poll.votes };
    Object.keys(votes).forEach(idx => {
      votes[Number(idx)] = (votes[Number(idx)] || []).filter(id => id !== currentProfile.fingerprint);
    });
    if (!votes[optionIndex]) votes[optionIndex] = [];
    votes[optionIndex].push(currentProfile.fingerprint);
    
    useStore.setState(s => ({
      chats: s.chats.map(c => c.id === chatId ? {
        ...c,
        messages: c.messages.map(m => m.id === messageId ? { ...m, poll: { ...m.poll!, votes } } : m)
      } : c)
    }));
    
    sendP2PMessage(chatId, JSON.stringify({ messageId, optionIndex, oderId: currentProfile.fingerprint }), 'poll');
  };

  const sendLocation = async () => {
    setShowMediaPicker(false);
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { showAlert('Ошибка', 'Нет доступа к геолокации'); return; }
    }
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const payload = JSON.stringify({ latitude, longitude });
        sendP2PMessage(chatId, payload, 'location', { latitude, longitude });
      },
      (err) => showAlert('Ошибка', 'Не удалось получить геолокацию'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const openLocation = (lat: number, lng: number) => {
    const url = Platform.OS === 'ios' 
      ? `maps:?q=${lat},${lng}` 
      : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`));
  };

  const startCameraRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setIsRecordingVideoMsg(true);
    setVideoRecordTime(0);
    videoRecordInterval.current = setInterval(() => {
      setVideoRecordTime(t => {
        if (t >= 60) { stopCameraRecording(); return 60; }
        return t + 1;
      });
    }, 1000);
    cameraRef.current.startRecording({
      onRecordingFinished: (video) => setRecordedVideoPath(video.path),
      onRecordingError: (e) => __DEV__ && console.error('Recording error:', e),
    });
  }, []);

  const stopCameraRecording = useCallback(async () => {
    if (videoRecordInterval.current) {
      clearInterval(videoRecordInterval.current);
      videoRecordInterval.current = null;
    }
    setIsRecordingVideoMsg(false);
    if (cameraRef.current) {
      try {
        await cameraRef.current.stopRecording();
      } catch (e) {
        __DEV__ && console.error('stopRecording error:', e);
      }
    }
  }, []);

  const cancelVideoMessage = () => {
    stopCameraRecording();
    setShowVideoRecorder(false);
    setRecordedVideoPath(null);
    setVideoRecordTime(0);
  };

  const [videoSendProgress, setVideoSendProgress] = useState(0);
  const [isSendingVideo, setIsSendingVideo] = useState(false);

  const sendVideoMessage = async () => {
    const path = recordedVideoPath;
    const duration = videoRecordTime;
    
    if (!path) {
      showAlert('Подождите', 'Видео ещё обрабатывается');
      return;
    }
    
    const uri = path.startsWith('file://') ? path : `file://${path}`;
    const chat = chats.find(c => c.id === chatId);
    const peerId = chat?.peerId;
    
    setShowVideoRecorder(false);
    setRecordedVideoPath(null);
    setVideoRecordTime(0);
    
    if (duration >= 1 && peerId) {
      setIsSendingVideo(true);
      setVideoSendProgress(0);
      
      // Добавляем сообщение локально (без отправки через messageQueue)
      const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      addMessage(chatId, {
        id: msgId,
        timestamp: Date.now(),
        isOutgoing: true,
        isDirect: true,
        type: 'videoMessage',
        mediaUri: uri,
        mediaDuration: duration,
        status: 'sending',
      });
      
      // Отправляем файл чанками
      sendFileChunked(peerId, path, 'videoMessage', duration, (p) => setVideoSendProgress(p))
        .then(() => setIsSendingVideo(false))
        .catch(() => setIsSendingVideo(false));
    }
  };

  const recordVideoMessage = async () => {
    setShowMediaPicker(false);
    startVideoMessage();
  };

  const handleMessageLongPress = (message: Message) => {
    Vibration.vibrate(50);
    setSelectedMessage(message);
    setShowMessageMenu(true);
  };

  const copyMessage = () => {
    if (selectedMessage?.text) {
      Clipboard.setString(selectedMessage.text);
    }
    setShowMessageMenu(false);
  };

  const replyToMessage = () => {
    if (selectedMessage) {
      setReplyTo(selectedMessage);
    }
    setShowMessageMenu(false);
  };

  const deleteMessageHandler = () => {
    setShowMessageMenu(false);
    if (selectedMessage) {
      setDeleteConfirmVisible(true);
    }
  };

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const forwardMessage = () => {
    setShowMessageMenu(false);
    if (selectedMessage) setShowForwardModal(true);
  };

  const doForward = async (targetChatId: string) => {
    if (!selectedMessage) return;
    setShowForwardModal(false);
    const fwdText = selectedMessage.text ? `[Переслано]\n${selectedMessage.text}` : '[Переслано]';
    await sendP2PMessage(targetChatId, fwdText, selectedMessage.type || 'text', {
      fileName: selectedMessage.fileName,
      fileSize: selectedMessage.fileSize,
      fileType: selectedMessage.fileType,
      fileUri: selectedMessage.fileUri,
      mediaUri: selectedMessage.mediaUri,
      mediaDuration: selectedMessage.mediaDuration,
    });
  };

  const hasCustomAvatar = chat?.avatar && (chat.avatar.startsWith('file://') || chat.avatar.startsWith('content://') || chat.avatar.startsWith('http') || chat.avatar.startsWith('data:'));
  const avatarLetter = (chat?.alias || chat?.username || chat?.peerId || 'U')[0].toUpperCase();

  const MessageBubble = ({ message }: { message: Message }) => {
    const isVoice = message.type === 'voice';
    const isVideo = message.type === 'video';
    const isVideoMessage = message.type === 'videoMessage';
    const isImage = message.type === 'image';
    const isSticker = message.type === 'sticker';
    const isFile = message.type === 'file';
    const isLocation = message.type === 'location';
    const replyMsg = message.replyTo && chat ? chat.messages.find(m => m.id === message.replyTo) : null;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const swipeRef = useRef<Swipeable>(null);
    const isSelected = selectedMessages.has(message.id);

    const onPress = () => {
      if (selectionMode) {
        setSelectedMessages(prev => {
          const next = new Set(prev);
          if (next.has(message.id)) next.delete(message.id);
          else next.add(message.id);
          return next;
        });
      }
    };

    const onLongPress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      handleMessageLongPress(message);
    };

    const onSwipeReply = () => {
      Vibration.vibrate(30);
      setReplyTo(message);
      swipeRef.current?.close();
    };

    const renderReplyAction = (progress: Animated.AnimatedInterpolation<number>) => {
      const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [message.isOutgoing ? 60 : -60, 0] });
      return (
        <Animated.View style={{ width: 60, justifyContent: 'center', alignItems: 'center', transform: [{ translateX: trans }] }}>
          <ReplyIcon size={20} color={colors.accent} />
        </Animated.View>
      );
    };

    const openMedia = () => {
      if (selectionMode) { onPress(); return; }
      const uri = message.mediaUri ?? message.fileUri;
      if (!uri) { showAlert('Ошибка', 'Нет файла'); return; }
      if (isImage || isVideoMessage || isVideo) {
        setMediaViewer({ visible: true, uri, type: isImage ? 'image' : 'video' });
      } else {
        FileViewer.open(uri.startsWith('file://') ? uri.substring(7) : uri, { showOpenWithDialog: true, displayName: message.fileName }).catch(() => {
          showAlert('Ошибка', 'Нет приложения для открытия этого типа файла');
        });
      }
    };

    const togglePlay = async () => {
      if (!message.mediaUri) {
        showAlert('Ошибка', 'Нет файла аудио');
        return;
      }

      try {
        const audio = getAudio();
        if (playingId === message.id) {
          await audio.stopPlayer();
          setPlayingId(null);
          setPlayPosMs(0);
          setPlayDurMs(0);
          audio.removePlayBackListener();
          return;
        }

        await audio.stopPlayer();
        audio.removePlayBackListener();
        setPlayingId(message.id);
        setPlayPosMs(0);
        setPlayDurMs(0);
        await audio.startPlayer(message.mediaUri);
        audio.addPlayBackListener((e: any) => {
          const dur = Number(e.duration ?? 0);
          const pos = Number(e.currentPosition ?? 0);
          if (dur > 0) setPlayDurMs(dur);
          if (pos >= 0) setPlayPosMs(pos);
          if (dur > 0 && pos >= dur) {
            audio.stopPlayer().catch(() => {});
            setPlayingId(null);
            setPlayPosMs(0);
            setPlayDurMs(0);
            audio.removePlayBackListener();
          }
        });
      } catch (e) {
        __DEV__ && console.error('playback failed:', e);
        setPlayingId(null);
        setPlayPosMs(0);
        setPlayDurMs(0);
      }
    };

    if (isSticker) {
      return (
        <Swipeable ref={swipeRef} renderLeftActions={message.isOutgoing ? undefined : renderReplyAction} renderRightActions={message.isOutgoing ? renderReplyAction : undefined} onSwipeableOpen={onSwipeReply} overshootLeft={false} overshootRight={false}>
          <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
            <Animated.View style={[styles.bubbleContainer, message.isOutgoing ? styles.outgoingContainer : styles.incomingContainer, { transform: [{ scale: scaleAnim }] }, isSelected && { backgroundColor: colors.accent + '30' }]}>
              {selectionMode && (
                <View style={{ position: 'absolute', left: -30, top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.accent, backgroundColor: isSelected ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  {isSelected && <CheckIcon size={14} color="#fff" />}
                </View>
              )}
              <Text style={{ fontSize: 64 }}>{message.stickerEmoji}</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>{formatTime(message.timestamp)}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Swipeable>
      );
    }

    if (isVideoMessage) {
      return (
        <Swipeable ref={swipeRef} renderLeftActions={message.isOutgoing ? undefined : renderReplyAction} renderRightActions={message.isOutgoing ? renderReplyAction : undefined} onSwipeableOpen={onSwipeReply} overshootLeft={false} overshootRight={false}>
          <View style={[styles.bubbleContainer, message.isOutgoing ? styles.outgoingContainer : styles.incomingContainer, isSelected && { backgroundColor: colors.accent + '30' }]}>
            {selectionMode && (
              <View style={{ position: 'absolute', left: message.isOutgoing ? undefined : -30, right: message.isOutgoing ? -30 : undefined, top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.accent, backgroundColor: isSelected ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                {isSelected && <CheckIcon size={14} color="#fff" />}
              </View>
            )}
            {message.mediaUri ? (
              <CircleVideoMessage
                uri={message.mediaUri}
                duration={message.mediaDuration || 0}
                size={200}
                onLongPress={onLongPress}
              />
            ) : (
              <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Загрузка...</Text>
              </View>
            )}
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 6, alignSelf: message.isOutgoing ? 'flex-end' : 'flex-start' }}>{formatTime(message.timestamp)}</Text>
          </View>
        </Swipeable>
      );
    }

    return (
      <Swipeable ref={swipeRef} renderLeftActions={message.isOutgoing ? undefined : renderReplyAction} renderRightActions={message.isOutgoing ? renderReplyAction : undefined} onSwipeableOpen={onSwipeReply} overshootLeft={false} overshootRight={false}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
        <Animated.View style={[styles.bubbleContainer, message.isOutgoing ? styles.outgoingContainer : styles.incomingContainer, { transform: [{ scale: scaleAnim }] }, isSelected && { backgroundColor: colors.accent + '30' }]}>
          {selectionMode && (
            <View style={{ position: 'absolute', left: message.isOutgoing ? undefined : -30, right: message.isOutgoing ? -30 : undefined, top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.accent, backgroundColor: isSelected ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              {isSelected && <CheckIcon size={14} color="#fff" />}
            </View>
          )}
          <View style={[styles.bubble, { padding: isVoice || isVideo ? spacing.sm : spacing.md, borderRadius: chatAppearance.bubbleStyle === 'sharp' ? radius.sm : chatAppearance.bubbleStyle === 'minimal' ? 0 : radius.lg }, message.isOutgoing ? { backgroundColor: colors.accent, borderBottomRightRadius: chatAppearance.bubbleStyle === 'minimal' ? 0 : radius.sm } : { backgroundColor: colors.surface, borderBottomLeftRadius: chatAppearance.bubbleStyle === 'minimal' ? 0 : radius.sm }]}>
            {replyMsg && (
              <View style={{ borderLeftWidth: 2, borderLeftColor: message.isOutgoing ? colors.background : colors.accent, paddingLeft: spacing.sm, marginBottom: spacing.sm, opacity: 0.8 }}>
                <Text style={{ fontSize: 12, color: message.isOutgoing ? colors.background : colors.accent, fontWeight: '600' }}>{replyMsg.isOutgoing ? 'Вы' : (chat.alias || chat.username || 'Собеседник')}</Text>
                <Text style={{ fontSize: 12, color: message.isOutgoing ? colors.background : colors.text }} numberOfLines={1}>{replyMsg.text || (replyMsg.type === 'voice' ? 'Голосовое' : replyMsg.type === 'file' ? 'Файл' : '')}</Text>
              </View>
            )}
            {(isVoice || isVideo) ? (
            isVoice ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 220 }}>
                <TouchableOpacity onPress={togglePlay} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: message.isOutgoing ? colors.background : colors.accent, fontSize: 16 }}>{playingId === message.id ? '❚❚' : '▸'}</Text>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <VoiceWaveform
                    seed={message.id}
                    progress={playingId === message.id && playDurMs > 0 ? Math.max(0, Math.min(1, playPosMs / playDurMs)) : 0}
                    baseColor={message.isOutgoing ? colors.background + '45' : colors.textSecondary + '35'}
                    activeColor={message.isOutgoing ? colors.background : colors.accent}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: message.isOutgoing ? colors.accentDark : colors.textSecondary }}>
                      {formatDuration(
                        playingId === message.id && playDurMs > 0
                          ? Math.max(0, Math.round((playDurMs - playPosMs) / 1000))
                          : (message.mediaDuration || 0)
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 150 }}>
                <TouchableOpacity onPress={openMedia} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: message.isOutgoing ? colors.background : colors.accent, fontSize: 16 }}>▶</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <View style={{ height: 20, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, borderRadius: 10, overflow: 'hidden' }}>
                    <View style={{ width: '60%', height: '100%', backgroundColor: message.isOutgoing ? colors.background + '40' : colors.accent + '40' }} />
                  </View>
                  <Text style={{ fontSize: 11, color: message.isOutgoing ? colors.accentDark : colors.textSecondary, marginTop: 2 }}>{formatDuration(message.mediaDuration || 0)}</Text>
                </View>
                <Text style={{ marginLeft: spacing.sm, color: message.isOutgoing ? colors.accentDark : colors.textSecondary }}>📹</Text>
              </View>
            )
          ) : isFile ? (
            <TouchableOpacity onPress={openMedia} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', minWidth: 180 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: message.isOutgoing ? colors.background : colors.accent, fontSize: 16 }}>⬇</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text numberOfLines={1} style={{ color: message.isOutgoing ? colors.background : colors.text, fontSize: 14, fontWeight: '600' }}>
                  {message.fileName ?? 'Файл'}
                </Text>
                <Text style={{ marginTop: 2, color: message.isOutgoing ? colors.accentDark : colors.textSecondary, fontSize: 11 }}>
                  {typeof message.fileSize === 'number' ? `${Math.max(1, Math.round(message.fileSize / 1024))} KB` : (message.fileType ?? '')}
                </Text>
              </View>
            </TouchableOpacity>
          ) : isImage ? (
            <TouchableOpacity onPress={openMedia} activeOpacity={0.9}>
              <Image source={{ uri: message.mediaUri }} style={{ width: 200, height: 200, borderRadius: radius.lg }} resizeMode="cover" />
            </TouchableOpacity>
          ) : isLocation ? (
            <TouchableOpacity onPress={() => message.latitude && message.longitude && openLocation(message.latitude, message.longitude)} activeOpacity={0.8} style={{ minWidth: 180 }}>
              <View style={{ width: 180, height: 100, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs }}>
                <LocationIcon size={32} color={message.isOutgoing ? colors.background : colors.accent} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LocationIcon size={14} color={message.isOutgoing ? colors.background : colors.text} />
                <Text style={{ color: message.isOutgoing ? colors.background : colors.text, fontSize: 13, marginLeft: 4 }}>Геолокация</Text>
              </View>
              <Text style={{ color: message.isOutgoing ? colors.accentDark : colors.textSecondary, fontSize: 11 }}>{message.latitude?.toFixed(5)}, {message.longitude?.toFixed(5)}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={{ color: message.isOutgoing ? colors.background : colors.text, fontSize, lineHeight: fontSize * 1.4 }}>{message.text}</Text>
              {message.linkPreview && (
                <TouchableOpacity onPress={() => Linking.openURL(message.linkPreview!.url)} style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: message.isOutgoing ? colors.accentDark : colors.surfaceLight, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
                  {message.linkPreview.image && <Image source={{ uri: message.linkPreview.image }} style={{ width: '100%', height: 100, borderRadius: radius.sm, marginBottom: spacing.xs }} resizeMode="cover" />}
                  {message.linkPreview.title && <Text style={{ color: message.isOutgoing ? colors.background : colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{message.linkPreview.title}</Text>}
                  {message.linkPreview.description && <Text style={{ color: message.isOutgoing ? colors.accentDark : colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{message.linkPreview.description}</Text>}
                  <Text style={{ color: colors.accent, fontSize: 11, marginTop: 4 }} numberOfLines={1}>{message.linkPreview.url}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <TouchableOpacity key={emoji} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 2 }} onPress={() => { if (chat) { addReaction(chat.id, message.id, emoji); sendP2PMessage(chat.peerId, JSON.stringify({ messageId: message.id, emoji }), 'reaction'); } }}>
                  <Text style={{ fontSize: 12 }}>{emoji}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 2 }}>{users.length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Edited indicator */}
          {message.editedAt && <Text style={{ fontSize: 9, color: colors.textSecondary, fontStyle: 'italic' }}>изменено</Text>}
          {(chatAppearance.showTime || chatAppearance.showStatus || message.isBot) && (
            <View style={styles.messageFooter}>
              {message.isBot && <View style={{ marginRight: 4 }}><BotIcon size={10} color={colors.accent} /></View>}
              {message.isDirect ? <P2PIcon size={10} color={message.isOutgoing ? colors.accentDark : colors.textSecondary} /> : <RelayIcon size={10} color={message.isOutgoing ? colors.accentDark : colors.textSecondary} />}
              {message.isTemporary && <View style={{ marginLeft: 4 }}><ClockIcon size={10} color={message.isOutgoing ? colors.accentDark : colors.textSecondary} /></View>}
              {chatAppearance.showTime && <Text style={{ fontSize: 10, color: message.isOutgoing ? colors.accentDark : colors.textSecondary, marginLeft: 4 }}>{formatTime(message.timestamp)}</Text>}
              {chatAppearance.showStatus && message.isOutgoing && <View style={{ marginLeft: 4 }}>{message.status === 'read' ? <DoubleCheckIcon size={12} color={colors.accent} /> : message.status === 'delivered' ? <DoubleCheckIcon size={12} color={message.isOutgoing ? colors.accentDark : colors.textSecondary} /> : <CheckIcon size={12} color={message.isOutgoing ? colors.accentDark : colors.textSecondary} />}</View>}
            </View>
          )}
        </View>
      </Animated.View>
      </TouchableOpacity>
      </Swipeable>
    );
  };

  const formatLastSeen = (ts?: number) => {
    if (!ts) return 'Не в сети';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'был(а) только что';
    if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `был(а) ${Math.floor(diff / 3600000)} ч назад`;
    return 'был(а) давно';
  };

  if (!chat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Чат не найден</Text>
      </View>
    );
  }

  // Selection mode header
  const renderSelectionHeader = () => (
    <View style={[styles.header, { padding: spacing.md, backgroundColor: colors.accent }]}>
      <TouchableOpacity style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full }]} onPress={() => { setSelectionMode(false); setSelectedMessages(new Set()); }}>
        <CloseIcon size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: spacing.md }}>{selectedMessages.size} выбрано</Text>
      <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => {
        selectedMessages.forEach(id => {
          const msg = chat?.messages.find(m => m.id === id);
          if (msg) addBookmark(chatId, id, msg.text, msg.type, msg.mediaUri);
        });
        setSelectionMode(false); setSelectedMessages(new Set());
      }}>
        <BookmarkIcon size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => { setShowForwardModal(true); }}>
        <ForwardMsgIcon size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => {
        selectedMessages.forEach(id => { if (chat) useStore.getState().deleteMessage(chat.id, id); });
        setSelectionMode(false); setSelectedMessages(new Set());
      }}>
        <TrashIcon size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      {selectionMode ? renderSelectionHeader() : (
      <View style={[styles.header, { padding: spacing.md, backgroundColor: colors.surface, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.text} />
        </TouchableOpacity>
        {showSearch ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.full, paddingHorizontal: spacing.md }}>
            <TextInput style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: spacing.sm }} value={searchQuery} onChangeText={setSearchQuery} placeholder="Поиск..." placeholderTextColor={colors.textSecondary} autoFocus />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
              <CloseIcon size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.headerInfo, { marginHorizontal: spacing.md }]} onPress={() => {
            if (chat.isGroup && chat.groupId) {
              navigation.navigate('GroupSettings', { groupId: chat.groupId });
            } else {
              navigation.navigate('UserProfile', { oderId: chat.fingerprint || chat.peerId });
            }
          }}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.surfaceLight, borderRadius: radius.full, overflow: 'hidden' }]}>
              {hasCustomAvatar ? <Image source={{ uri: chat.avatar }} style={{ width: 44, height: 44 }} resizeMode="cover" /> : <View style={{ width: 44, height: 44, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.background, fontSize: 20, fontWeight: '700' }}>{avatarLetter}</Text></View>}
            </View>
            <View>
              <Text style={{ color: colors.text, fontSize, fontWeight: '600' }}>{chat.alias || chat.username || chat.peerId.slice(0, 12)}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: chat.isOnline ? colors.online : colors.offline }]} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {(chat as any).isTyping ? 'печатает...' : (chat as any).isRecording ? 'записывает голосовое...' : chat.isOnline ? 'В сети' : formatLastSeen(chat.lastSeen)}
                </Text>
                {/* E2EE Transport indicator */}
                {transportMode === 'p2p' ? (
                  <Text style={{ color: colors.accent, fontSize: 10, marginLeft: 6 }}>⚡P2P</Text>
                ) : transportMode === 'relay' ? (
                  <Text style={{ color: '#FFC107', fontSize: 10, marginLeft: 6 }}>📡Relay</Text>
                ) : (
                  <Text style={{ color: colors.textSecondary, fontSize: 10, marginLeft: 6 }}>...</Text>
                )}
                {chat.publicKey && <Text style={{ color: colors.accent, fontSize: 10, marginLeft: 4 }}>🔐</Text>}
              </View>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full, marginRight: spacing.sm }]} onPress={() => setShowSearch(!showSearch)}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full, marginRight: spacing.sm }]} onPress={() => startCall('voice')}>
          <PhoneIcon size={18} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surfaceLight, borderRadius: radius.full }]} onPress={() => startCall('video')}>
          <VideoIcon size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
      )}

      {/* Messages */}
      <FlatList 
        ref={flatListRef} 
        data={(() => {
          const msgs = searchQuery ? chat.messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())) : chat.messages;
          const result: (Message | { type: 'date'; date: string; key: string })[] = [];
          let lastDate = '';
          for (const m of msgs) {
            const dateKey = getDateKey(m.timestamp);
            if (dateKey !== lastDate) {
              result.push({ type: 'date', date: formatDateSeparator(m.timestamp), key: `date_${dateKey}` });
              lastDate = dateKey;
            }
            result.push(m);
          }
          return result;
        })()} 
        keyExtractor={(item: any) => item.key || item.id} 
        renderItem={({ item }: any) => item.type === 'date' ? (
          <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
            <View style={{ backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.date}</Text>
            </View>
          </View>
        ) : <MessageBubble message={item} />} 
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }} 
        style={chatAppearance.wallpaper ? { backgroundColor: chatAppearance.wallpaper } : undefined} 
        showsVerticalScrollIndicator={false} 
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onScroll={(e) => setShowScrollDown(e.nativeEvent.contentOffset.y < e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height - 100)}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
      />

      {/* Scroll Down Button */}
      {showScrollDown && (
        <TouchableOpacity 
          style={{ position: 'absolute', right: spacing.md, bottom: 100, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
          onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={{ color: colors.accent, fontSize: 18 }}>↓</Text>
        </TouchableOpacity>
      )}

      {/* Emoji Panel */}
      {showEmoji && (
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: 280 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {EMOJI_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={{ padding: spacing.md, borderBottomWidth: 2, borderBottomColor: emojiTab === cat.id ? colors.accent : 'transparent' }} onPress={() => setEmojiTab(cat.id)}>
                <Text style={{ fontSize: 20 }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ padding: spacing.md, borderBottomWidth: 2, borderBottomColor: emojiTab === 'stickers' ? colors.accent : 'transparent' }} onPress={() => setEmojiTab('stickers')}>
              <BoxIcon size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
          <ScrollView style={{ padding: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {emojiTab === 'stickers' ? (
                STICKERS.map(s => (
                  <TouchableOpacity key={s.id} style={{ padding: spacing.sm }} onPress={() => sendMessage('sticker', { stickerEmoji: s.emoji })}>
                    <Text style={{ fontSize: 36 }}>{s.emoji}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                EMOJI_CATEGORIES.find(c => c.id === emojiTab)?.emojis.map((e, i) => (
                  <TouchableOpacity key={i} style={{ padding: 4 }} onPress={() => setText(t => t + e)}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Reply Bar */}
      {replyTo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{replyTo.isOutgoing ? 'Вы' : (chat.alias || chat.username || 'Собеседник')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{replyTo.text || (replyTo.type === 'voice' ? 'Голосовое' : 'Файл')}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: spacing.sm }}>
            <CloseIcon size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Bar */}
      {editingMessage && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.warning }}>
          <EditIcon size={16} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600' }}>Редактирование</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{editingMessage.text}</Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingMessage(null); setText(''); }} style={{ padding: spacing.sm }}>
            <CloseIcon size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputWrapper, { padding: spacing.md, paddingBottom: spacing.lg }]}>
        {isRecording ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error + '20', borderRadius: radius.xl, padding: spacing.md }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error, marginRight: spacing.sm }} />
            <Text style={{ color: colors.error, flex: 1, fontWeight: '600' }}>{formatDuration(recordingTime)}</Text>
            <TouchableOpacity onPress={() => stopRecording(false)} style={{ marginRight: spacing.md }}>
              <CloseIcon size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopRecording(true)}>
              <SendIcon size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingHorizontal: spacing.sm }]}>
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => setShowEmoji(!showEmoji)}>
              <SmileIcon size={20} color={showEmoji ? colors.accent : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => setShowMediaPicker(true)}>
              <AttachIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput style={{ flex: 1, color: colors.text, fontSize, maxHeight: 100, paddingVertical: spacing.sm }} value={text} onChangeText={handleTextChange} placeholder="Сообщение..." placeholderTextColor={colors.textSecondary} multiline onFocus={() => setShowEmoji(false)} />
            <TouchableOpacity style={[{ padding: spacing.sm, borderRadius: radius.full }, silentMode && { backgroundColor: colors.accent }]} onPress={() => setSilentMode(!silentMode)}>
              <SilentIcon size={18} color={silentMode ? colors.background : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[{ padding: spacing.sm, borderRadius: radius.full }, isTemporary && { backgroundColor: colors.accent }]} onPress={() => setIsTemporary(!isTemporary)}>
              <ClockIcon size={18} color={isTemporary ? colors.background : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        {!isRecording && (
          text.trim() ? (
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]} onPress={() => sendMessage()}>
              <SendIcon size={20} color={colors.background} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: colors.accent, borderRadius: radius.full }]} 
              onPress={() => setRecordMode(recordMode === 'voice' ? 'video' : 'voice')}
              onLongPress={recordMode === 'voice' ? startRecording : recordVideoMessage}
              delayLongPress={200}
            >
              {recordMode === 'voice' ? (
                <VoiceIcon size={20} color={colors.background} />
              ) : (
                <VideoIcon size={20} color={colors.background} />
              )}
            </TouchableOpacity>
          )
        )}
      </View>

      {/* User Profile Modal */}
      <Modal visible={showUserProfile} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}>
            <View style={{ width: 100, height: 100, borderRadius: radius.full, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: spacing.md }}>
              {hasCustomAvatar ? <Image source={{ uri: chat.avatar }} style={{ width: 100, height: 100 }} resizeMode="cover" /> : <View style={{ width: 100, height: 100, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.background, fontSize: 44, fontWeight: '700' }}>{avatarLetter}</Text></View>}
            </View>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{chat.alias || 'Anonymous'}</Text>
            {chat.username && <Text style={{ color: colors.accent, fontSize: 16, marginTop: 4 }}>@{chat.username}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: chat.isOnline ? colors.online : colors.offline, marginRight: 6 }} />
              <Text style={{ color: colors.textSecondary }}>{chat.isOnline ? 'В сети' : 'Не в сети'}</Text>
            </View>
            {chat.bio && <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }}>{chat.bio}</Text>}
            <TouchableOpacity style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.surfaceLight, borderRadius: radius.md }} onPress={() => setShowKeyVerification(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <LockIcon size={14} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: 12, marginLeft: 4 }}>Верифицировать ключ</Text>
              </View>
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'monospace', marginTop: spacing.sm }}>{chat.peerId.slice(0, 20)}...</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.surfaceLight, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} onPress={() => startCall('voice')}>
                <PhoneIcon size={16} color={colors.text} />
                <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600', marginLeft: 6 }}>Позвонить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.surfaceLight, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} onPress={() => startCall('video')}>
                <VideoIcon size={16} color={colors.text} />
                <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600', marginLeft: 6 }}>Видео</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ paddingVertical: spacing.md, marginTop: spacing.sm }} onPress={() => setShowUserProfile(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Key Verification Modal */}
      <Modal visible={showKeyVerification} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' }]}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>🔐 Верификация ключа</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: spacing.md }}>Сравните код с собеседником лично для подтверждения безопасности</Text>
            <View style={{ padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.lg }}>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}>{chat.peerId.slice(0, 8)}</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}>{chat.peerId.slice(8, 16)}</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}>{chat.peerId.slice(16, 24)}</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}>{chat.peerId.slice(24, 32)}</Text>
            </View>
            <Text style={{ color: colors.accent, fontSize: 11, marginTop: spacing.md }}>Fingerprint: {chat.peerId.slice(-16).toUpperCase()}</Text>
            <TouchableOpacity style={{ paddingVertical: spacing.md, marginTop: spacing.lg }} onPress={() => setShowKeyVerification(false)}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Menu Modal */}
      <Modal visible={showMessageMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMessageMenu(false)}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.sm, minWidth: 220 }}>
            {/* Quick Reactions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.sm }}>
              {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                <TouchableOpacity key={emoji} style={{ padding: spacing.sm }} onPress={() => { if (selectedMessage && chat) { addReaction(chat.id, selectedMessage.id, emoji); sendP2PMessage(chat.peerId, JSON.stringify({ messageId: selectedMessage.id, emoji }), 'reaction'); } setShowMessageMenu(false); }}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={replyToMessage}>
              <ReplyIcon size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>Ответить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={copyMessage}>
              <CopyIcon size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>Копировать</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={forwardMessage}>
              <ForwardMsgIcon size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>Переслать</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={() => {
              if (selectedMessage && chat) {
                if (isBookmarked(chat.id, selectedMessage.id)) {
                  const bm = getBookmarks().find(b => b.chatId === chat.id && b.messageId === selectedMessage.id);
                  if (bm) removeBookmark(bm.id);
                } else {
                  addBookmark(chat.id, selectedMessage.id, selectedMessage.text, selectedMessage.type, selectedMessage.mediaUri);
                }
              }
              setShowMessageMenu(false);
            }}>
              <BookmarkIcon size={20} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>
                {selectedMessage && chat && isBookmarked(chat.id, selectedMessage.id) ? 'Убрать из избранного' : 'В избранное'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={() => {
              setSelectionMode(true);
              if (selectedMessage) setSelectedMessages(new Set([selectedMessage.id]));
              setShowMessageMenu(false);
            }}>
              <CheckIcon size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>Выбрать</Text>
            </TouchableOpacity>
            {selectedMessage?.isOutgoing && selectedMessage?.type === 'text' && (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={() => { setEditingMessage(selectedMessage); setText(selectedMessage.text || ''); setShowMessageMenu(false); }}>
                <EditIcon size={20} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 16, marginLeft: spacing.md }}>Редактировать</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }} onPress={deleteMessageHandler}>
              <TrashIcon size={20} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 16, marginLeft: spacing.md }}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Call Modal */}
      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg }}>
              {hasCustomAvatar ? <Image source={{ uri: chat?.avatar }} style={{ width: 120, height: 120, borderRadius: 60 }} resizeMode="cover" /> : <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.background, fontSize: 52, fontWeight: '700' }}>{avatarLetter}</Text></View>}
            </View>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{chat?.alias || chat?.username}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>{callType === 'video' ? 'Видеозвонок' : 'Голосовой звонок'}...</Text>
            <Text style={{ color: colors.accent, marginTop: spacing.md }}>Вызов...</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.xl * 2 }}>
            {callType === 'video' && (
              <TouchableOpacity style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                <VideoIcon size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
              <VoiceChatIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowCallModal(false)}>
              <CloseIcon size={24} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} />
      <CustomAlert 
        visible={deleteConfirmVisible} 
        title="Удалить сообщение?" 
        onClose={() => setDeleteConfirmVisible(false)}
        buttons={[
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить у меня', onPress: () => {
            if (selectedMessage) useStore.getState().deleteMessage(chatId, selectedMessage.id);
          }},
          { text: 'Удалить у всех', style: 'destructive', onPress: () => {
            if (selectedMessage) useStore.getState().deleteMessageForAll(chatId, selectedMessage.id);
          }},
        ]}
      />

      {/* Media Picker Modal */}
      <Modal visible={showMediaPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMediaPicker(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl * 2, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={pickFromGallery}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <GalleryIcon size={24} color={colors.background} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Галерея</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={takePhoto}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <CameraIcon size={24} color={colors.text} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Камера</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={recordVideoMessage}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <VideoIcon size={24} color={colors.text} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Кружок</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={handleFilePicker}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <FileIcon size={24} color={colors.text} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Файл</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={sendLocation}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <LocationIcon size={24} color={colors.text} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Геолокация</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', padding: spacing.md }} onPress={() => { setShowMediaPicker(false); setShowPollModal(true); }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 12 }}>Опрос</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Modal */}
      <Modal visible={showForwardModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { padding: spacing.lg }]}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 400, maxHeight: '70%' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>Переслать в...</Text>
            <ScrollView>
              {chats.filter(c => c.id !== chatId).map(c => (
                <TouchableOpacity key={c.id} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surfaceLight, borderRadius: radius.lg, marginBottom: spacing.sm }} onPress={() => doForward(c.id)}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                    <Text style={{ color: colors.accent, fontSize: 18 }}>{c.avatar || '⬡'}</Text>
                  </View>
                  <Text style={{ color: colors.text, flex: 1 }}>{c.alias || c.username || c.peerId.slice(0, 12)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ paddingVertical: spacing.md, marginTop: spacing.md }} onPress={() => setShowForwardModal(false)}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Message Recorder */}
      <Modal visible={showVideoRecorder} animationType="fade" statusBarTranslucent>
        <VideoMessageRecorder
          onClose={() => setShowVideoRecorder(false)}
          onSend={(path, duration) => {
            setShowVideoRecorder(false);
            const uri = path.startsWith('file://') ? path : `file://${path}`;
            const chat = chats.find(c => c.id === chatId);
            const peerId = chat?.peerId;
            // Добавляем локально без отправки через messageQueue
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            addMessage(chatId, {
              id: msgId,
              timestamp: Date.now(),
              isOutgoing: true,
              isDirect: true,
              type: 'videoMessage',
              mediaUri: uri,
              mediaDuration: duration,
              status: 'sending',
            });
            if (peerId) {
              sendFileChunked(peerId, path, 'videoMessage', duration).catch(e => __DEV__ && console.error(e));
            }
          }}
          hasCameraPermission={hasCamPerm}
          hasMicPermission={hasMicPerm}
        />
      </Modal>

      <MediaViewer visible={mediaViewer.visible} uri={mediaViewer.uri} type={mediaViewer.type} onClose={() => setMediaViewer({ ...mediaViewer, visible: false })} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  bubbleContainer: { marginBottom: 8, maxWidth: '80%' },
  incomingContainer: { alignSelf: 'flex-start' },
  outgoingContainer: { alignSelf: 'flex-end' },
  bubble: {},
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  sendBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 400, alignItems: 'center' },
});
