# P2P Usage Examples

## 1. Инициализация при старте приложения

```typescript
// src/App.tsx
import { P2PInitializer } from './services/p2pInit';
import { P2PLogger } from './services/p2pLogger';

useEffect(() => {
  const initP2P = async () => {
    try {
      const { peerId, publicKey } = await P2PInitializer.initializePeer();
      P2PLogger.success(P2PLogger.stages.INIT, 'P2P initialized', { peerId });
    } catch (error) {
      P2PLogger.error(P2PLogger.stages.INIT, 'Failed to initialize P2P', error);
    }
  };

  initP2P();
}, []);
```

## 2. Поиск пользователя по username

```typescript
// src/screens/SearchScreen.tsx
import { PeerSearch } from '../services/peerSearch';
import { P2PLogger } from '../services/p2pLogger';

const handleSearch = async (username: string) => {
  try {
    P2PLogger.log(P2PLogger.stages.PEER_SEARCH, 'Searching for:', username);
    
    const peer = await PeerSearch.searchByUsername(username);
    
    if (peer) {
      P2PLogger.success(P2PLogger.stages.PEER_SEARCH, 'Found peer', {
        username: peer.username,
        peerId: peer.peerId,
        verified: peer.verified
      });
      
      // Открываем чат с этим пиром
      navigateToPeerChat(peer.peerId);
    } else {
      P2PLogger.log(P2PLogger.stages.PEER_SEARCH, 'Peer not found');
    }
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.PEER_SEARCH, 'Search failed', error);
  }
};
```

## 3. Отправка сообщения

```typescript
// src/screens/ChatDetailScreen.tsx
import { messageQueue } from '../services/messageQueue';
import { P2PLogger } from '../services/p2pLogger';

const sendMessage = async (toPeerId: string, content: string) => {
  try {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    P2PLogger.log(P2PLogger.stages.MESSAGE_SEND, 'Sending message', {
      messageId,
      toPeerId,
      contentLength: content.length
    });

    const success = await messageQueue.sendMessage({
      id: messageId,
      chatId: 'chat_' + toPeerId,
      peerId: toPeerId,
      content,
      type: 'text',
      createdAt: Date.now(),
      retries: 0
    });

    if (success) {
      P2PLogger.success(P2PLogger.stages.MESSAGE_SEND, 'Message sent', { messageId });
      // Обновляем UI
      addMessageToChat(messageId, content, 'sent');
    } else {
      P2PLogger.log(P2PLogger.stages.MESSAGE_SEND, 'Message queued for retry', { messageId });
      // Сообщение в очереди, будет отправлено позже
    }
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.MESSAGE_SEND, 'Failed to send message', error);
  }
};
```

## 4. Обновление профиля

```typescript
// src/screens/ProfileScreen.tsx
import { messageQueue } from '../services/messageQueue';
import { P2PLogger } from '../services/p2pLogger';
import { storage, StorageKeys, saveToStorage } from '../services/storage';

const saveProfile = async (profile: any) => {
  try {
    P2PLogger.log(P2PLogger.stages.SYNC, 'Updating profile', { username: profile.username });

    // Сохраняем локально
    saveToStorage(StorageKeys.PROFILE, profile);

    // Синхронизируем через P2P
    await messageQueue.updateUserProfile(profile);

    P2PLogger.success(P2PLogger.stages.SYNC, 'Profile updated', { username: profile.username });
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.SYNC, 'Failed to update profile', error);
  }
};
```

## 5. Получение информации о пире

```typescript
// src/services/peerInfo.ts
import { PeerRegistry } from './peerRegistry';
import { PeerSearch } from './peerSearch';
import { P2PLogger } from './p2pLogger';

export const getPeerInfo = async (peerId: string) => {
  try {
    // 1. Проверяем локальный реестр
    let peer = await PeerRegistry.findByPeerId(peerId);
    
    if (peer) {
      P2PLogger.success(P2PLogger.stages.PEER_REGISTRY, 'Found in local registry', { peerId });
      return peer;
    }

    // 2. Ищем на relay сервере
    peer = await PeerSearch.searchByPeerId(peerId);
    
    if (peer) {
      P2PLogger.success(P2PLogger.stages.PEER_REGISTRY, 'Found on relay', { peerId });
      return peer;
    }

    P2PLogger.log(P2PLogger.stages.PEER_REGISTRY, 'Peer not found', { peerId });
    return null;
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.PEER_REGISTRY, 'Failed to get peer info', error);
    return null;
  }
};
```

## 6. Список всех известных пиров

```typescript
// src/screens/ContactsScreen.tsx
import { PeerRegistry } from '../services/peerRegistry';
import { P2PLogger } from '../services/p2pLogger';

const loadContacts = async () => {
  try {
    P2PLogger.log(P2PLogger.stages.PEER_REGISTRY, 'Loading contacts');

    const peers = await PeerRegistry.getAllPeers();

    P2PLogger.success(P2PLogger.stages.PEER_REGISTRY, 'Contacts loaded', {
      count: peers.length
    });

    setContacts(peers);
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.PEER_REGISTRY, 'Failed to load contacts', error);
  }
};
```

## 7. Проверка статуса подключения

```typescript
// src/components/PeerStatus.tsx
import { P2PNetwork } from '../services/p2pNetwork';
import { P2PLogger } from '../services/p2pLogger';

const checkPeerStatus = async (peerId: string, p2pNetwork: P2PNetwork) => {
  try {
    const directChannels = p2pNetwork.getDirectChannels();
    const isConnected = directChannels.includes(peerId);

    if (isConnected) {
      P2PLogger.success(P2PLogger.stages.P2P_CONNECT, 'Direct connection active', { peerId });
      return 'online_direct';
    } else {
      P2PLogger.log(P2PLogger.stages.P2P_CONNECT, 'Using relay', { peerId });
      return 'online_relay';
    }
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.P2P_CONNECT, 'Failed to check status', error);
    return 'offline';
  }
};
```

## 8. Синхронизация данных

```typescript
// src/services/dataSync.ts
import { P2PSync } from './p2pSync';
import { P2PInitializer } from './p2pInit';
import { P2PLogger } from './p2pLogger';

export const initializeDataSync = async () => {
  try {
    const peerId = await P2PInitializer.getPeerId();
    const p2pSync = new P2PSync(peerId);

    P2PLogger.log(P2PLogger.stages.SYNC, 'Data sync initialized', { peerId });

    // Синхронизируем профиль каждые 5 минут
    setInterval(async () => {
      const profile = loadFromStorage(StorageKeys.PROFILE);
      if (profile) {
        await p2pSync.syncProfile(profile);
      }
    }, 5 * 60 * 1000);

    return p2pSync;
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.SYNC, 'Failed to initialize data sync', error);
  }
};
```

## 9. Обработка входящих сообщений

```typescript
// src/services/messageHandler.ts
import { P2PLogger } from './p2pLogger';
import { useStore } from '../store';

export const handleIncomingMessage = async (fromPeerId: string, message: any) => {
  try {
    P2PLogger.log(P2PLogger.stages.MESSAGE_RECV, 'Received message', {
      fromPeerId,
      messageId: message.id,
      type: message.type
    });

    // Добавляем сообщение в чат
    const { addMessage } = useStore.getState();
    addMessage({
      id: message.id,
      from: fromPeerId,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      status: 'received'
    });

    P2PLogger.success(P2PLogger.stages.MESSAGE_RECV, 'Message processed', { messageId: message.id });
  } catch (error) {
    P2PLogger.error(P2PLogger.stages.MESSAGE_RECV, 'Failed to handle message', error);
  }
};
```

## 10. Отладка и мониторинг

```typescript
// src/screens/DebugScreen.tsx
import { P2PInitializer } from '../services/p2pInit';
import { PeerRegistry } from '../services/peerRegistry';
import { P2PLogger } from '../services/p2pLogger';

const DebugScreen = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const peerId = await P2PInitializer.getPeerId();
        const publicKey = await P2PInitializer.getPublicKey();
        const peers = await PeerRegistry.getAllPeers();

        setDebugInfo({
          peerId,
          publicKey: publicKey.substring(0, 20) + '...',
          peerCount: peers.length,
          peers: peers.map(p => ({
            username: p.username,
            peerId: p.peerId,
            verified: p.verified,
            lastSeen: new Date(p.lastSeen).toLocaleString()
          }))
        });

        P2PLogger.success(P2PLogger.stages.INIT, 'Debug info loaded', debugInfo);
      } catch (error) {
        P2PLogger.error(P2PLogger.stages.INIT, 'Failed to load debug info', error);
      }
    };

    loadDebugInfo();
  }, []);

  return (
    <ScrollView>
      <Text>PeerId: {debugInfo?.peerId}</Text>
      <Text>PublicKey: {debugInfo?.publicKey}</Text>
      <Text>Known Peers: {debugInfo?.peerCount}</Text>
      {debugInfo?.peers.map(p => (
        <View key={p.peerId}>
          <Text>{p.username} ({p.peerId})</Text>
          <Text>Verified: {p.verified ? 'Yes' : 'No'}</Text>
          <Text>Last seen: {p.lastSeen}</Text>
        </View>
      ))}
    </ScrollView>
  );
};
```

## Логирование в консоль

Все операции логируются с цветными префиксами:

```
✓ [INIT] P2P Peer initialized: Qm...
✓ [DHT] Registered in DHT: Qm...
✓ [PEER_SEARCH] Found on relay: username Qm...
✓ [MESSAGE_SEND] Message sent via direct channel: Qm...
✓ [SYNC] Profile synced: username
✓ [MESSAGE_RECV] Message processed: msg_123
```

Используйте эти логи для отладки и мониторинга работы P2P сети.
