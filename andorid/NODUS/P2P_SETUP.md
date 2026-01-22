# NODUS P2P Setup Instructions

## 1. Деплой Bootstrap ноды на дедик

```bash
# Загрузи папку bootstrap-server на свой дедик
scp -r bootstrap-server/ user@your-server-ip:/home/user/

# Подключись к серверу
ssh user@your-server-ip

# Запусти деплой
cd bootstrap-server
chmod +x deploy.sh
sudo ./deploy.sh
```

## 2. Обнови конфиг в приложении

В файле `src/config.ts` замени:
```typescript
BOOTSTRAP_NODES: [
  'ws://YOUR_DEDIK_IP:8081', // Замени на реальный IP
],
```

## 3. Проверь что все работает

### На сервере:
```bash
# Статус сервиса
sudo systemctl status nodus-bootstrap

# Логи
sudo journalctl -u nodus-bootstrap -f

# Проверь порты
curl http://localhost:8080/health
```

### В приложении:
- Запусти приложение
- В консоли должно появиться: "Node role detected: client/bootstrap/relay"
- Проверь подключение к bootstrap ноде

## 4. Архитектура

- **Bootstrap нода** (твой дедик) - помогает пирам найти друг друга
- **Relay нода** (`bibliotekaznanyi.online`) - пересылает сообщения
- **P2P соединения** - прямая связь между пользователями
- **Автоматические роли** - мощные устройства становятся нодами

## 5. Порты

- **8080** - HTTP API bootstrap ноды
- **8081** - WebSocket bootstrap ноды

Убедись что эти порты открыты в firewall!
