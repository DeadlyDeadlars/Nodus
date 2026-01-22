# NODUS v1.0.0 - Production Release

## Изменения для Production

### 1. Персистентность данных (MMKV)
- Все данные теперь сохраняются локально с шифрованием
- Чаты, профиль, настройки сохраняются между сессиями
- Файл: `src/services/storage.ts`

### 2. Улучшенная криптография (ECDH)
- X25519 ECDH для обмена ключами вместо детерминистичного ключа
- Каждый пользователь имеет keypair (publicKey/secretKey)
- Fingerprint выводится из publicKey
- Файл: `src/services/crypto.ts`

### 3. Офлайн-очередь сообщений
- Сообщения сохраняются при отсутствии сети
- Автоматическая повторная отправка с экспоненциальной задержкой
- До 5 попыток отправки
- Файл: `src/services/messageQueue.ts`

### 4. Индикатор сети
- Баннер при потере соединения
- Информирование о сохранении сообщений в очередь
- Файл: `src/components/NetworkStatus.tsx`

### 5. Production Relay Server (SQLite)
- SQLite вместо JSON файлов
- Rate limiting (60 req/min)
- Автоочистка старых данных
- Индексы для быстрого поиска
- Файл: `relay-server/relay-v2.php`

### 6. Конфигурация
- Централизованная конфигурация
- Файл: `src/config.ts`

## Структура криптографии

```
User A                          User B
┌─────────────────┐            ┌─────────────────┐
│ publicKey (A)   │◄──────────►│ publicKey (B)   │
│ secretKey (A)   │            │ secretKey (B)   │
└─────────────────┘            └─────────────────┘
        │                              │
        └──────────┬───────────────────┘
                   │
           ECDH Shared Secret
                   │
        ┌──────────┴──────────┐
        │  NaCl SecretBox     │
        │  (XSalsa20-Poly1305)│
        └─────────────────────┘
```

## Новые зависимости

```json
{
  "react-native-mmkv": "^2.12.2",
  "@react-native-community/netinfo": "^11.4.1"
}
```

## Команды сборки

```bash
# Development
npm start
npm run android

# Production
npm run build:android          # APK
npm run build:android:bundle   # AAB для Play Store

# Проверки
npm run typecheck
npm run lint
```

## Миграция данных

При первом запуске v1.0.0:
1. Генерируется новый keypair
2. Fingerprint выводится из publicKey
3. Старые данные (если есть) мигрируются автоматически

## Безопасность

- ✅ E2E шифрование (NaCl)
- ✅ ECDH key exchange (X25519)
- ✅ Padding сообщений (скрытие длины)
- ✅ Шифрование локального хранилища
- ✅ PIN-код с panic mode
- ✅ Rate limiting на сервере
