# Деплой на bibliotekaznanyi.online

## 1. Загрузи bootstrap сервер:
```bash
# Загрузи папку bootstrap-server на bibliotekaznanyi.online
scp -r bootstrap-server/ user@bibliotekaznanyi.online:/path/to/web/

# Или через панель управления хостинга
```

## 2. Установи Node.js на сервере:
```bash
# Если есть SSH доступ
ssh user@bibliotekaznanyi.online
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 3. Запусти bootstrap ноду:
```bash
cd /path/to/bootstrap-server
npm install
node index.js
```

## 4. Настрой автозапуск:
```bash
# Создай systemd сервис или используй PM2
npm install -g pm2
pm2 start index.js --name bootstrap
pm2 startup
pm2 save
```

## 5. Открой порты:
- **8080** - HTTP API
- **8081** - WebSocket

## Преимущества:
- ✅ Один домен для всего
- ✅ Меньше расходов
- ✅ Проще управление
- ✅ Дедик как резерв

**Теперь `bibliotekaznanyi.online` - и relay, и bootstrap нода!**
