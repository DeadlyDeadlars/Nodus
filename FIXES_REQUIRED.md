# NODUS - Required Fixes & Implementation Guide

## Quick Summary
- **Total Issues Found:** 50+
- **Critical:** 8
- **High Priority:** 15+
- **Medium Priority:** 10+
- **Status:** NOT PRODUCTION READY

---

## CRITICAL FIXES (Do First)

### Fix #1: Implement Store Functions

**File:** `src/store.ts`

**Current (BROKEN):**
```typescript
initP2P: async () => {},
sendP2PMessage: async () => '',
startCall: () => {},
```

**Required Implementation:**
```typescript
import { create } from 'zustand';
import { p2pService } from './services/p2p';
import { cryptoService } from './services/crypto';
import { storageService } from './services/storage';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  peerId: string;
  messages: Message[];
  isOnline: boolean;
  lastMessage?: Message;
  unreadCount: number;
}

interface StoreState {
  // State
  chats: Chat[];
  profile: any;
  settings: any;
  
  // Actions
  initP2P: () => Promise<void>;
  sendP2PMessage: (peerId: string, content: string) => Promise<string>;
  startCall: (peerId: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  chats: [],
  profile: {},
  settings: {},
  
  initP2P: async () => {
    try {
      await p2pService.init();
      // Load chats from storage
      const chats = await storageService.getChats();
      set({ chats });
    } catch (error) {
      if (__DEV__) console.error('P2P init failed:', error);
      throw error;
    }
  },
  
  sendP2PMessage: async (peerId: string, content: string) => {
    try {
      const messageId = await p2pService.sendMessage(peerId, {
        content,
        timestamp: Date.now(),
      });
      
      // Save to storage
      await storageService.saveMessage({
        id: messageId,
        chatId: peerId,
        content,
        timestamp: Date.now(),
        status: 'sent',
      });
      
      return messageId;
    } catch (error) {
      if (__DEV__) console.error('Send message failed:', error);
      throw error;
    }
  },
  
  startCall: async (peerId: string) => {
    try {
      await p2pService.startCall(peerId);
    } catch (error) {
      if (__DEV__) console.error('Start call failed:', error);
      throw error;
    }
  },
  
  acceptCall: async (callId: string) => {
    try {
      await p2pService.acceptCall(callId);
    } catch (error) {
      if (__DEV__) console.error('Accept call failed:', error);
      throw error;
    }
  },
  
  endCall: async (callId: string) => {
    try {
      await p2pService.endCall(callId);
    } catch (error) {
      if (__DEV__) console.error('End call failed:', error);
      throw error;
    }
  },
}));
```

---

### Fix #2: Remove Hardcoded Relay URLs

**Files to Fix:**
- `src/screens/OnboardingScreen.tsx`
- `src/screens/GroupSettingsScreen.tsx`
- `src/screens/MyProfileScreen.tsx`

**Create:** `src/config/relay.ts`
```typescript
export const RELAY_CONFIG = {
  primary: process.env.RELAY_PRIMARY || 'https://relay.nodus.social',
  fallbacks: [
    'https://relay2.nodus.social',
    'https://relay3.nodus.social',
  ],
  timeout: 5000,
  retries: 3,
};

export const connectToRelay = async (urls: string[] = [RELAY_CONFIG.primary, ...RELAY_CONFIG.fallbacks]) => {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RELAY_CONFIG.timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return { url, response };
      }
    } catch (error) {
      if (__DEV__) console.warn(`Relay ${url} failed:`, error);
      continue;
    }
  }
  
  throw new Error('All relay servers unavailable');
};
```

**Update OnboardingScreen.tsx:**
```typescript
// OLD:
fetch('http://194.87.103.193:3000/relay', { ... })

// NEW:
import { connectToRelay } from '../config/relay';

const { response } = await connectToRelay();
const data = await response.json();
```

---

### Fix #3: Guard All Console Logs

**Files to Fix:**
- `src/screens/OnboardingScreen.tsx`
- `src/screens/MyProfileScreen.tsx`
- `src/screens/ChatDetailScreen.tsx`
- `src/AppWrapper.tsx`

**Create:** `src/utils/logger.ts`
```typescript
export const logger = {
  log: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[NODUS] ${message}`, data);
    }
  },
  
  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(`[NODUS ERROR] ${message}`, error);
    }
    // In production, send to error tracking service
    // errorTracker.captureException(error, { message });
  },
  
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(`[NODUS WARN] ${message}`, data);
    }
  },
};
```

**Update all files:**
```typescript
// OLD:
console.log('Registering user:', regData);
console.error('Publish profile failed:', e);

// NEW:
import { logger } from '../utils/logger';

logger.log('Registering user:', regData);
logger.error('Publish profile failed:', e);
```

---

### Fix #4: Implement Missing Services

**Create:** `src/services/p2p.ts`
```typescript
import { RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';

export const p2pService = {
  peers: new Map(),
  
  async init() {
    // Initialize libp2p or WebRTC
    // Connect to bootstrap nodes
    // Start listening for connections
  },
  
  async sendMessage(peerId: string, message: any) {
    // Encrypt message
    // Send via P2P
    // Return message ID
    return `msg_${Date.now()}`;
  },
  
  async startCall(peerId: string) {
    // Create RTCPeerConnection
    // Send call offer
    // Wait for answer
  },
  
  async acceptCall(callId: string) {
    // Get peer connection
    // Send answer
    // Start media
  },
  
  async endCall(callId: string) {
    // Close peer connection
    // Notify peer
  },
};
```

**Create:** `src/services/crypto.ts`
```typescript
import nacl from 'tweetnacl';

export const cryptoService = {
  generateKeyPair() {
    return nacl.box.keyPair();
  },
  
  encrypt(message: string, publicKey: Uint8Array) {
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.box(
      nacl.util.decodeUTF8(message),
      nonce,
      publicKey,
      this.secretKey
    );
    return { encrypted, nonce };
  },
  
  decrypt(encrypted: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array) {
    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      publicKey,
      this.secretKey
    );
    return nacl.util.encodeUTF8(decrypted);
  },
};
```

**Create:** `src/services/storage.ts`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  async saveMessage(message: any) {
    const key = `msg_${message.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(message));
  },
  
  async getMessages(chatId: string) {
    const keys = await AsyncStorage.getAllKeys();
    const messageKeys = keys.filter(k => k.startsWith('msg_'));
    const messages = await AsyncStorage.multiGet(messageKeys);
    return messages.map(([_, data]) => JSON.parse(data || '{}'));
  },
  
  async saveChat(chat: any) {
    const key = `chat_${chat.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(chat));
  },
  
  async getChats() {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith('chat_'));
    const chats = await AsyncStorage.multiGet(chatKeys);
    return chats.map(([_, data]) => JSON.parse(data || '{}'));
  },
};
```

---

### Fix #5: Add Type Safety

**Create:** `src/types/index.ts`
```typescript
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  peerId: string;
  messages: Message[];
  isOnline: boolean;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  publicKey: string;
  alias: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  size: number;
  mimeType: string;
}

export interface Call {
  id: string;
  peerId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended';
  startedAt: number;
  endedAt?: number;
}
```

---

### Fix #6: Add Error Boundaries

**Create:** `src/components/ErrorBoundary.tsx`
```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error caught by boundary:', error);
    logger.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Что-то пошло не так
          </Text>
          <Text style={{ color: '#666', marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: '#007AFF', padding: 10, borderRadius: 8 }}
          >
            <Text style={{ color: 'white' }}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

---

### Fix #7: Add Input Validation

**Create:** `src/utils/validation.ts`
```typescript
export const validation = {
  isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  },
  
  isValidAlias(alias: string): boolean {
    return alias.length > 0 && alias.length <= 50;
  },
  
  isValidMessage(content: string): boolean {
    return content.trim().length > 0 && content.length <= 10000;
  },
  
  isValidGroupName(name: string): boolean {
    return name.length > 0 && name.length <= 100;
  },
  
  isValidPin(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
  },
};
```

---

## HIGH PRIORITY FIXES

### Fix #8: Implement Bookmarks Service

**File:** `src/screens/ChatDetailScreen.tsx`

**Current:**
```typescript
const addBookmark = async (b: any) => {};
const removeBookmark = async (id: string) => {};
```

**Fix:**
```typescript
const bookmarkService = {
  async add(message: Message) {
    await storageService.saveBookmark({
      id: `bookmark_${Date.now()}`,
      messageId: message.id,
      chatId: message.chatId,
      content: message.content,
      timestamp: Date.now(),
    });
  },
  
  async remove(messageId: string) {
    await storageService.deleteBookmark(messageId);
  },
  
  async getAll() {
    return await storageService.getBookmarks();
  },
};
```

---

### Fix #9: Implement Scheduled Messages

**File:** `src/screens/ScheduledMessagesScreen.tsx`

```typescript
const scheduledService = {
  async schedule(message: Message, sendAt: number) {
    await storageService.saveScheduledMessage({
      id: `scheduled_${Date.now()}`,
      ...message,
      sendAt,
      status: 'pending',
    });
  },
  
  async getAll() {
    return await storageService.getScheduledMessages();
  },
  
  async cancel(id: string) {
    await storageService.deleteScheduledMessage(id);
  },
};
```

---

### Fix #10: Add Proper Error Handling

**Pattern to use everywhere:**
```typescript
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  logger.error('Operation failed:', error);
  showAlert('Error', 'Operation failed. Please try again.');
  // Handle error gracefully
}
```

---

## MEDIUM PRIORITY FIXES

### Fix #11: Split Large Files

**ChatDetailScreen.tsx is 90KB** - Split into:
- `ChatDetailScreen.tsx` (container)
- `MessageList.tsx` (messages)
- `MessageInput.tsx` (input)
- `MessageActions.tsx` (actions)

### Fix #12: Add Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSendMessage = async () => {
  setIsLoading(true);
  try {
    await sendMessage();
  } finally {
    setIsLoading(false);
  }
};

return (
  <TouchableOpacity disabled={isLoading}>
    {isLoading ? <ActivityIndicator /> : <SendIcon />}
  </TouchableOpacity>
);
```

### Fix #13: Add Offline Support

```typescript
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected ?? false);
  });
  return unsubscribe;
}, []);

if (!isOnline) {
  return <OfflineIndicator />;
}
```

---

## Testing Checklist

- [ ] All console logs guarded with `__DEV__`
- [ ] All async operations have error handling
- [ ] All user inputs validated
- [ ] No hardcoded URLs
- [ ] All types properly defined
- [ ] Error boundaries in place
- [ ] Loading states for async operations
- [ ] Offline support implemented
- [ ] No memory leaks
- [ ] App doesn't crash on errors

---

## Implementation Priority

1. **Week 1:** Fixes #1-7 (Critical)
2. **Week 2:** Fixes #8-10 (High)
3. **Week 3:** Fixes #11-13 (Medium)
4. **Week 4:** Testing & QA

---

## Files to Create

```
src/
├── services/
│   ├── p2p.ts (NEW)
│   ├── crypto.ts (NEW)
│   └── storage.ts (NEW)
├── config/
│   └── relay.ts (NEW)
├── utils/
│   ├── logger.ts (NEW)
│   └── validation.ts (NEW)
├── components/
│   └── ErrorBoundary.tsx (NEW)
└── types/
    └── index.ts (UPDATE)
```

---

## Files to Update

- `src/store.ts` - Implement all functions
- `src/App.tsx` - Add error boundary, use navigationRef
- `src/AppWrapper.tsx` - Guard console logs
- `src/screens/OnboardingScreen.tsx` - Use relay config, guard logs
- `src/screens/ChatDetailScreen.tsx` - Split file, implement bookmarks
- `src/screens/SettingsScreen.tsx` - Implement functions
- `src/screens/MyProfileScreen.tsx` - Use relay config
- `src/screens/GroupSettingsScreen.tsx` - Use relay config

---

**Total Estimated Work:** 7-11 weeks  
**Status:** NOT PRODUCTION READY
