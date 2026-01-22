# Деплой Blind Relay на сервер

## 1. Подготовка сервера

```bash
# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка nginx для reverse proxy + TLS
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. Настройка TLS (ОБЯЗАТЕЛЬНО!)

```bash
# Получение сертификата Let's Encrypt
sudo certbot --nginx -d relay.nodus.app

# Автообновление
sudo certbot renew --dry-run
```

## 3. Конфигурация nginx

```nginx
# /etc/nginx/sites-available/nodus-relay
server {
    listen 443 ssl http2;
    server_name relay.nodus.app;

    ssl_certificate /etc/letsencrypt/live/relay.nodus.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.nodus.app/privkey.pem;
    
    # Безопасные настройки TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Не логируем IP (приватность)
    access_log off;
    
    location /api {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For "";  # Не передаём IP
        proxy_cache_bypass $http_upgrade;
        
        # Лимиты
        client_max_body_size 10M;
    }
}

server {
    listen 80;
    server_name relay.nodus.app;
    return 301 https://$server_name$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nodus-relay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Деплой приложения

```bash
# Клонируем/копируем relay-server
cd /opt
git clone <repo> nodus-relay
cd nodus-relay/relay-server

# Устанавливаем зависимости
npm install --production

# Запускаем через PM2
pm2 start server.js --name nodus-relay
pm2 save
pm2 startup
```

## 5. Мониторинг

```bash
# Логи
pm2 logs nodus-relay

# Статус
pm2 status

# Health check
curl https://relay.nodus.app/health
```

## 6. Firewall

```bash
# Только HTTPS снаружи
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp  # для редиректа на HTTPS
sudo ufw enable
```

## 7. Проверка безопасности

```bash
# Проверка TLS
curl -I https://relay.nodus.app/health

# Должно вернуть:
# HTTP/2 200
# strict-transport-security: max-age=63072000
```

## Важно!

1. **НИКОГДА не используйте HTTP в продакшене** - только HTTPS
2. **Отключите логирование IP** в nginx
3. **Регулярно обновляйте** сертификаты и зависимости
4. **Мониторьте** использование памяти (in-memory storage)

## Для продакшена с высокой нагрузкой

Замените in-memory storage на Redis:

```javascript
// server.js
const Redis = require('ioredis');
const redis = new Redis();

// Вместо Map используйте redis.set/get
```
