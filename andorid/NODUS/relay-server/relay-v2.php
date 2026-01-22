<?php
// NODUS Relay Server v2 - Production Ready
// Uses SQLite for persistence, rate limiting, and improved security

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Rate limiting
$rateLimitFile = sys_get_temp_dir() . '/nodus_ratelimit.json';
$maxRequestsPerMinute = 60;

function checkRateLimit($ip) {
    global $rateLimitFile, $maxRequestsPerMinute;
    $limits = file_exists($rateLimitFile) ? json_decode(file_get_contents($rateLimitFile), true) : [];
    $now = time();
    
    // Clean old entries
    foreach ($limits as $k => $v) {
        if ($now - $v['time'] > 60) unset($limits[$k]);
    }
    
    if (!isset($limits[$ip])) {
        $limits[$ip] = ['count' => 1, 'time' => $now];
    } else {
        if ($now - $limits[$ip]['time'] > 60) {
            $limits[$ip] = ['count' => 1, 'time' => $now];
        } else {
            $limits[$ip]['count']++;
        }
    }
    
    file_put_contents($rateLimitFile, json_encode($limits));
    return $limits[$ip]['count'] <= $maxRequestsPerMinute;
}

$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!checkRateLimit($clientIp)) {
    http_response_code(429);
    echo json_encode(['error' => 'rate_limit_exceeded']);
    exit;
}

// SQLite database
$dbFile = __DIR__ . '/nodus.db';
$db = new SQLite3($dbFile);
$db->busyTimeout(5000);

// Create tables
$db->exec('CREATE TABLE IF NOT EXISTS profiles (
    fingerprint TEXT PRIMARY KEY,
    username TEXT,
    alias TEXT,
    avatar TEXT,
    bio TEXT,
    public_key TEXT,
    encrypted_profile TEXT,
    updated_at INTEGER
)');

$db->exec('CREATE TABLE IF NOT EXISTS chats_backup (
    fingerprint TEXT PRIMARY KEY,
    token TEXT,
    updated_at INTEGER
)');

$db->exec('CREATE TABLE IF NOT EXISTS groups_table (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    description TEXT,
    avatar TEXT,
    is_public INTEGER DEFAULT 0,
    creator_id TEXT,
    created_at INTEGER
)');

$db->exec('CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT,
    peer_id TEXT,
    role TEXT DEFAULT "member",
    joined_at INTEGER,
    PRIMARY KEY (group_id, peer_id)
)');

$db->exec('CREATE TABLE IF NOT EXISTS group_messages (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    from_peer TEXT,
    content TEXT,
    type TEXT DEFAULT "text",
    timestamp INTEGER
)');

$db->exec('CREATE TABLE IF NOT EXISTS presence (
    peer_id TEXT PRIMARY KEY,
    last_seen INTEGER,
    typing INTEGER DEFAULT 0,
    recording INTEGER DEFAULT 0,
    chat_id TEXT
)');

$db->exec('CREATE TABLE IF NOT EXISTS call_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_peer TEXT,
    from_peer TEXT,
    call_id TEXT,
    event TEXT,
    kind TEXT,
    payload TEXT,
    created_at INTEGER
)');

$db->exec('CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, timestamp)');
$db->exec('CREATE INDEX IF NOT EXISTS idx_call_events_to ON call_events(to_peer, created_at)');
$db->exec('CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username)');

// Cleanup old data
$db->exec('DELETE FROM call_events WHERE created_at < ' . (time() - 120));
$db->exec('DELETE FROM presence WHERE last_seen < ' . (time() - 60));
$db->exec('DELETE FROM group_messages WHERE timestamp < ' . ((time() - 86400 * 7) * 1000)); // 7 days

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'saveProfile':
            $fp = $input['fingerprint'] ?? '';
            if (!$fp || strlen($fp) < 16) {
                echo json_encode(['error' => 'invalid fingerprint']);
                break;
            }
            $stmt = $db->prepare('INSERT OR REPLACE INTO profiles (fingerprint, username, alias, avatar, bio, public_key, encrypted_profile, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->bindValue(1, $fp);
            $stmt->bindValue(2, $input['username'] ?? '');
            $stmt->bindValue(3, $input['alias'] ?? '');
            $stmt->bindValue(4, $input['avatar'] ?? '');
            $stmt->bindValue(5, $input['bio'] ?? '');
            $stmt->bindValue(6, $input['publicKey'] ?? '');
            $stmt->bindValue(7, $input['encryptedProfile'] ?? '');
            $stmt->bindValue(8, time());
            $stmt->execute();
            echo json_encode(['ok' => true]);
            break;
            
        case 'getProfile':
            $fp = $input['fingerprint'] ?? '';
            $stmt = $db->prepare('SELECT * FROM profiles WHERE fingerprint = ?');
            $stmt->bindValue(1, $fp);
            $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            if ($result) {
                echo json_encode([
                    'ok' => true,
                    'encryptedProfile' => $result['encrypted_profile'],
                    'publicKey' => $result['public_key'],
                    'profile' => [
                        'username' => $result['username'],
                        'alias' => $result['alias'],
                        'avatar' => $result['avatar'],
                        'bio' => $result['bio'],
                    ]
                ]);
            } else {
                echo json_encode(['ok' => false]);
            }
            break;
            
        case 'searchByUsername':
            $username = strtolower($input['username'] ?? '');
            if (!$username) {
                echo json_encode(['error' => 'username required']);
                break;
            }
            $stmt = $db->prepare('SELECT fingerprint, username, alias, avatar, bio, public_key, encrypted_profile FROM profiles WHERE LOWER(username) LIKE ? LIMIT 20');
            $stmt->bindValue(1, '%' . $username . '%');
            $results = [];
            $res = $stmt->execute();
            while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
                $results[] = [
                    'peerId' => $row['fingerprint'],
                    'username' => $row['username'],
                    'alias' => $row['alias'],
                    'avatar' => $row['avatar'],
                    'bio' => $row['bio'],
                    'publicKey' => $row['public_key'],
                    'encryptedProfile' => $row['encrypted_profile'],
                ];
            }
            echo json_encode(['ok' => true, 'results' => $results]);
            break;
            
        case 'saveChats':
            $fp = $input['fingerprint'] ?? '';
            $token = $input['chatsToken'] ?? '';
            if (!$fp || !$token) {
                echo json_encode(['error' => 'fingerprint and chatsToken required']);
                break;
            }
            $stmt = $db->prepare('INSERT OR REPLACE INTO chats_backup (fingerprint, token, updated_at) VALUES (?, ?, ?)');
            $stmt->bindValue(1, $fp);
            $stmt->bindValue(2, $token);
            $stmt->bindValue(3, time());
            $stmt->execute();
            echo json_encode(['ok' => true]);
            break;
            
        case 'getChats':
            $fp = $input['fingerprint'] ?? '';
            $stmt = $db->prepare('SELECT token FROM chats_backup WHERE fingerprint = ?');
            $stmt->bindValue(1, $fp);
            $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            if ($result) {
                echo json_encode(['ok' => true, 'chatsToken' => $result['token']]);
            } else {
                echo json_encode(['ok' => false]);
            }
            break;
            
        case 'groupCreate':
            $groupId = $input['groupId'] ?? '';
            $name = $input['name'] ?? '';
            $creatorId = $input['creatorId'] ?? '';
            if (!$groupId || !$name) {
                echo json_encode(['error' => 'groupId and name required']);
                break;
            }
            $stmt = $db->prepare('INSERT INTO groups_table (id, name, username, description, avatar, is_public, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->bindValue(1, $groupId);
            $stmt->bindValue(2, $name);
            $stmt->bindValue(3, $input['username'] ?? '');
            $stmt->bindValue(4, $input['description'] ?? '');
            $stmt->bindValue(5, $input['avatar'] ?? '');
            $stmt->bindValue(6, $input['isPublic'] ? 1 : 0);
            $stmt->bindValue(7, $creatorId);
            $stmt->bindValue(8, time());
            $stmt->execute();
            
            if ($creatorId) {
                $stmt2 = $db->prepare('INSERT INTO group_members (group_id, peer_id, role, joined_at) VALUES (?, ?, ?, ?)');
                $stmt2->bindValue(1, $groupId);
                $stmt2->bindValue(2, $creatorId);
                $stmt2->bindValue(3, 'owner');
                $stmt2->bindValue(4, time());
                $stmt2->execute();
            }
            echo json_encode(['ok' => true, 'groupId' => $groupId]);
            break;
            
        case 'groupJoin':
            $groupId = $input['groupId'] ?? '';
            $peerId = $input['peerId'] ?? '';
            if (!$groupId || !$peerId) {
                echo json_encode(['error' => 'groupId and peerId required']);
                break;
            }
            $stmt = $db->prepare('INSERT OR IGNORE INTO group_members (group_id, peer_id, role, joined_at) VALUES (?, ?, ?, ?)');
            $stmt->bindValue(1, $groupId);
            $stmt->bindValue(2, $peerId);
            $stmt->bindValue(3, 'member');
            $stmt->bindValue(4, time());
            $stmt->execute();
            echo json_encode(['ok' => true]);
            break;
            
        case 'groupSend':
            $groupId = $input['groupId'] ?? '';
            $from = $input['from'] ?? '';
            if (!$groupId || !$from) {
                echo json_encode(['error' => 'groupId and from required']);
                break;
            }
            // Check membership
            $check = $db->prepare('SELECT 1 FROM group_members WHERE group_id = ? AND peer_id = ?');
            $check->bindValue(1, $groupId);
            $check->bindValue(2, $from);
            if (!$check->execute()->fetchArray()) {
                echo json_encode(['error' => 'not a member']);
                break;
            }
            $msgId = $input['id'] ?? uniqid('gmsg_', true);
            $timestamp = $input['timestamp'] ?? (int)(microtime(true) * 1000);
            $stmt = $db->prepare('INSERT INTO group_messages (id, group_id, from_peer, content, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->bindValue(1, $msgId);
            $stmt->bindValue(2, $groupId);
            $stmt->bindValue(3, $from);
            $stmt->bindValue(4, $input['content'] ?? '');
            $stmt->bindValue(5, $input['type'] ?? 'text');
            $stmt->bindValue(6, $timestamp);
            $stmt->execute();
            echo json_encode(['ok' => true, 'id' => $msgId]);
            break;
            
        case 'groupPoll':
            $groupId = $input['groupId'] ?? '';
            $peerId = $input['peerId'] ?? '';
            $since = (int)($input['since'] ?? 0);
            if (!$groupId || !$peerId) {
                echo json_encode(['error' => 'groupId and peerId required']);
                break;
            }
            $stmt = $db->prepare('SELECT id, from_peer as "from", content, type, timestamp FROM group_messages WHERE group_id = ? AND timestamp > ? ORDER BY timestamp ASC LIMIT 50');
            $stmt->bindValue(1, $groupId);
            $stmt->bindValue(2, $since);
            $messages = [];
            $res = $stmt->execute();
            while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
                $messages[] = $row;
            }
            echo json_encode($messages);
            break;
            
        case 'presenceUpdate':
            $peerId = $input['peerId'] ?? '';
            if (!$peerId) {
                echo json_encode(['error' => 'peerId required']);
                break;
            }
            $stmt = $db->prepare('INSERT OR REPLACE INTO presence (peer_id, last_seen, typing, recording, chat_id) VALUES (?, ?, ?, ?, ?)');
            $stmt->bindValue(1, $peerId);
            $stmt->bindValue(2, time());
            $stmt->bindValue(3, $input['typing'] ? 1 : 0);
            $stmt->bindValue(4, $input['recording'] ? 1 : 0);
            $stmt->bindValue(5, $input['chatId'] ?? '');
            $stmt->execute();
            echo json_encode(['ok' => true]);
            break;
            
        case 'presenceGet':
            $peerIds = $input['peerIds'] ?? [];
            if (!is_array($peerIds)) $peerIds = [$peerIds];
            $result = [];
            $now = time();
            foreach ($peerIds as $pid) {
                $stmt = $db->prepare('SELECT * FROM presence WHERE peer_id = ?');
                $stmt->bindValue(1, $pid);
                $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
                if ($row) {
                    $isOnline = ($now - $row['last_seen']) < 30;
                    $result[$pid] = [
                        'online' => $isOnline,
                        'lastSeen' => (int)$row['last_seen'],
                        'typing' => (bool)$row['typing'],
                        'recording' => (bool)$row['recording'],
                        'chatId' => $row['chat_id'],
                    ];
                } else {
                    $result[$pid] = ['online' => false, 'lastSeen' => 0];
                }
            }
            echo json_encode(['ok' => true, 'presence' => $result]);
            break;
            
        case 'heartbeat':
            $peerId = $input['peerId'] ?? '';
            if ($peerId) {
                $stmt = $db->prepare('INSERT OR REPLACE INTO presence (peer_id, last_seen, typing, recording, chat_id) VALUES (?, ?, COALESCE((SELECT typing FROM presence WHERE peer_id = ?), 0), COALESCE((SELECT recording FROM presence WHERE peer_id = ?), 0), COALESCE((SELECT chat_id FROM presence WHERE peer_id = ?), ""))');
                $stmt->bindValue(1, $peerId);
                $stmt->bindValue(2, time());
                $stmt->bindValue(3, $peerId);
                $stmt->bindValue(4, $peerId);
                $stmt->bindValue(5, $peerId);
                $stmt->execute();
            }
            echo json_encode(['ok' => true]);
            break;
            
        case 'callSend':
            $to = $input['to'] ?? '';
            $from = $input['from'] ?? '';
            $callId = $input['callId'] ?? '';
            $event = $input['event'] ?? '';
            if (!$to || !$from || !$callId || !$event) {
                echo json_encode(['error' => 'to, from, callId, event required']);
                break;
            }
            $stmt = $db->prepare('INSERT INTO call_events (to_peer, from_peer, call_id, event, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt->bindValue(1, $to);
            $stmt->bindValue(2, $from);
            $stmt->bindValue(3, $callId);
            $stmt->bindValue(4, $event);
            $stmt->bindValue(5, $input['kind'] ?? 'voice');
            $stmt->bindValue(6, is_string($input['payload']) ? $input['payload'] : json_encode($input['payload']));
            $stmt->bindValue(7, time());
            $stmt->execute();
            echo json_encode(['ok' => true]);
            break;
            
        case 'callPoll':
            $peerId = $input['peerId'] ?? '';
            if (!$peerId) {
                echo json_encode(['error' => 'peerId required']);
                break;
            }
            $stmt = $db->prepare('SELECT from_peer as "from", call_id as callId, event, kind, payload FROM call_events WHERE to_peer = ? ORDER BY created_at ASC');
            $stmt->bindValue(1, $peerId);
            $events = [];
            $res = $stmt->execute();
            while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
                $row['payload'] = json_decode($row['payload']) ?? $row['payload'];
                $events[] = $row;
            }
            // Delete fetched events
            $del = $db->prepare('DELETE FROM call_events WHERE to_peer = ?');
            $del->bindValue(1, $peerId);
            $del->execute();
            echo json_encode($events);
            break;
            
        case 'callHangup':
            $to = $input['to'] ?? '';
            $from = $input['from'] ?? '';
            $callId = $input['callId'] ?? '';
            if ($to && $from && $callId) {
                $stmt = $db->prepare('INSERT INTO call_events (to_peer, from_peer, call_id, event, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
                $stmt->bindValue(1, $to);
                $stmt->bindValue(2, $from);
                $stmt->bindValue(3, $callId);
                $stmt->bindValue(4, 'hangup');
                $stmt->bindValue(5, $input['kind'] ?? 'voice');
                $stmt->bindValue(6, '');
                $stmt->bindValue(7, time());
                $stmt->execute();
            }
            echo json_encode(['ok' => true]);
            break;
            
        default:
            echo json_encode(['error' => 'unknown action']);
    }
} elseif ($method === 'GET') {
    if ($action === 'health') {
        echo json_encode(['status' => 'ok', 'version' => '2.0']);
    } else {
        echo json_encode(['status' => 'ok']);
    }
}

$db->close();
