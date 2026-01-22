<?php
/**
 * NODUS Backend API
 * Host: bibliotekaznanyi.online
 * 
 * Endpoints:
 * - /api/feed - Feed posts
 * - /api/push - Push notifications
 * - /api/discovery - User discovery
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database connection
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'u3361393_nodus';
$dbUser = getenv('DB_USER') ?: 'u3361393_nodus';
$dbPass = getenv('DB_PASS') ?: '';

try {
    $db = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_connection_failed']);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Rate limiting
function rateLimit($key, $limit = 100) {
    $file = sys_get_temp_dir() . '/rate_' . md5($key);
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['count' => 0, 'reset' => time() + 60];
    if (time() > $data['reset']) $data = ['count' => 0, 'reset' => time() + 60];
    $data['count']++;
    file_put_contents($file, json_encode($data));
    return $data['count'] <= $limit;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// ============ ROUTES ============

// Health check
if ($path === '/api/health') {
    echo json_encode(['ok' => true, 'service' => 'backend']);
    exit;
}

// ============ FEED ============

if ($path === '/api/feed' && $method === 'GET') {
    if (!rateLimit($ip . ':feed', 60)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $user_id = $_GET['user_id'] ?? null;
    $offset = (int)($_GET['offset'] ?? 0);
    $limit = min((int)($_GET['limit'] ?? 20), 50);
    
    $sql = "SELECT post_id, author_id, content_hash, timestamp, signature 
            FROM posts ORDER BY timestamp DESC LIMIT :limit OFFSET :offset";
    
    if ($user_id) {
        $sql = "SELECT post_id, author_id, content_hash, timestamp, signature 
                FROM posts WHERE author_id = :user_id 
                ORDER BY timestamp DESC LIMIT :limit OFFSET :offset";
    }
    
    $stmt = $db->prepare($sql);
    if ($user_id) $stmt->bindValue(':user_id', $user_id);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    echo json_encode(['ok' => true, 'posts' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($path === '/api/feed' && $method === 'POST') {
    if (!rateLimit($ip . ':post', 10)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $author_id = $input['author_id'] ?? null;
    $content_hash = $input['content_hash'] ?? null;
    $signature = $input['signature'] ?? null;
    
    if (!$author_id || !$content_hash || !$signature) {
        http_response_code(400);
        echo json_encode(['error' => 'missing_fields']);
        exit;
    }
    
    // TODO: Verify signature with author's public key
    
    $post_id = bin2hex(random_bytes(16));
    $stmt = $db->prepare("INSERT INTO posts (post_id, author_id, content_hash, signature, timestamp) 
                          VALUES (:post_id, :author_id, :content_hash, :signature, :timestamp)");
    $stmt->execute([
        ':post_id' => $post_id,
        ':author_id' => $author_id,
        ':content_hash' => $content_hash,
        ':signature' => $signature,
        ':timestamp' => time()
    ]);
    
    echo json_encode(['ok' => true, 'post_id' => $post_id]);
    exit;
}

// ============ PUSH NOTIFICATIONS ============

if ($path === '/api/push/register' && $method === 'POST') {
    if (!rateLimit($ip . ':push_reg', 20)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $user_id = $input['user_id'] ?? null;
    $push_token = $input['push_token'] ?? null;
    $platform = $input['platform'] ?? 'android';
    
    if (!$user_id || !$push_token) {
        http_response_code(400);
        echo json_encode(['error' => 'missing_fields']);
        exit;
    }
    
    $stmt = $db->prepare("INSERT INTO push_tokens (user_id, push_token, platform, updated_at) 
                          VALUES (:user_id, :push_token, :platform, :updated_at)
                          ON DUPLICATE KEY UPDATE push_token = :push_token2, platform = :platform2, updated_at = :updated_at2");
    $stmt->execute([
        ':user_id' => $user_id,
        ':push_token' => $push_token,
        ':platform' => $platform,
        ':updated_at' => time(),
        ':push_token2' => $push_token,
        ':platform2' => $platform,
        ':updated_at2' => time()
    ]);
    
    echo json_encode(['ok' => true]);
    exit;
}

if ($path === '/api/push' && $method === 'POST') {
    if (!rateLimit($ip . ':push', 100)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $to_user_id = $input['to_user_id'] ?? null;
    $payload = $input['payload'] ?? null; // Encrypted blob
    
    if (!$to_user_id || !$payload) {
        http_response_code(400);
        echo json_encode(['error' => 'missing_fields']);
        exit;
    }
    
    // Get push token
    $stmt = $db->prepare("SELECT push_token, platform FROM push_tokens WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $to_user_id]);
    $token = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => 'no_token']);
        exit;
    }
    
    // Send via FCM (Firebase Cloud Messaging)
    $fcm_key = getenv('FCM_SERVER_KEY');
    if ($fcm_key && $token['platform'] === 'android') {
        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: key=' . $fcm_key,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'to' => $token['push_token'],
                'data' => ['encrypted_payload' => $payload],
                'priority' => 'high'
            ])
        ]);
        $result = curl_exec($ch);
        curl_close($ch);
    }
    
    echo json_encode(['ok' => true]);
    exit;
}

// ============ DISCOVERY ============

if ($path === '/api/discovery/search' && $method === 'POST') {
    if (!rateLimit($ip . ':search', 30)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $query = $input['query'] ?? '';
    $limit = min((int)($input['limit'] ?? 20), 50);
    
    if (strlen($query) < 3) {
        http_response_code(400);
        echo json_encode(['error' => 'query_too_short']);
        exit;
    }
    
    $stmt = $db->prepare("SELECT user_id, username, public_key_hash 
                          FROM users 
                          WHERE username LIKE :query AND is_discoverable = 1
                          LIMIT :limit");
    $stmt->bindValue(':query', '%' . $query . '%');
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    echo json_encode(['ok' => true, 'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($path === '/api/discovery/register' && $method === 'POST') {
    if (!rateLimit($ip . ':disc_reg', 10)) {
        http_response_code(429);
        echo json_encode(['error' => 'rate_limit']);
        exit;
    }
    
    $user_id = $input['user_id'] ?? null;
    $username = $input['username'] ?? null;
    $public_key_hash = $input['public_key_hash'] ?? null;
    $is_discoverable = $input['is_discoverable'] ?? true;
    
    if (!$user_id || !$username || !$public_key_hash) {
        http_response_code(400);
        echo json_encode(['error' => 'missing_fields']);
        exit;
    }
    
    // Validate username
    if (!preg_match('/^[a-zA-Z0-9_]{3,32}$/', $username)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_username']);
        exit;
    }
    
    $stmt = $db->prepare("INSERT INTO users (user_id, username, public_key_hash, is_discoverable, created_at) 
                          VALUES (:user_id, :username, :public_key_hash, :is_discoverable, :created_at)
                          ON DUPLICATE KEY UPDATE username = :username2, public_key_hash = :public_key_hash2, is_discoverable = :is_discoverable2");
    $stmt->execute([
        ':user_id' => $user_id,
        ':username' => $username,
        ':public_key_hash' => $public_key_hash,
        ':is_discoverable' => $is_discoverable ? 1 : 0,
        ':created_at' => time(),
        ':username2' => $username,
        ':public_key_hash2' => $public_key_hash,
        ':is_discoverable2' => $is_discoverable ? 1 : 0
    ]);
    
    echo json_encode(['ok' => true]);
    exit;
}

// 404
http_response_code(404);
echo json_encode(['error' => 'not_found']);
