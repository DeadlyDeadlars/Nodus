<?php
// NODUS Relay Server with E2E support
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = __DIR__ . '/nodus_data.json';
$profilesFile = __DIR__ . '/nodus_profiles.json';
$chatsFile = __DIR__ . '/nodus_chats.json';
$groupsFile = __DIR__ . '/nodus_groups.json';
$callsFile = __DIR__ . '/nodus_calls.json';
$presenceFile = __DIR__ . '/nodus_presence.json';

function loadData() {
    global $dataFile;
    if (file_exists($dataFile)) {
        return json_decode(file_get_contents($dataFile), true) ?: ['peers' => [], 'messages' => []];
    }
    return ['peers' => [], 'messages' => []];
}

function saveData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data));
}

function loadProfiles() {
    global $profilesFile;
    if (file_exists($profilesFile)) {
        return json_decode(file_get_contents($profilesFile), true) ?: [];
    }
    return [];
}

function saveProfiles($profiles) {
    global $profilesFile;
    file_put_contents($profilesFile, json_encode($profiles));
}

function loadChats() {
    global $chatsFile;
    if (file_exists($chatsFile)) {
        return json_decode(file_get_contents($chatsFile), true) ?: [];
    }
    return [];
}

function saveChats($chats) {
    global $chatsFile;
    file_put_contents($chatsFile, json_encode($chats));
}

function loadGroups() {
    global $groupsFile;
    if (file_exists($groupsFile)) {
        return json_decode(file_get_contents($groupsFile), true) ?: [];
    }
    return [];
}

function saveGroups($groups) {
    global $groupsFile;
    file_put_contents($groupsFile, json_encode($groups));
}

function loadCalls() {
    global $callsFile;
    if (file_exists($callsFile)) {
        return json_decode(file_get_contents($callsFile), true) ?: [];
    }
    return [];
}

function saveCalls($calls) {
    global $callsFile;
    file_put_contents($callsFile, json_encode($calls));
}

function loadPresence() {
    global $presenceFile;
    if (file_exists($presenceFile)) {
        return json_decode(file_get_contents($presenceFile), true) ?: [];
    }
    return [];
}

function savePresence($presence) {
    global $presenceFile;
    file_put_contents($presenceFile, json_encode($presence));
}

function cleanOldPresence(&$presence) {
    $now = time();
    foreach ($presence as $peerId => $data) {
        // Online status expires after 30 seconds
        if (($now - (int)($data['lastSeen'] ?? 0)) > 30) {
            unset($presence[$peerId]);
        }
    }
}

function cleanOldCalls(&$calls) {
    $now = time();
    // keep signaling events for 2 minutes
    foreach ($calls as $to => $events) {
        if (!is_array($events)) {
            unset($calls[$to]);
            continue;
        }
        $calls[$to] = array_values(array_filter($events, fn($e) => ($now - (int)($e['ts'] ?? 0)) < 120));
        if (count($calls[$to]) === 0) unset($calls[$to]);
    }
}

function cleanOldData(&$data) {
    $now = time();
    $data['peers'] = array_filter($data['peers'], fn($p) => ($now - $p['lastSeen']) < 60);
    $data['messages'] = array_filter($data['messages'], fn($m) => ($now - $m['timestamp']) < 300);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['action'] ?? '';

$data = loadData();
cleanOldData($data);
$calls = loadCalls();
cleanOldCalls($calls);
$presence = loadPresence();
cleanOldPresence($presence);

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($path === 'register') {
        $peerId = $input['peerId'] ?? '';
        if ($peerId) {
            $data['peers'][$peerId] = [
                'peerId' => $peerId,
                'username' => $input['username'] ?? '',
                'publicKey' => $input['publicKey'] ?? '',
                'lastSeen' => time()
            ];
            saveData($data);
            echo json_encode(['ok' => true, 'count' => count($data['peers'])]);
        } else {
            echo json_encode(['error' => 'peerId required']);
        }
    }
    elseif ($path === 'send') {
        $to = $input['to'] ?? '';
        if ($to && isset($data['peers'][$to])) {
            $msg = [
                'id' => $input['id'] ?? uniqid(),
                'from' => $input['from'] ?? '',
                'to' => $to,
                'content' => $input['content'] ?? '',
                'type' => $input['type'] ?? 'text',
                'timestamp' => time()
            ];
            $data['messages'][] = $msg;
            saveData($data);
            echo json_encode(['ok' => true, 'id' => $msg['id']]);
        } else {
            echo json_encode(['error' => 'recipient not found']);
        }
    }
    elseif ($path === 'poll') {
        $peerId = $input['peerId'] ?? '';
        $messages = array_values(array_filter($data['messages'], fn($m) => $m['to'] === $peerId));
        $data['messages'] = array_filter($data['messages'], fn($m) => $m['to'] !== $peerId);
        saveData($data);
        echo json_encode($messages);
    }
    elseif ($path === 'getPublicKey') {
        $peerId = $input['peerId'] ?? '';
        if (isset($data['peers'][$peerId])) {
            echo json_encode(['ok' => true, 'publicKey' => $data['peers'][$peerId]['publicKey'] ?? '']);
        } else {
            echo json_encode(['ok' => false]);
        }
    }
    elseif ($path === 'saveProfile') {
        $fingerprint = $input['fingerprint'] ?? '';
        if ($fingerprint) {
            $profiles = loadProfiles();
            $profiles[$fingerprint] = [
                'username' => $input['username'] ?? '',
                'encryptedProfile' => $input['encryptedProfile'] ?? null,
                // Legacy fields (for backward compatibility)
                'alias' => $input['alias'] ?? '',
                'avatar' => $input['avatar'] ?? '',
                'bio' => $input['bio'] ?? '',
                'updatedAt' => time()
            ];
            saveProfiles($profiles);
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['error' => 'fingerprint required']);
        }
    }
    elseif ($path === 'getProfile') {
        $fingerprint = $input['fingerprint'] ?? '';
        $profiles = loadProfiles();
        if (isset($profiles[$fingerprint])) {
            $p = $profiles[$fingerprint];
            echo json_encode([
                'ok' => true, 
                'encryptedProfile' => $p['encryptedProfile'] ?? null,
                'profile' => [
                    'username' => $p['username'] ?? '',
                    'alias' => $p['alias'] ?? '',
                    'avatar' => $p['avatar'] ?? '',
                    'bio' => $p['bio'] ?? '',
                ]
            ]);
        } else {
            echo json_encode(['ok' => false]);
        }
    }
    elseif ($path === 'searchByUsername') {
        $username = strtolower($input['username'] ?? '');
        if (!$username) {
            echo json_encode(['error' => 'username required']);
        } else {
            $profiles = loadProfiles();
            $results = [];
            foreach ($profiles as $peerId => $profile) {
                $profileUsername = strtolower($profile['username'] ?? '');
                if ($profileUsername && strpos($profileUsername, $username) !== false) {
                    $results[] = [
                        'peerId' => $peerId,
                        'username' => $profile['username'] ?? '',
                        'encryptedProfile' => $profile['encryptedProfile'] ?? null,
                        // Legacy fallback
                        'alias' => $profile['alias'] ?? '',
                        'avatar' => $profile['avatar'] ?? '',
                        'bio' => $profile['bio'] ?? '',
                    ];
                }
            }
            echo json_encode(['ok' => true, 'results' => $results]);
        }
    }
    elseif ($path === 'saveChats') {
        $fingerprint = $input['fingerprint'] ?? '';
        $chatsToken = $input['chatsToken'] ?? '';
        if ($fingerprint && $chatsToken) {
            $chats = loadChats();
            $chats[$fingerprint] = [
                'token' => $chatsToken,
                'updatedAt' => time()
            ];
            saveChats($chats);
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['error' => 'fingerprint and chatsToken required']);
        }
    }
    elseif ($path === 'getChats') {
        $fingerprint = $input['fingerprint'] ?? '';
        if ($fingerprint) {
            $chats = loadChats();
            if (isset($chats[$fingerprint])) {
                echo json_encode(['ok' => true, 'chatsToken' => $chats[$fingerprint]['token']]);
            } else {
                echo json_encode(['ok' => false]);
            }
        } else {
            echo json_encode(['error' => 'fingerprint required']);
        }
    }
    elseif ($path === 'groupJoin') {
        $groupId = $input['groupId'] ?? '';
        $peerId = $input['peerId'] ?? '';
        $name = $input['name'] ?? '';

        if (!$groupId || !$peerId) {
            echo json_encode(['error' => 'groupId and peerId required']);
        } else {
            $groups = loadGroups();
            if (!isset($groups[$groupId])) {
                $groups[$groupId] = [
                    'id' => $groupId,
                    'name' => $name,
                    'members' => [],
                    'messages' => [],
                    'createdAt' => time(),
                ];
            }
            if ($name && empty($groups[$groupId]['name'])) {
                $groups[$groupId]['name'] = $name;
            }

            if (!isset($groups[$groupId]['members'][$peerId])) {
                $groups[$groupId]['members'][$peerId] = [
                    'joinedAt' => time(),
                ];
            }

            saveGroups($groups);
            echo json_encode(['ok' => true]);
        }
    }
    elseif ($path === 'groupCreate') {
        $groupId = $input['groupId'] ?? '';
        $name = $input['name'] ?? '';
        $username = $input['username'] ?? '';
        $description = $input['description'] ?? '';
        $avatar = $input['avatar'] ?? '';
        $isPublic = $input['isPublic'] ?? false;
        $creatorId = $input['creatorId'] ?? '';

        if (!$groupId || !$name) {
            echo json_encode(['error' => 'groupId and name required']);
        } else {
            $groups = loadGroups();
            $groups[$groupId] = [
                'id' => $groupId,
                'name' => $name,
                'username' => $username,
                'description' => $description,
                'avatar' => $avatar,
                'isPublic' => $isPublic,
                'creatorId' => $creatorId,
                'admins' => [$creatorId],
                'members' => [],
                'messages' => [],
                'createdAt' => time(),
            ];
            if ($creatorId) {
                $groups[$groupId]['members'][$creatorId] = ['joinedAt' => time(), 'role' => 'owner'];
            }
            saveGroups($groups);
            echo json_encode(['ok' => true, 'groupId' => $groupId]);
        }
    }
    elseif ($path === 'groupUpdate') {
        $groupId = $input['groupId'] ?? '';
        $peerId = $input['peerId'] ?? '';

        if (!$groupId) {
            echo json_encode(['error' => 'groupId required']);
        } else {
            $groups = loadGroups();
            if (!isset($groups[$groupId])) {
                echo json_encode(['error' => 'group not found']);
            } else {
                $g = $groups[$groupId];
                $isAdmin = in_array($peerId, $g['admins'] ?? []) || ($g['members'][$peerId]['role'] ?? '') === 'owner';
                if (!$isAdmin) {
                    echo json_encode(['error' => 'not admin']);
                } else {
                    if (isset($input['name'])) $groups[$groupId]['name'] = $input['name'];
                    if (isset($input['username'])) $groups[$groupId]['username'] = $input['username'];
                    if (isset($input['description'])) $groups[$groupId]['description'] = $input['description'];
                    if (isset($input['avatar'])) $groups[$groupId]['avatar'] = $input['avatar'];
                    if (isset($input['isPublic'])) $groups[$groupId]['isPublic'] = $input['isPublic'];
                    saveGroups($groups);
                    echo json_encode(['ok' => true]);
                }
            }
        }
    }
    elseif ($path === 'groupInfo') {
        $groupId = $input['groupId'] ?? '';
        if (!$groupId) {
            echo json_encode(['error' => 'groupId required']);
        } else {
            $groups = loadGroups();
            if (!isset($groups[$groupId])) {
                echo json_encode(['error' => 'group not found']);
            } else {
                $g = $groups[$groupId];
                echo json_encode([
                    'ok' => true,
                    'group' => [
                        'id' => $g['id'],
                        'name' => $g['name'] ?? '',
                        'username' => $g['username'] ?? '',
                        'description' => $g['description'] ?? '',
                        'avatar' => $g['avatar'] ?? '',
                        'isPublic' => $g['isPublic'] ?? false,
                        'memberCount' => count($g['members'] ?? []),
                        'createdAt' => $g['createdAt'] ?? 0,
                    ]
                ]);
            }
        }
    }
    elseif ($path === 'groupSearch') {
        $query = strtolower($input['query'] ?? '');
        if (!$query) {
            echo json_encode(['error' => 'query required']);
        } else {
            $groups = loadGroups();
            $results = [];
            foreach ($groups as $gid => $g) {
                if (!($g['isPublic'] ?? false)) continue;
                $name = strtolower($g['name'] ?? '');
                $username = strtolower($g['username'] ?? '');
                if (($username && strpos($username, $query) !== false) || strpos($name, $query) !== false) {
                    $results[] = [
                        'id' => $gid,
                        'name' => $g['name'] ?? '',
                        'username' => $g['username'] ?? '',
                        'description' => $g['description'] ?? '',
                        'avatar' => $g['avatar'] ?? '',
                        'memberCount' => count($g['members'] ?? []),
                    ];
                }
            }
            echo json_encode(['ok' => true, 'results' => $results]);
        }
    }
    elseif ($path === 'groupSend') {
        $groupId = $input['groupId'] ?? '';
        $from = $input['from'] ?? '';
        $content = $input['content'] ?? '';
        $type = $input['type'] ?? 'text';
        $timestamp = $input['timestamp'] ?? (int)(microtime(true) * 1000);

        if (!$groupId || !$from) {
            echo json_encode(['error' => 'groupId and from required']);
        } else {
            $groups = loadGroups();
            if (!isset($groups[$groupId])) {
                echo json_encode(['error' => 'group not found']);
            } else {
                if (!isset($groups[$groupId]['members'][$from])) {
                    echo json_encode(['error' => 'not a member']);
                } else {
                    $msg = [
                        'id' => $input['id'] ?? uniqid('gmsg_', true),
                        'groupId' => $groupId,
                        'from' => $from,
                        'content' => $content,
                        'type' => $type,
                        'timestamp' => (int)$timestamp,
                    ];
                    $groups[$groupId]['messages'][] = $msg;

                    // keep last 1000 messages
                    if (count($groups[$groupId]['messages']) > 1000) {
                        $groups[$groupId]['messages'] = array_slice($groups[$groupId]['messages'], -1000);
                    }

                    saveGroups($groups);
                    echo json_encode(['ok' => true, 'id' => $msg['id']]);
                }
            }
        }
    }
    elseif ($path === 'groupPoll') {
        $groupId = $input['groupId'] ?? '';
        $peerId = $input['peerId'] ?? '';
        $since = $input['since'] ?? 0;

        if (!$groupId || !$peerId) {
            echo json_encode(['error' => 'groupId and peerId required']);
        } else {
            $groups = loadGroups();
            if (!isset($groups[$groupId])) {
                echo json_encode(['error' => 'group not found']);
            } else {
                if (!isset($groups[$groupId]['members'][$peerId])) {
                    echo json_encode(['error' => 'not a member']);
                } else {
                    $sinceInt = (int)$since;
                    $messages = array_values(array_filter($groups[$groupId]['messages'], fn($m) => ((int)($m['timestamp'] ?? 0)) > $sinceInt));
                    // return last 50 new messages max
                    if (count($messages) > 50) {
                        $messages = array_slice($messages, -50);
                    }
                    echo json_encode($messages);
                }
            }
        }
    }
    elseif ($path === 'callSend') {
        $to = $input['to'] ?? '';
        $from = $input['from'] ?? '';
        $callId = $input['callId'] ?? '';
        $event = $input['event'] ?? '';
        $kind = $input['kind'] ?? 'voice';
        $payload = $input['payload'] ?? null;

        if (!$to || !$from || !$callId || !$event) {
            echo json_encode(['error' => 'to, from, callId, event required']);
        } else {
            if (!isset($calls[$to])) $calls[$to] = [];
            $calls[$to][] = [
                'id' => $input['id'] ?? uniqid('call_', true),
                'to' => $to,
                'from' => $from,
                'callId' => $callId,
                'event' => $event,
                'kind' => $kind,
                'payload' => $payload,
                'ts' => time(),
            ];

            // keep last 200 events per recipient
            if (count($calls[$to]) > 200) {
                $calls[$to] = array_slice($calls[$to], -200);
            }
            saveCalls($calls);
            echo json_encode(['ok' => true]);
        }
    }
    elseif ($path === 'callPoll') {
        $peerId = $input['peerId'] ?? '';
        if (!$peerId) {
            echo json_encode(['error' => 'peerId required']);
        } else {
            $events = $calls[$peerId] ?? [];
            unset($calls[$peerId]);
            saveCalls($calls);
            echo json_encode($events);
        }
    }
    elseif ($path === 'callHangup') {
        $to = $input['to'] ?? '';
        $from = $input['from'] ?? '';
        $callId = $input['callId'] ?? '';
        $kind = $input['kind'] ?? 'voice';

        if (!$to || !$from || !$callId) {
            echo json_encode(['error' => 'to, from, callId required']);
        } else {
            if (!isset($calls[$to])) $calls[$to] = [];
            $calls[$to][] = [
                'id' => $input['id'] ?? uniqid('call_', true),
                'to' => $to,
                'from' => $from,
                'callId' => $callId,
                'event' => 'hangup',
                'kind' => $kind,
                'payload' => null,
                'ts' => time(),
            ];
            saveCalls($calls);
            echo json_encode(['ok' => true]);
        }
    }
    elseif ($path === 'presenceUpdate') {
        $peerId = $input['peerId'] ?? '';
        $typing = $input['typing'] ?? null;
        $recording = $input['recording'] ?? null;
        $chatId = $input['chatId'] ?? null;

        if (!$peerId) {
            echo json_encode(['error' => 'peerId required']);
        } else {
            $presence[$peerId] = [
                'lastSeen' => time(),
                'typing' => $typing,
                'recording' => $recording,
                'chatId' => $chatId,
            ];
            savePresence($presence);
            echo json_encode(['ok' => true]);
        }
    }
    elseif ($path === 'presenceGet') {
        $peerIds = $input['peerIds'] ?? [];
        if (!is_array($peerIds)) $peerIds = [$peerIds];
        
        $result = [];
        $now = time();
        foreach ($peerIds as $pid) {
            if (isset($presence[$pid])) {
                $p = $presence[$pid];
                $isOnline = ($now - (int)($p['lastSeen'] ?? 0)) < 30;
                $result[$pid] = [
                    'online' => $isOnline,
                    'lastSeen' => $p['lastSeen'] ?? 0,
                    'typing' => $p['typing'] ?? null,
                    'recording' => $p['recording'] ?? null,
                    'chatId' => $p['chatId'] ?? null,
                ];
            } else {
                $result[$pid] = ['online' => false, 'lastSeen' => 0];
            }
        }
        echo json_encode(['ok' => true, 'presence' => $result]);
    }
    elseif ($path === 'heartbeat') {
        $peerId = $input['peerId'] ?? '';
        if (!$peerId) {
            echo json_encode(['error' => 'peerId required']);
        } else {
            if (!isset($presence[$peerId])) {
                $presence[$peerId] = [];
            }
            $presence[$peerId]['lastSeen'] = time();
            savePresence($presence);
            echo json_encode(['ok' => true]);
        }
    }
    else {
        echo json_encode(['error' => 'unknown action']);
    }
}
elseif ($method === 'GET') {
    if ($path === 'peers') {
        $list = [];
        foreach ($data['peers'] as $p) {
            $list[] = ['peerId' => $p['peerId'], 'username' => $p['username'], 'publicKey' => $p['publicKey'] ?? ''];
        }
        echo json_encode($list);
    }
    elseif ($path === 'search') {
        $q = strtolower($_GET['q'] ?? '');
        $results = [];
        foreach ($data['peers'] as $p) {
            if (stripos($p['username'] ?? '', $q) !== false) {
                $results[] = ['peerId' => $p['peerId'], 'username' => $p['username'], 'publicKey' => $p['publicKey'] ?? ''];
            }
        }
        echo json_encode($results);
    }
    else {
        echo json_encode(['status' => 'ok', 'peers' => count($data['peers'])]);
    }
}
