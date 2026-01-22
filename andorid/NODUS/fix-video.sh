#!/bin/bash

echo "🧹 Очистка проекта..."

# Очистка React Native
echo "Очистка Metro cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null

# Очистка node_modules
echo "Очистка node_modules..."
rm -rf node_modules
npm install

# Очистка Android
echo "Очистка Android build..."
cd android
./gradlew clean
cd ..

# Очистка кэшей
echo "Очистка кэшей..."
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
watchman watch-del-all 2>/dev/null || true

echo "✅ Очистка завершена!"
echo "🚀 Запуск проекта..."

# Запуск Metro
npx react-native start --reset-cache &

echo "📱 Теперь запустите: npm run android"
