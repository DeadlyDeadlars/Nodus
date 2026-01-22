# Исправления звонков (Voice & Video Calls)

## Проблемы, которые были исправлены:

### 1. **Неправильные URL relay-серверов**
- **Проблема**: В `store/index.ts` были захардкожены старые URL (`bibliotekaznanyi.online/relay.php`)
- **Решение**: Заменены на использование `Config.RELAY_URLS` из `config.ts`

### 2. **Вызов несуществующей функции**
- **Проблема**: Вызывалась функция `syncChatsToRelay()`, которая не была определена
- **Решение**: Удалены все вызовы этой функции из `rejectCall`, `endCall` и обработчика событий

### 3. **Захардкоженные интервалы polling**
- **Проблема**: Интервалы для polling были захардкожены (3000, 5000, 30000 мс)
- **Решение**: Заменены на использование значений из `Config`:
  - `Config.CALL_POLL_INTERVAL_MS` (3000 мс)
  - `Config.GROUP_POLL_INTERVAL_MS` (5000 мс)
  - `Config.PRESENCE_POLL_INTERVAL_MS` (3000 мс)
  - `Config.HEARTBEAT_INTERVAL_MS` (30000 мс)

### 4. **Отсутствие логирования для отладки**
- **Проблема**: Было сложно понять, где именно происходит сбой
- **Решение**: Добавлено подробное логирование во все ключевые функции:
  - `startCallPolling()` - логирует начало polling, каждый запрос и полученные события
  - `sendCallEvent()` - логирует отправку событий и ошибки
  - `startCall()` - логирует каждый шаг создания звонка
  - `acceptCall()` - логирует каждый шаг принятия звонка
  - `getSenderId()` - логирует проблемы с получением ID
  - `CallOverlay` - логирует изменения состояния звонка

## Что проверить:

### 1. Relay-сервер работает
```bash
curl -X POST http://194.87.103.193:8082/relay \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

### 2. Проверьте логи на устройстве получателя
После того как звонящий нажал кнопку звонка, на устройстве получателя должны появиться логи:
```
→ Polling for call events, peerId: FA7761C718EE962B16E47B2A6EB9A3C3
✓ Received call events: 1 [...]
✓ Processing call event: offer from QmPnaX8US2... callId: c_...
✓ Incoming call offer, current call status: idle
✓ Setting incoming call state
✓ Showing call notification for: [имя]
CallOverlay: call state changed: incoming visible: true
```

### 3. Проверьте, что myPeerId установлен
В логах при запуске приложения должно быть:
```
✓ Initializing P2P with fingerprint: FA7761C718EE962B16E47B2A6EB9A3C3
✓ Starting call polling with interval: 3000
```

## Как тестировать:

1. **Запустите приложение на двух устройствах**
2. **На устройстве получателя проверьте логи**:
   - Должен быть лог `✓ Starting call polling`
   - Каждые 3 секунды должен быть лог `→ Polling for call events, peerId: ...`
3. **На устройстве звонящего нажмите кнопку звонка**
4. **Проверьте логи звонящего**:
   - `✓ Starting voice call to...`
   - `✓ Offer sent to peer`
5. **Проверьте логи получателя** (в течение 3 секунд):
   - `✓ Received call events: 1`
   - `✓ Incoming call offer`
   - `CallOverlay: call state changed: incoming`
6. **На экране получателя должен появиться CallOverlay** с кнопками "Принять" и "Отклонить"

## Возможные проблемы и решения:

### Проблема: Нет логов `→ Polling for call events`
**Причина**: Call polling не запустился
**Решение**: 
- Проверьте, что `isOnboarded === true` и `profile !== null`
- Перезапустите приложение

### Проблема: Логи есть, но `peerId: null` или `peerId: undefined`
**Причина**: `myPeerId` не установлен
**Решение**:
- Проверьте, что профиль создан (пройдите onboarding)
- В коде должен быть лог `✓ Initializing P2P with fingerprint: ...`

### Проблема: События приходят на relay, но не получаются устройством
**Причина**: Несоответствие peerId
**Решение**:
- Сравните peerId в логах relay (`to: FA7761C718EE962B16E47B2A6EB9A3C3`)
- С peerId в логах polling (`peerId: FA7761C718EE962B16E47B2A6EB9A3C3`)
- Они должны совпадать!

### Проблема: CallOverlay не появляется
**Причина**: Состояние `call.status` не меняется на `incoming`
**Решение**:
- Проверьте лог `CallOverlay: call state changed: incoming visible: true`
- Если лога нет, значит состояние не обновилось
- Проверьте, что в логах есть `✓ Setting incoming call state`

### Проблема: Нет звука/видео после соединения
**Причина**: Проблемы с WebRTC или разрешениями
**Решение**:
- Проверьте разрешения RECORD_AUDIO и CAMERA
- Проверьте логи ICE candidates: `✓ ICE candidate generated`
- Проверьте connection state: `✓ Connection state: connected`

## Дополнительная отладка:

Если проблема не решается, добавьте временный лог в начало `startCallPolling`:
```typescript
console.log('DEBUG: callPollInterval exists?', !!callPollInterval);
console.log('DEBUG: Config.CALL_POLL_INTERVAL_MS:', Config.CALL_POLL_INTERVAL_MS);
console.log('DEBUG: getSenderId():', getSenderId());
```

