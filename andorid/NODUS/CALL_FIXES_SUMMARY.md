# Сводка исправлений звонков

## Измененные файлы:

### 1. `/src/store/index.ts`
- ✅ Импортирован `Config` из `../config`
- ✅ Заменены захардкоженные `RELAY_URLS` и `ICE_SERVERS` на `Config.RELAY_URLS` и `Config.ICE_SERVERS`
- ✅ Удалены вызовы несуществующей функции `syncChatsToRelay()`
- ✅ Все интервалы polling теперь используют значения из Config
- ✅ Добавлено подробное логирование в:
  - `getSenderId()` - логирует отсутствие ID
  - `sendCallEvent()` - логирует отправку и ошибки
  - `startCallPolling()` - логирует каждый запрос и полученные события
  - `startCall()` - логирует все этапы создания звонка
  - `acceptCall()` - логирует все этапы принятия звонка

### 2. `/src/components/CallOverlay.tsx`
- ✅ Добавлено логирование изменений состояния звонка
- ✅ Компонент уже правильно подключен в App.tsx

### 3. `/CALL_FIXES.md`
- ✅ Создана подробная документация с инструкциями по тестированию и отладке

## Что нужно проверить на устройстве получателя:

Запустите приложение и проверьте логи React Native:

```bash
# Для Android
npx react-native log-android

# Или через adb
adb logcat | grep -E "✓|✗|→"
```

### Ожидаемые логи при запуске:
```
✓ Initializing P2P with fingerprint: FA7761C718EE962B16E47B2A6EB9A3C3
✓ Starting call polling with interval: 3000
```

### Ожидаемые логи каждые 3 секунды:
```
→ Polling for call events, peerId: FA7761C718EE962B16E47B2A6EB9A3C3
```

### Ожидаемые логи при входящем звонке:
```
✓ Received call events: 1 [...]
✓ Processing call event: offer from QmPnaX8US2... callId: c_...
✓ Incoming call offer, current call status: idle
✓ Setting incoming call state
✓ Showing call notification for: [имя контакта]
CallOverlay: call state changed: incoming visible: true
```

## Следующие шаги:

1. **Пересоберите приложение**:
   ```bash
   cd android && ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **Проверьте логи на обоих устройствах**

3. **Попробуйте совершить звонок**

4. **Если проблема остается** - отправьте логи с обоих устройств для дальнейшей диагностики

## Ключевые моменты:

- События звонков доходят до relay-сервера (видно в логах сервера)
- Теперь нужно убедиться, что `callPoll` запрашивает события с правильным `peerId`
- CallOverlay должен автоматически появиться при изменении `call.status` на `incoming`
- Все логи помогут точно определить, на каком этапе происходит сбой
