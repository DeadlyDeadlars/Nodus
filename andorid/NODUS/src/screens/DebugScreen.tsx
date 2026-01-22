import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Share } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';

// Placeholder
const p2p = { getConnectedPeers: () => [], getStats: () => ({ relayedMessages: 0, relayedBytes: 0, peerRequests: 0 }), connectToPeer: async (id: string) => {}, sendTestMessage: async (id: string) => {} };

export const DebugScreen = () => {
  const { colors, spacing, radius } = useTheme();
  const { profile } = useStore();
  const myPeerId = '';
  const myAddresses: string[] = [];
  const nodeStatus = {};
  const myId = profile?.fingerprint || myPeerId;
  const [logs, setLogs] = useState<string[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [nodeRole, setNodeRole] = useState('user');
  const [stats, setStats] = useState({ relayedMessages: 0, relayedBytes: 0, peerRequests: 0 });
  const [testPeerId, setTestPeerId] = useState('');

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  };

  useEffect(() => {
    const refresh = async () => {
      try {
        const peers = await p2p.getConnectedPeers();
        setConnectedPeers(peers);
        const role = await p2p.getNodeRole();
        setNodeRole(role);
        const s = await p2p.getNodeStats();
        setStats(s);
      } catch (e) {}
    };

    refresh();
    const interval = setInterval(refresh, 3000);

    const unsub1 = p2p.onNodeStarted(({ peerId, addresses }) => {
      addLog(`✅ Нода запущена: ${peerId.slice(0, 12)}...`);
      addLog(`📍 Адреса: ${addresses.length}`);
    });

    const unsub2 = p2p.onPeerConnected(({ peerId }) => {
      addLog(`🔗 Подключен: ${peerId.slice(0, 12)}...`);
    });

    const unsub3 = p2p.onPeerDisconnected(({ peerId }) => {
      addLog(`❌ Отключен: ${peerId.slice(0, 12)}...`);
    });

    const unsub4 = p2p.onMessageReceived((msg) => {
      addLog(`📩 Получено от ${msg.from.slice(0, 8)}: ${msg.content.slice(0, 20)}...`);
    });

    const unsub5 = p2p.onMessageSent(({ messageId, success }) => {
      addLog(`📤 Отправлено: ${success ? '✅' : '❌'} ${messageId.slice(0, 12)}`);
    });

    const unsub6 = p2p.onError(({ error }) => {
      addLog(`⚠️ Ошибка: ${error}`);
    });

    return () => {
      clearInterval(interval);
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
    };
  }, []);

  const testConnection = async () => {
    if (!testPeerId.trim()) return;
    addLog(`🔄 Подключаюсь к ${testPeerId.slice(0, 20)}...`);
    try {
      const success = await p2p.connectToPeer(testPeerId.trim());
      addLog(success ? `✅ Подключено!` : `❌ Не удалось`);
    } catch (e: any) {
      addLog(`❌ Ошибка: ${e.message}`);
    }
  };

  const shareInfo = async () => {
    const addr = myAddresses.length > 0 ? myAddresses[0] : 'нет адреса';
    const info = `NODUS - скопируй ID для подключения:

${myId}

Role: ${nodeRole}`;
    await Share.share({ message: info });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.md }}>🔧 Отладка</Text>
      
      {/* Status */}
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textSecondary }}>Статус</Text>
          <Text style={{ color: nodeStatus === 'running' ? colors.online : colors.error, fontWeight: '600' }}>
            {nodeStatus === 'running' ? '🟢 Онлайн' : nodeStatus === 'starting' ? '🟡 Запуск...' : '🔴 Офлайн'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textSecondary }}>Роль</Text>
          <Text style={{ color: colors.accent }}>{nodeRole === 'relay' ? '🌉 Relay' : nodeRole === 'bootstrap' ? '🏠 Bootstrap' : '📱 User'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textSecondary }}>Подключено пиров</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{connectedPeers.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textSecondary }}>Мой ID</Text>
          <Text style={{ color: colors.accent, fontSize: 12 }} selectable>{myId?.slice(0, 16)}...</Text>
        </View>
      </View>

      {/* Connected Peers */}
      {connectedPeers.length > 0 && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Подключенные пиры:</Text>
          {connectedPeers.map((p, i) => (
            <Text key={i} style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace' }}>{p.slice(0, 20)}...</Text>
          ))}
        </View>
      )}

      {/* Test Connection */}
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Подключиться по адресу:</Text>
        <TextInput
          style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.sm, color: colors.text, fontSize: 11, marginBottom: spacing.sm }}
          value={testPeerId}
          onChangeText={setTestPeerId}
          placeholder="/ip4/192.168.1.x/tcp/port/p2p/QmPeerId..."
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity style={{ backgroundColor: colors.accent, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' }} onPress={testConnection}>
          <Text style={{ color: colors.background, fontWeight: '600' }}>Подключиться</Text>
        </TouchableOpacity>
      </View>

      {/* Share */}
      <TouchableOpacity style={{ backgroundColor: colors.surfaceLight, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.md }} onPress={shareInfo}>
        <Text style={{ color: colors.accent }}>📤 Поделиться инфо для отладки</Text>
      </TouchableOpacity>

      {/* Logs */}
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Логи:</Text>
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm }}>
        {logs.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Ожидание событий...</Text>
        ) : (
          logs.map((log, i) => (
            <Text key={i} style={{ color: colors.text, fontSize: 11, fontFamily: 'monospace', marginBottom: 2 }}>{log}</Text>
          ))
        )}
      </ScrollView>
    </View>
  );
};
