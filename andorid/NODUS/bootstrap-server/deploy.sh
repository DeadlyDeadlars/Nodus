#!/bin/bash

# Скрипт для деплоя bootstrap ноды на дедик

echo "🚀 Deploying NODUS Bootstrap Node..."

# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Устанавливаем PM2 для управления процессами
sudo npm install -g pm2

# Создаем пользователя для приложения
sudo useradd -m -s /bin/bash nodus || echo "User already exists"

# Создаем директорию для приложения
sudo mkdir -p /opt/nodus-bootstrap
sudo chown nodus:nodus /opt/nodus-bootstrap

# Копируем файлы (предполагается что они уже загружены)
sudo cp -r ./bootstrap-server/* /opt/nodus-bootstrap/
sudo chown -R nodus:nodus /opt/nodus-bootstrap

# Переходим в директорию и устанавливаем зависимости
cd /opt/nodus-bootstrap
sudo -u nodus npm install

# Настраиваем firewall
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw --force enable

# Создаем systemd сервис
sudo tee /etc/systemd/system/nodus-bootstrap.service > /dev/null <<EOF
[Unit]
Description=NODUS Bootstrap Node
After=network.target

[Service]
Type=simple
User=nodus
WorkingDirectory=/opt/nodus-bootstrap
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

# Запускаем сервис
sudo systemctl daemon-reload
sudo systemctl enable nodus-bootstrap
sudo systemctl start nodus-bootstrap

# Проверяем статус
sudo systemctl status nodus-bootstrap

echo "✅ Bootstrap node deployed!"
echo "📊 Check status: sudo systemctl status nodus-bootstrap"
echo "📝 Check logs: sudo journalctl -u nodus-bootstrap -f"
echo "🌐 HTTP API: http://YOUR_SERVER_IP:8080"
echo "🔌 WebSocket: ws://YOUR_SERVER_IP:8081"
