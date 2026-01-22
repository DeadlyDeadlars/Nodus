#!/bin/bash

# Быстрое обновление proxy API на сервере

echo "🔄 Обновляем proxy API на сервере..."

SERVER_IP="194.87.103.193"
SERVER_USER="root"
SERVER_PATH="/opt/nodus-relay"

# Копируем обновленный server.js
scp relay-server/server.js $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# Перезапускаем сервис
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/nodus-relay

echo "🔄 Перезапускаем сервер..."
pkill -f "node server.js" || true
sleep 2
nohup node server.js > relay.log 2>&1 &

echo "✅ Сервер обновлен и перезапущен"
sleep 2

if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Процесс запущен успешно"
    echo "📊 Последние логи:"
    tail -10 relay.log
else
    echo "❌ Ошибка запуска:"
    tail -20 relay.log
fi
EOF

echo "🎉 Обновление завершено!"
