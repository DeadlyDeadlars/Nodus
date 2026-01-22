#!/bin/bash

# Деплой relay сервера с proxy API на VPS

echo "🚀 Деплой NODUS Relay Server с Proxy API..."

# Проверяем что файлы существуют
if [ ! -f "relay-server/server.js" ]; then
    echo "❌ Файл relay-server/server.js не найден"
    exit 1
fi

if [ ! -f "relay-server/package.json" ]; then
    echo "❌ Файл relay-server/package.json не найден"
    exit 1
fi

# Копируем файлы на сервер (замените на ваши данные)
SERVER_IP="194.87.103.193"
SERVER_USER="root"  # или ваш пользователь
SERVER_PATH="/opt/nodus-relay"

echo "📦 Копируем файлы на сервер $SERVER_IP..."

# Создаем директорию на сервере
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_PATH"

# Копируем файлы
scp relay-server/server.js $SERVER_USER@$SERVER_IP:$SERVER_PATH/
scp relay-server/package.json $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# Устанавливаем зависимости и перезапускаем сервис
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/nodus-relay

echo "📦 Устанавливаем зависимости..."
npm install

echo "🔄 Перезапускаем сервис..."
# Останавливаем старый процесс
pkill -f "node server.js" || true

# Запускаем новый процесс в фоне
nohup node server.js > relay.log 2>&1 &

echo "✅ Сервер запущен на порту 8082"
echo "🌐 Proxy API доступен по адресу: http://194.87.103.193:8082/api/proxy"

# Показываем статус
sleep 2
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Процесс запущен успешно"
else
    echo "❌ Ошибка запуска, проверьте логи:"
    tail -20 relay.log
fi
EOF

echo "🎉 Деплой завершен!"
echo ""
echo "📋 Проверьте работу:"
echo "curl http://194.87.103.193:8082/api/health"
echo ""
echo "🔧 Для просмотра логов:"
echo "ssh $SERVER_USER@$SERVER_IP 'tail -f /opt/nodus-relay/relay.log'"
