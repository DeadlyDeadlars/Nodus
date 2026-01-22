# NODUS MVP Deployment Guide

## Infrastructure

| Service | Host | Port | Protocol |
|---------|------|------|----------|
| Relay | 194.87.103.193 | 3000 | HTTPS |
| Bootstrap + Signaling | 194.87.103.193 | 3001 | WSS |
| Backend API | bibliotekaznanyi.online | 443 | HTTPS |

## VPS Setup (194.87.103.193)

### 1. Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PM2
sudo npm install -g pm2
```

### 2. Setup TLS (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (need domain pointing to VPS)
# Or use self-signed for testing:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/nodus.key \
  -out /etc/ssl/nodus.crt \
  -subj "/CN=194.87.103.193"
```

### 3. Deploy Services

```bash
# Create directory
sudo mkdir -p /opt/nodus
cd /opt/nodus

# Copy files from server/vps/
# Then install and start:
npm install
pm2 start relay.js --name nodus-relay
pm2 start bootstrap.js --name nodus-bootstrap
pm2 save
pm2 startup
```

### 4. Firewall

```bash
sudo ufw allow 3000/tcp  # Relay
sudo ufw allow 3001/tcp  # Bootstrap + Signaling
```

## Backend Setup (bibliotekaznanyi.online)

### 1. Database

```bash
# Create PostgreSQL database
sudo -u postgres createdb nodus
sudo -u postgres psql nodus < server/backend/schema.sql
```

### 2. PHP Setup

```bash
# Copy api.php to web root
cp server/backend/api.php /var/www/html/api/index.php

# Set environment variables in .htaccess or php.ini:
# DB_HOST=localhost
# DB_NAME=nodus
# DB_USER=nodus
# DB_PASS=<password>
# FCM_SERVER_KEY=<firebase_key>
```

### 3. Nginx Config

```nginx
location /api {
    try_files $uri /api/index.php$is_args$args;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

## Client Configuration

Update `src/core/index.ts`:

```typescript
export const config = {
  relay: {
    url: 'https://194.87.103.193:3000',
  },
  bootstrap: {
    url: 'https://194.87.103.193:3001',
    wsUrl: 'wss://194.87.103.193:3001',
  },
  backend: {
    url: 'https://bibliotekaznanyi.online/api',
  },
};
```

## Testing

### Test Relay

```bash
# Health check
curl https://194.87.103.193:3000/health

# Send message
curl -X POST https://194.87.103.193:3000/relay/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test123","payload":"encrypted_data","nonce":"random"}'
```

### Test Bootstrap

```bash
# Health check
curl https://194.87.103.193:3001/health

# Register peer
curl -X POST https://194.87.103.193:3001/bootstrap/register \
  -H "Content-Type: application/json" \
  -d '{"peer_id":"peer123","capabilities":{"relay":false}}'
```

### Test Backend

```bash
# Health check
curl https://bibliotekaznanyi.online/api/health

# Search users
curl -X POST https://bibliotekaznanyi.online/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

## Security Checklist

- [ ] TLS enabled on all endpoints
- [ ] Redis password set
- [ ] PostgreSQL password set
- [ ] Firewall configured
- [ ] Rate limiting active
- [ ] No plaintext logs
- [ ] TTL cleanup running
