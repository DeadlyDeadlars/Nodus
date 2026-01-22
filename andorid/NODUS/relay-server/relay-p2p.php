<?php
// NODUS P2P Relay Server - только передача сообщений, без хранения данных
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Временное хранение активных пиров (в памяти, не на диске)
$activePeers = [];
$messageQueue = []; // Временная очередь для офлайн пиров
$userDataStore = []; // Временное хранение пользовательских данных

function logMessage($message) {
    error_log(date('Y-m-d H:i:s') . " - " . $message);
}

function cleanupOldPeers() {
    global $activePeers;
    $now = time();
    foreach ($activePeers as $peerId => $peer) {
        if ($now - $peer['lastSeen'] > 300) { // 5 минут
            unset($activePeers[$peerId]);
        }
    }
}

function cleanupOldData() {
    global $userDataStore;
    $now = time();
    foreach ($userDataStore as $key => $data) {
        if ($now > $data['expires']) {
            unset($userDataStore[$key]);
        }
    }
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

cleanupOldPeers();
cleanupOldData();

switch ($action) {
    case 'register':
        // Регистрация пира в сети
        $peerId = $input['peerId'] ?? '';
        $info = $input['info'] ?? [];
        
        if ($peerId) {
            $activePeers[$peerId] = [
                'info' => $info,
                'lastSeen' => time(),
                'ip' => $_SERVER['REMOTE_ADDR']
            ];
            
            logMessage("Peer registered: $peerId");
            echo json_encode(['success' => true, 'peerId' => $peerId]);
        } else {
            echo json_encode(['success' => false, 'error' => 'peerId required']);
        }
        break;

    case 'heartbeat':
        // Обновление времени последней активности
        $peerId = $input['peerId'] ?? '';
        
        if ($peerId && isset($activePeers[$peerId])) {
            $activePeers[$peerId]['lastSeen'] = time();
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'peer not found']);
        }
        break;

    case 'sendMessage':
        // Передача сообщения между пирами
        $fromPeerId = $input['fromPeerId'] ?? '';
        $toPeerId = $input['toPeerId'] ?? '';
        $message = $input['message'] ?? '';
        
        if (!$fromPeerId || !$toPeerId || !$message) {
            echo json_encode(['success' => false, 'error' => 'missing parameters']);
            break;
        }
        
        // Проверяем, онлайн ли получатель
        if (isset($activePeers[$toPeerId])) {
            // Получатель онлайн - сообщение доставлено (в реальности через WebRTC)
            logMessage("Message relayed from $fromPeerId to $toPeerId");
            echo json_encode(['success' => true, 'delivered' => true]);
        } else {
            // Получатель офлайн - добавляем в временную очередь
            $messageQueue[] = [
                'fromPeerId' => $fromPeerId,
                'toPeerId' => $toPeerId,
                'message' => $message,
                'timestamp' => time()
            ];
            
            logMessage("Message queued for offline peer: $toPeerId");
            echo json_encode(['success' => true, 'delivered' => false, 'queued' => true]);
        }
        break;

    case 'getMessages':
        // Получение сообщений для пира (только из временной очереди)
        $peerId = $input['peerId'] ?? '';
        
        if (!$peerId) {
            echo json_encode(['success' => false, 'error' => 'peerId required']);
            break;
        }
        
        $peerMessages = [];
        foreach ($messageQueue as $key => $msg) {
            if ($msg['toPeerId'] === $peerId) {
                $peerMessages[] = $msg;
                unset($messageQueue[$key]); // Удаляем после доставки
            }
        }
        
        echo json_encode([
            'success' => true,
            'messages' => $peerMessages,
            'count' => count($peerMessages)
        ]);
        break;

    case 'findPeer':
        // Поиск пира в сети
        $peerId = $input['peerId'] ?? '';
        
        if (isset($activePeers[$peerId])) {
            echo json_encode([
                'success' => true,
                'found' => true,
                'peer' => [
                    'peerId' => $peerId,
                    'lastSeen' => $activePeers[$peerId]['lastSeen'],
                    'info' => $activePeers[$peerId]['info']
                ]
            ]);
        } else {
            echo json_encode(['success' => true, 'found' => false]);
        }
        break;

    case 'getActivePeers':
        // Получить список активных пиров
        $peers = [];
        foreach ($activePeers as $peerId => $peer) {
            $peers[] = [
                'peerId' => $peerId,
                'lastSeen' => $peer['lastSeen'],
                'role' => $peer['info']['role'] ?? 'client'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'peers' => $peers,
            'total' => count($peers)
        ]);
        break;

    case 'relaySignal':
        // Передача WebRTC сигналов между пирами
        $fromPeerId = $input['fromPeerId'] ?? '';
        $toPeerId = $input['toPeerId'] ?? '';
        $signal = $input['signal'] ?? '';
        
        if (!$fromPeerId || !$toPeerId || !$signal) {
            echo json_encode(['success' => false, 'error' => 'missing parameters']);
            break;
        }
        
        if (isset($activePeers[$toPeerId])) {
            // В реальной реализации здесь был бы WebSocket для мгновенной доставки
            logMessage("WebRTC signal relayed from $fromPeerId to $toPeerId");
            echo json_encode(['success' => true, 'relayed' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'target peer offline']);
        }
        break;

    case 'storeUserData':
        // Временное хранение пользовательских данных
        $userKey = $input['userKey'] ?? '';
        $userData = $input['userData'] ?? '';
        $timestamp = $input['timestamp'] ?? time();
        
        if (!$userKey || !$userData) {
            echo json_encode(['success' => false, 'error' => 'missing parameters']);
            break;
        }
        
        // Проверяем не старше ли данные чем уже сохраненные
        if (isset($userDataStore[$userKey])) {
            $existingTimestamp = $userDataStore[$userKey]['timestamp'] ?? 0;
            if ($timestamp <= $existingTimestamp) {
                echo json_encode(['success' => true, 'stored' => false, 'reason' => 'older_data']);
                break;
            }
        }
        
        // Храним данные в памяти (можно расширить до файлов)
        $userDataStore[$userKey] = [
            'data' => $userData,
            'timestamp' => $timestamp,
            'expires' => time() + 86400, // 24 часа
            'lastModified' => time()
        ];
        
        logMessage("User data stored for key: " . substr($userKey, 0, 8) . "... (timestamp: $timestamp)");
        echo json_encode(['success' => true, 'stored' => true, 'timestamp' => $timestamp]);
        break;

    case 'getUserData':
        // Получение пользовательских данных
        $userKey = $input['userKey'] ?? '';
        $requesterId = $input['requesterId'] ?? '';
        
        if (!$userKey) {
            echo json_encode(['success' => false, 'error' => 'userKey required']);
            break;
        }
        
        if (isset($userDataStore[$userKey])) {
            $stored = $userDataStore[$userKey];
            
            // Проверяем не истек ли срок
            if (time() > $stored['expires']) {
                unset($userDataStore[$userKey]);
                echo json_encode(['success' => true, 'found' => false]);
            } else {
                logMessage("User data retrieved for key: " . substr($userKey, 0, 8) . "...");
                echo json_encode([
                    'success' => true,
                    'found' => true,
                    'userData' => $stored['data'],
                    'timestamp' => $stored['timestamp'],
                    'lastModified' => $stored['lastModified'] ?? $stored['timestamp']
                ]);
            }
        } else {
            echo json_encode(['success' => true, 'found' => false]);
        }
        break;

    case 'status':
        // Статус relay сервера
        echo json_encode([
            'success' => true,
            'status' => 'running',
            'type' => 'p2p_relay',
            'activePeers' => count($activePeers),
            'queuedMessages' => count($messageQueue),
            'storedUserData' => count($userDataStore),
            'uptime' => time(),
            'version' => '2.1-p2p-sync'
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'unknown action']);
        break;
}
?>
