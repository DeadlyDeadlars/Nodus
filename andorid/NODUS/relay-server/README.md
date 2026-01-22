# Blind Relay - Zero-Knowledge Architecture

## Концепция

```
┌─────────────────────────────────────────────────────────────┐
│                    BLIND RELAY                               │
│                                                              │
│  Relay ВИДИТ:           Relay НЕ ВИДИТ:                     │
│  • mailboxId (хэш)      • Реальный peerId                   │
│  • Зашифрованный blob   • Кто отправитель                   │
│  • Timestamp            • Содержимое сообщения              │
│  • Размер данных        • Социальный граф                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Как работает синхронизация аккаунта

```
Устройство 1                    Relay                    Устройство 2
     │                            │                            │
     │  1. Генерирует KeyPair     │                            │
     │     fingerprint = hash(pk) │                            │
     │     mailboxId = hash(fp)   │                            │
     │                            │                            │
     │  2. Регистрирует mailbox   │                            │
     │  ─────────────────────────>│                            │
     │     (challenge-response)   │                            │
     │                            │                            │
     │  3. Сохраняет sync data    │                            │
     │  ─────────────────────────>│  encrypted blob            │
     │                            │  (relay не может прочитать)│
     │                            │                            │
     │                            │     4. Импорт ключа        │
     │                            │<───────────────────────────│
     │                            │     (QR / seed phrase)     │
     │                            │                            │
     │                            │     5. Тот же mailboxId!   │
     │                            │     (потому что тот же ключ)
     │                            │                            │
     │                            │     6. Получает sync data  │
     │                            │────────────────────────────>│
     │                            │     (расшифровывает своим  │
     │                            │      ключом)               │
     │                            │                            │
     │                            │     ✓ Профиль              │
     │                            │     ✓ Контакты             │
     │                            │     ✓ Настройки            │
```

## Ключ = Идентичность

```typescript
// Один и тот же ключ на разных устройствах = один аккаунт
const keyPair = importFromSeedPhrase("word1 word2 ... word24");

// fingerprint детерминистично вычисляется из publicKey
const fingerprint = deriveFingerprint(keyPair.publicKey);

// mailboxId детерминистично вычисляется из fingerprint
const mailboxId = deriveMailboxId(fingerprint);

// Результат: на любом устройстве с этим ключом - тот же mailbox
```

## Запуск сервера

```bash
cd relay-server
npm install
npm start
```

Сервер слушает на порту 8082.

## API Endpoints

### POST /api/challenge
Получить challenge для аутентификации
```json
{ "mailboxId": "abc123..." }
→ { "ok": true, "challenge": "random_base64" }
```

### POST /api/register
Зарегистрировать mailbox
```json
{
  "mailboxId": "abc123...",
  "publicKey": "base64...",
  "signature": "base64...",  // подпись challenge
  "challenge": "random_base64"
}
→ { "ok": true }
```

### POST /api/send
Отправить сообщение (анонимно, без аутентификации)
```json
{
  "mailboxId": "abc123...",  // получатель (хэш)
  "blob": "encrypted..."     // зашифрованный конверт
}
→ { "ok": true, "messageId": "xyz789" }
```

### POST /api/poll
Получить сообщения (с аутентификацией)
```json
{
  "mailboxId": "abc123...",
  "timestamp": "1704000000000",
  "signature": "base64..."  // подпись "poll:mailboxId:timestamp"
}
→ { "ok": true, "messages": [{ "id": "...", "blob": "...", "ts": 123 }] }
```

### POST /api/ack
Подтвердить получение (удалить с сервера)
```json
{
  "mailboxId": "abc123...",
  "messageIds": ["id1", "id2"],
  "timestamp": "1704000000000",
  "signature": "base64..."
}
→ { "ok": true }
```

### POST /api/sync/set
Сохранить sync data
```json
{
  "syncMailboxId": "abc123..._sync",
  "blob": "encrypted...",
  "timestamp": "1704000000000",
  "signature": "base64..."
}
→ { "ok": true }
```

### POST /api/sync/get
Получить sync data
```json
{ "syncMailboxId": "abc123..._sync" }
→ { "ok": true, "blob": "encrypted...", "timestamp": 123 }
```

## Безопасность

1. **Challenge-Response** - нельзя зарегистрироваться с чужим mailboxId
2. **Подписи** - все операции чтения требуют подпись
3. **Шифрование** - relay видит только зашифрованные blob
4. **Хэширование** - relay не знает реальные peerId
5. **TTL** - сообщения автоматически удаляются через 7 дней

## Миграция с legacy relay

1. Обновить клиент на новую версию
2. Клиент автоматически регистрируется на blind relay
3. Legacy relay продолжает работать для старых клиентов
4. Постепенно отключить legacy relay
