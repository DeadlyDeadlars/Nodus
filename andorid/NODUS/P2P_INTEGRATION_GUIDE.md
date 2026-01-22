# P2P Integration Guide

## Файлы для интеграции

### 1. Новые сервисы (созданы)
- `src/services/p2pInit.ts` - Инициализация постоянного peerId
- `src/services/dhtRegistry.ts` - DHT регистрация и поиск
- `src/services/peerRegistry.ts` - Реестр пиров с publicKey как первичный ключ
- `src/services/peerSearch.ts` - Нормализованный поиск пиров
- `src/services/versionedStore.ts` - Версионированное хранилище с CRDT
- `src/services/pubsub.ts` - Pub/Sub для синхронизации
- `src/services/p2pSync.ts` - Координация синхронизации
- `src/services/p2pLogger.ts` - Логирование для отладки

### 2. Обновлённые файлы
- `src/services/messageQueue.ts` - Интеграция P2PSync
- `src/services/p2pNetwork.ts` - Замените на `p2pNetworkNew.ts` (DHT + hole punching)

## Шаги интеграции

### Шаг 1: Добавить StorageKeys
```typescript
// src/services/storage.ts
export enum StorageKeys {
  // ... существующие
  PEER_ID = 'peer_id',
  PUBLIC_KEY = 'public_key',
  // ...
}
```

### Шаг 2: Инициализация при старте приложения
```typescript
// src/App.tsx
import { P2PInitializer } from './services/p2pInit';

useEffect(() => {
  const init = async () => {
    // Инициализируем P2P
    await P2PInitializer.initializePeer();
    console.log('✓ P2P initialized');
  };
  init();
}, []);
```

### Шаг 3: Обновление профиля
```typescript
// При сохранении профиля
import { messageQueue } from './services/messageQueue';

const saveProfile = async (profile: any) => {
  // Сохраняем локально
  saveToStorage(StorageKeys.PROFILE, profile);
  
  // Синхронизируем через P2P
  await messageQueue.updateUserProfile(profile);
};
```

### Шаг 4: Поиск пиров
```typescript
// При поиске пользователя
import { PeerSearch } from './services/peerSearch';

const searchUser = async (query: string) => {
  const peer = await PeerSearch.searchByUsername(query);
  if (peer) {
    console.log('Found:', peer.username, peer.peerId);
  }
};
```

### Шаг 5: Отправка сообщений
```typescript
// При отправке сообщения
import { messageQueue } from './services/messageQueue';

const sendMessage = async (toPeerId: string, content: string) => {
  const success = await messageQueue.sendMessage({
    id: 'msg_' + Date.now(),
    chatId: 'chat_' + toPeerId,
    peerId: toPeerId,
    content,
    type: 'text',
    createdAt: Date.now(),
    retries: 0
  });
  
  if (success) {
    console.log('✓ Message sent');
  }
};
```

## Логирование

Все операции логируются с префиксом:
```
[2025-12-30T20:20:57.917Z] [INIT] ✓ P2P Peer initialized: Qm...
[2025-12-30T20:20:58.000Z] [DHT] ✓ Registered in DHT: Qm...
[2025-12-30T20:20:59.000Z] [PEER_SEARCH] ✓ Found on relay: username Qm...
[2025-12-30T20:21:00.000Z] [MESSAGE_SEND] ✓ Message sent via direct channel: Qm...
```

## Проверка работы

### 1. Проверить инициализацию
```
✓ P2P Peer initialized: Qm...
✓ Registered in DHT: Qm... ['/ip4/127.0.0.1/tcp/4001']
✓ MessageQueue initialized: Qm...
```

### 2. Проверить поиск
```
✓ Found in local registry: username
✓ Peer registered: Qm... username
```

### 3. Проверить отправку
```
✓ Data channel opened: Qm...
✓ Message sent via direct channel: Qm...
→ Falling back to relay: Qm...
```

### 4. Проверить синхронизацию
```
✓ Profile synced: username
✓ Published to topic: profile:update
✓ Message synced: msg_123
```

## Типовые проблемы

| Проблема | Решение |
|----------|---------|
| Все идёт в relay | Проверьте DHT регистрацию в логах |
| Дубли аккаунтов | Проверьте PeerRegistry - должен быть один запись на publicKey |
| Потеря сообщений | Проверьте versioning и lamportClock |
| Медленная синхронизация | Увеличьте частоту polling (сейчас 5 сек) |

## Миграция с старого кода

1. Замените `p2pNetwork.ts` на `p2pNetworkNew.ts`
2. Обновите `messageQueue.ts` с новыми импортами
3. Добавьте `StorageKeys.PEER_ID` и `StorageKeys.PUBLIC_KEY`
4. Инициализируйте `P2PInitializer` при старте приложения
5. Используйте `PeerSearch` вместо прямого поиска
6. Используйте `messageQueue.updateUserProfile()` при изменении профиля

## Конфигурация

Все URL-ы находятся в `src/config.ts`:
```typescript
export default {
  BOOTSTRAP_NODES: ['http://bootstrap.example.com'],
  RELAY_URLS: ['http://relay.example.com/relay.php'],
  ICE_SERVERS: [...]
}
```

## Дальнейшие улучшения

- [ ] Добавить WebRTC STUN/TURN для лучшего NAT traversal
- [ ] Реализовать DHT на bootstrap сервере
- [ ] Добавить шифрование сообщений E2E
- [ ] Реализовать CRDT для конфликтов
- [ ] Добавить репликацию данных на 3+ пиров
- [ ] Оптимизировать polling (использовать WebSocket)
