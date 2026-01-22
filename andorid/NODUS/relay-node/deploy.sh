#!/bin/bash

echo "🚀 Deploying NODUS Relay Server on Dedik..."

# Создаем директорию для relay
sudo mkdir -p /opt/nodus-relay
sudo chown root:root /opt/nodus-relay

# Копируем файлы
sudo cp -r ./relay-node/* /opt/nodus-relay/

# Переходим в директорию и устанавливаем зависимости
cd /opt/nodus-relay
sudo npm install

# Настраиваем firewall
sudo ufw allow 8082/tcp

# Создаем systemd сервис
sudo tee /etc/systemd/system/nodus-relay.service > /dev/null <<EOF
[Unit]
Description=NODUS Relay Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nodus-relay
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8082

[Install]
WantedBy=multi-user.target
EOF

# Запускаем сервис
sudo systemctl daemon-reload
sudo systemctl enable nodus-relay
sudo systemctl start nodus-relay

# Проверяем статус
sudo systemctl status nodus-relay

echo "✅ Relay server deployed!"
echo "📊 Check status: sudo systemctl status nodus-relay"
echo "📝 Check logs: sudo journalctl -u nodus-relay -f"
echo "🌐 HTTP API: http://194.87.103.193:8082/relay"
