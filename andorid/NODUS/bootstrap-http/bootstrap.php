<?php
// NODUS Bootstrap Node - HTTP API версия
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Файлы для хранения данных
$peersFile = __DIR__ . '/bootstrap_peers.json';
$signalsFile = __DIR__ . '/bootstrap_signals.json';

function loadPeers() {
    global $peersFile;
    if (file_exists($peersFile)) {
        $data = json_decode(file_get_contents($peersFile), true);
        return $data ?: [];
    }
    return [];
}

function savePeers($peers) {
    global $peersFile;
    file_put_contents($peersFile, json_encode($peers));
}

function loadSignals() {
    global $signalsFile;
    if (file_exists($signalsFile)) {
        $data = json_decode(file_get_contents($signalsFile), true);
        return $data ?: [];
    }
    return [];
}

function saveSignals($signals) {
    global $signalsFile;
    file_put_contents($signalsFile, json_encode($signals));
}

function cleanupOldPeers($peers) {
    $now = time();
    foreach ($peers as $peerId => $peer) {
        if ($now - $peer['lastSeen'] > 300) { // 5 минут
            unset($peers[$peerId]);
        }
    }
    return $peers;
}

function cleanupOldSignals($signals) {
    $now = time();
    foreach ($signals as $key => $signal) {
        if ($now - $signal['timestamp'] > 60) { // 1 минута
            unset($signals[$key]);
        }
    }
    return array_values($signals);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

$peers = cleanupOldPeers(loadPeers());
$signals = cleanupOldSignals(loadSignals());

switch ($action) {
    case 'register':
        // Регистрация пира
        $peerId = $input['peerId'] ?? '';
        $info = $input['info'] ?? [];
        
        if ($peerId) {
            $peers[$peerId] = [
                'info' => $info,
                'lastSeen' => time(),
                'ip' => $_SERVER['REMOTE_ADDR']
            ];
            
            savePeers($peers);
            echo json_encode([
                'success' => true,
                'peerId' => $peerId,
                'bootstrapId' => 'bootstrap_http_' . time()
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'peerId required']);
        }
        break;

    case 'heartbeat':
        // Обновление активности пира
        $peerId = $input['peerId'] ?? '';
        
        if ($peerId && isset($peers[$peerId])) {
            $peers[$peerId]['lastSeen'] = time();
            savePeers($peers);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'peer not found']);
        }
        break;

    case 'getPeers':
        // Получить список активных пиров
        $activePeers = [];
        foreach ($peers as $peerId => $peer) {
            $activePeers[] = [
                'peerId' => $peerId,
                'role' => $peer['info']['role'] ?? 'client',
                'lastSeen' => $peer['lastSeen']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'peers' => $activePeers,
            'total' => count($activePeers)
        ]);
        break;

    case 'findPeer':
        // Поиск конкретного пира
        $peerId = $input['peerId'] ?? '';
        
        if (isset($peers[$peerId])) {
            echo json_encode([
                'success' => true,
                'found' => true,
                'peer' => [
                    'peerId' => $peerId,
                    'lastSeen' => $peers[$peerId]['lastSeen'],
                    'info' => $peers[$peerId]['info']
                ]
            ]);
        } else {
            echo json_encode(['success' => true, 'found' => false]);
        }
        break;

    case 'sendSignal':
        // Отправка WebRTC сигнала
        $fromPeerId = $input['fromPeerId'] ?? '';
        $toPeerId = $input['toPeerId'] ?? '';
        $signal = $input['signal'] ?? '';
        
        if (!$fromPeerId || !$toPeerId || !$signal) {
            echo json_encode(['success' => false, 'error' => 'missing parameters']);
            break;
        }
        
        // Сохраняем сигнал для получателя
        $signals[] = [
            'fromPeerId' => $fromPeerId,
            'toPeerId' => $toPeerId,
            'signal' => $signal,
            'timestamp' => time(),
            'id' => uniqid()
        ];
        
        saveSignals($signals);
        echo json_encode(['success' => true, 'signalId' => end($signals)['id']]);
        break;

    case 'getSignals':
        // Получение сигналов для пира
        $peerId = $input['peerId'] ?? '';
        
        if (!$peerId) {
            echo json_encode(['success' => false, 'error' => 'peerId required']);
            break;
        }
        
        $peerSignals = [];
        foreach ($signals as $key => $signal) {
            if ($signal['toPeerId'] === $peerId) {
                $peerSignals[] = $signal;
                unset($signals[$key]); // Удаляем после получения
            }
        }
        
        if (!empty($peerSignals)) {
            saveSignals($signals);
        }
        
        echo json_encode([
            'success' => true,
            'signals' => array_values($peerSignals),
            'count' => count($peerSignals)
        ]);
        break;

    case 'status':
        // Статус bootstrap ноды
        echo json_encode([
            'success' => true,
            'status' => 'running',
            'type' => 'http_bootstrap',
            'activePeers' => count($peers),
            'pendingSignals' => count($signals),
            'uptime' => time(),
            'version' => '1.1-http-sync'
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'unknown action']);
        break;
}

// Сохраняем очищенные данные
savePeers($peers);
saveSignals($signals);
?>
