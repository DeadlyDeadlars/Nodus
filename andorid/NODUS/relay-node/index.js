const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// HTTP сервер для WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket подключения: peerId -> ws
const wsConnections = new Map();

// Временное хранение в памяти
let activePeers = {};
let messageQueue = [];
let userDataStore = {};
let callEvents = {}; // peerId -> [events]
let profiles = {}; // fingerprint -> profile data
let userChats = {}; // fingerprint -> encrypted chats data
let signalingQueue = {}; // peerId -> [signals]
let groups = {}; // groupId -> group data
let groupMessages = {}; // groupId -> [messages]
let channels = {}; // channelId -> channel data
let channelPosts = {}; // channelId -> [posts]

// WebSocket обработка
wss.on('connection', (ws, req) => {
    let peerId = null;
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            if (msg.action === 'subscribe' && msg.peerId) {
                peerId = msg.peerId;
                wsConnections.set(peerId, ws);
                logMessage(`[WS] Peer ${peerId.slice(0,8)} connected`);
                
                // Отправляем накопленные сообщения
                const pending = messageQueue.filter(m => m.toPeerId === peerId);
                messageQueue = messageQueue.filter(m => m.toPeerId !== peerId);
                
                pending.forEach(m => {
                    ws.send(JSON.stringify({
                        type: 'message',
                        fromPeerId: m.fromPeerId,
                        message: m.message,
                        timestamp: m.timestamp
                    }));
                });
            }
        } catch (e) {
            console.error('[WS] Parse error:', e);
        }
    });
    
    ws.on('close', () => {
        if (peerId) {
            wsConnections.delete(peerId);
            logMessage(`[WS] Peer ${peerId.slice(0,8)} disconnected`);
        }
    });
    
    ws.on('error', (err) => {
        console.error('[WS] Error:', err);
    });
    
    // Ping для поддержания соединения
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
});

// Ping всех клиентов каждые 30 сек
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Функция отправки через WebSocket
function sendToWebSocket(peerId, data) {
    const ws = wsConnections.get(peerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
    }
    return false;
}

function logMessage(message) {
    console.log(new Date().toISOString() + " - " + message);
}

function cleanupOldPeers() {
    const now = Date.now();
    Object.keys(activePeers).forEach(peerId => {
        if (now - activePeers[peerId].lastSeen > 300000) { // 5 минут
            delete activePeers[peerId];
        }
    });
}

function cleanupOldData() {
    const now = Date.now();
    Object.keys(userDataStore).forEach(key => {
        if (now > userDataStore[key].expires) {
            delete userDataStore[key];
        }
    });
    // Cleanup old call events (older than 2 minutes)
    Object.keys(callEvents).forEach(peerId => {
        callEvents[peerId] = callEvents[peerId].filter(e => (now - e.ts) < 120000);
        if (callEvents[peerId].length === 0) delete callEvents[peerId];
    });
}

// Очистка каждую минуту
setInterval(() => {
    cleanupOldPeers();
    cleanupOldData();
}, 60000);

app.post('/relay', (req, res) => {
    const { action } = req.body;
    
    switch (action) {
        case 'register':
            const { peerId, info } = req.body;
            logMessage(`[REGISTER] Peer: ${peerId}, Info: ${JSON.stringify(info)}`);
            
            if (peerId) {
                activePeers[peerId] = {
                    info: info || {},
                    lastSeen: Date.now(),
                    ip: req.ip
                };
                logMessage(`[REGISTER] Peer ${peerId} registered successfully. Total active peers: ${Object.keys(activePeers).length}`);
                logMessage(`[REGISTER] Active peers list: ${Object.keys(activePeers).join(', ')}`);
                res.json({ success: true, peerId });
            } else {
                logMessage(`[REGISTER ERROR] No peerId provided`);
                res.json({ success: false, error: 'peerId required' });
            }
            break;

        case 'heartbeat':
            const heartbeatPeerId = req.body.peerId;
            if (heartbeatPeerId && activePeers[heartbeatPeerId]) {
                activePeers[heartbeatPeerId].lastSeen = Date.now();
                res.json({ success: true });
            } else {
                res.json({ success: false, error: 'peer not found' });
            }
            break;

        case 'sendMessage':
            const { fromPeerId, toPeerId, message } = req.body;
            logMessage(`[SEND] From: ${fromPeerId} To: ${toPeerId} Message: ${JSON.stringify(message).substring(0, 100)}`);
            
            if (!fromPeerId || !toPeerId || !message) {
                logMessage(`[SEND ERROR] Missing parameters: fromPeerId=${!!fromPeerId}, toPeerId=${!!toPeerId}, message=${!!message}`);
                res.json({ success: false, error: 'missing parameters' });
                break;
            }
            
            // Пробуем отправить через WebSocket
            const sentViaWs = sendToWebSocket(toPeerId, {
                type: 'message',
                fromPeerId,
                message,
                timestamp: Date.now()
            });
            
            if (!sentViaWs) {
                // Если нет WS - добавляем в очередь
                messageQueue.push({
                    fromPeerId,
                    toPeerId,
                    message,
                    timestamp: Date.now()
                });
            }
            
            const isOnline = !!activePeers[toPeerId] || wsConnections.has(toPeerId);
            logMessage(`[SEND] Message ${sentViaWs ? 'sent via WS' : 'queued'} for ${toPeerId} (online: ${isOnline})`);
            res.json({ success: true, delivered: sentViaWs, queued: !sentViaWs });
            break;

        case 'getMessages':
            const getMessagesPeerId = req.body.peerId;
            logMessage(`[GET] Peer ${getMessagesPeerId} requesting messages`);
            
            if (!getMessagesPeerId) {
                logMessage(`[GET ERROR] No peerId provided`);
                res.json({ success: false, error: 'peerId required' });
                break;
            }
            
            const peerMessages = messageQueue.filter(msg => msg.toPeerId === getMessagesPeerId);
            messageQueue = messageQueue.filter(msg => msg.toPeerId !== getMessagesPeerId);
            
            logMessage(`[GET] Found ${peerMessages.length} messages for ${getMessagesPeerId}, remaining queue: ${messageQueue.length}`);
            res.json({
                success: true,
                messages: peerMessages,
                count: peerMessages.length
            });
            break;

        case 'storeUserData':
            const { userKey, userData, timestamp } = req.body;
            if (!userKey || !userData) {
                res.json({ success: false, error: 'missing parameters' });
                break;
            }
            
            const ts = timestamp || Date.now();
            
            // Проверяем не старше ли данные
            if (userDataStore[userKey] && ts <= userDataStore[userKey].timestamp) {
                res.json({ success: true, stored: false, reason: 'older_data' });
                break;
            }
            
            userDataStore[userKey] = {
                data: userData,
                timestamp: ts,
                expires: Date.now() + 86400000, // 24 часа
                lastModified: Date.now()
            };
            
            logMessage(`User data stored for key: ${userKey.substring(0, 8)}... (timestamp: ${ts})`);
            res.json({ success: true, stored: true, timestamp: ts });
            break;

        case 'getUserData':
            const getUserKey = req.body.userKey;
            if (!getUserKey) {
                res.json({ success: false, error: 'userKey required' });
                break;
            }
            
            if (userDataStore[getUserKey]) {
                const stored = userDataStore[getUserKey];
                if (Date.now() > stored.expires) {
                    delete userDataStore[getUserKey];
                    res.json({ success: true, found: false });
                } else {
                    logMessage(`User data retrieved for key: ${getUserKey.substring(0, 8)}...`);
                    res.json({
                        success: true,
                        found: true,
                        userData: stored.data,
                        timestamp: stored.timestamp,
                        lastModified: stored.lastModified || stored.timestamp
                    });
                }
            } else {
                res.json({ success: true, found: false });
            }
            break;

        case 'getActivePeers':
            const peers = Object.keys(activePeers).map(peerId => ({
                peerId,
                lastSeen: activePeers[peerId].lastSeen,
                role: activePeers[peerId].info.role || 'client'
            }));
            
            res.json({
                success: true,
                peers,
                total: peers.length
            });
            break;

        case 'searchUser':
            const { username, fromPeerId: searchFromPeerId } = req.body;
            if (!username) {
                res.json({ success: false, error: 'username required' });
                break;
            }
            
            const searchResults = [];
            const foundIds = new Set();
            
            // Ищем среди онлайн пользователей
            Object.keys(activePeers).forEach(peerId => {
                const peer = activePeers[peerId];
                if (peer.info && peer.info.username && 
                    peer.info.username.toLowerCase().includes(username.toLowerCase())) {
                    foundIds.add(peerId);
                    searchResults.push({
                        peerId: peerId,
                        username: peer.info.username,
                        alias: peer.info.alias,
                        avatar: peer.info.avatar,
                        bio: peer.info.bio,
                        isOnline: true
                    });
                }
            });
            
            // Ищем среди сохранённых профилей (офлайн)
            Object.keys(profiles).forEach(peerId => {
                if (foundIds.has(peerId)) return; // уже добавлен как онлайн
                const p = profiles[peerId];
                if (p.username && p.username.toLowerCase().includes(username.toLowerCase())) {
                    searchResults.push({
                        peerId: peerId,
                        username: p.username,
                        alias: p.alias,
                        avatar: p.avatar,
                        bio: p.bio,
                        isOnline: false
                    });
                }
            });
            
            logMessage(`User search for "${username}" found ${searchResults.length} results`);
            res.json({
                success: true,
                users: searchResults
            });
            break;

        case 'presenceUpdate':
            const presencePeerId = req.body.peerId;
            if (presencePeerId && activePeers[presencePeerId]) {
                activePeers[presencePeerId].lastSeen = Date.now();
                activePeers[presencePeerId].typing = req.body.typing;
                activePeers[presencePeerId].recording = req.body.recording;
                activePeers[presencePeerId].chatId = req.body.chatId;
            }
            res.json({ ok: true });
            break;

        case 'saveProfile':
            const { fingerprint, username: profUsername, alias: profAlias, avatar: profAvatar, bio: profBio, encryptedProfile, publicKey: profPubKey } = req.body;
            if (fingerprint) {
                profiles[fingerprint] = {
                    fingerprint,
                    username: profUsername,
                    alias: profAlias,
                    avatar: profAvatar,
                    bio: profBio,
                    encryptedProfile,
                    publicKey: profPubKey,
                    updatedAt: Date.now()
                };
                logMessage(`[PROFILE] Saved for ${fingerprint.slice(0,12)}: ${profUsername || 'no username'}`);
            }
            res.json({ ok: true });
            break;

        case 'getProfile':
            const getFingerprint = req.body.fingerprint;
            if (getFingerprint && profiles[getFingerprint]) {
                const p = profiles[getFingerprint];
                res.json({ 
                    ok: true, 
                    fingerprint: p.fingerprint,
                    username: p.username,
                    alias: p.alias,
                    avatar: p.avatar,
                    bio: p.bio,
                    encryptedProfile: p.encryptedProfile,
                    publicKey: p.publicKey
                });
            } else {
                res.json({ ok: false, error: 'profile not found' });
            }
            break;

        case 'saveChats':
            const saveChatsFingerprint = req.body.fingerprint;
            const encryptedChats = req.body.data;
            if (saveChatsFingerprint && encryptedChats) {
                userChats[saveChatsFingerprint] = { data: encryptedChats, updatedAt: Date.now() };
                logMessage(`[CHATS] Saved for ${saveChatsFingerprint.slice(0,12)}`);
            }
            res.json({ ok: true });
            break;

        case 'getChats':
            const getChatsFingerprint = req.body.fingerprint;
            if (getChatsFingerprint && userChats[getChatsFingerprint]) {
                res.json({ ok: true, data: userChats[getChatsFingerprint].data });
            } else {
                res.json({ ok: false, error: 'chats not found' });
            }
            break;

        case 'sendSignaling':
            const sigFrom = req.body.fromPeerId;
            const sigTo = req.body.toPeerId;
            const signal = req.body.signal;
            if (sigTo && signal) {
                if (!signalingQueue[sigTo]) signalingQueue[sigTo] = [];
                signalingQueue[sigTo].push({ fromPeerId: sigFrom, signal, ts: Date.now() });
                // Keep only last 50 signals per peer
                if (signalingQueue[sigTo].length > 50) signalingQueue[sigTo] = signalingQueue[sigTo].slice(-50);
            }
            res.json({ success: true });
            break;

        case 'getSignaling':
            const sigPeerId = req.body.peerId;
            if (sigPeerId && signalingQueue[sigPeerId]) {
                const signals = signalingQueue[sigPeerId];
                delete signalingQueue[sigPeerId];
                res.json({ success: true, signals });
            } else {
                res.json({ success: true, signals: [] });
            }
            break;

        case 'presenceGet':
            const peerIds = req.body.peerIds || [];
            const now = Date.now();
            const presence = {};
            peerIds.forEach(pid => {
                const peer = activePeers[pid];
                if (peer) {
                    const isOnline = (now - peer.lastSeen) < 60000;
                    presence[pid] = {
                        online: isOnline,
                        lastSeen: Math.floor(peer.lastSeen / 1000),
                        typing: peer.typing || null,
                        recording: peer.recording || null,
                        chatId: peer.chatId || null
                    };
                } else {
                    presence[pid] = { online: false, lastSeen: 0 };
                }
            });
            res.json({ ok: true, presence });
            break;

        case 'callSend':
            const { to: callTo, from: callFrom, callId, event: callEvent, kind, payload } = req.body;
            if (!callTo || !callFrom || !callId || !callEvent) {
                res.json({ error: 'to, from, callId, event required' });
                break;
            }
            if (!callEvents[callTo]) callEvents[callTo] = [];
            callEvents[callTo].push({
                from: callFrom,
                callId,
                event: callEvent,
                kind: kind || 'voice',
                payload,
                ts: Date.now()
            });
            // Keep last 50 events per peer
            if (callEvents[callTo].length > 50) {
                callEvents[callTo] = callEvents[callTo].slice(-50);
            }
            logMessage(`[CALL] ${callEvent} from ${callFrom.slice(0,12)} to ${callTo.slice(0,12)} callId=${callId.slice(0,10)} payload=${payload ? 'yes' : 'no'}`);
            res.json({ ok: true, event: callEvent, to: callTo.slice(0,12), from: callFrom.slice(0,12) });
            break;

        case 'callPoll':
            const callPollPeerId = req.body.peerId;
            if (!callPollPeerId) {
                res.json({ error: 'peerId required' });
                break;
            }
            const events = callEvents[callPollPeerId] || [];
            delete callEvents[callPollPeerId];
            if (events.length > 0) {
                logMessage(`[CALL-POLL] ${callPollPeerId.slice(0,12)} got ${events.length} events: ${events.map(e => e.event).join(',')}`);
            }
            res.json(events);
            break;

        case 'callHangup':
            const { to: hangupTo, from: hangupFrom, callId: hangupCallId, kind: hangupKind } = req.body;
            if (hangupTo && hangupFrom && hangupCallId) {
                if (!callEvents[hangupTo]) callEvents[hangupTo] = [];
                callEvents[hangupTo].push({
                    from: hangupFrom,
                    callId: hangupCallId,
                    event: 'hangup',
                    kind: hangupKind || 'voice',
                    payload: null,
                    ts: Date.now()
                });
                logMessage(`[CALL] hangup from ${hangupFrom} to ${hangupTo}`);
            }
            res.json({ ok: true });
            break;

        // === GROUP ENDPOINTS ===
        case 'groupCreate':
            const gcName = req.body.name;
            const gcUsername = req.body.username?.toLowerCase().replace(/[^a-z0-9_]/g, '');
            const gcOwner = req.body.ownerId;
            const gcAvatar = req.body.avatar;
            const gcDesc = req.body.description;
            const gcKey = req.body.groupKey; // Ключ шифрования группы
            if (!gcName || !gcOwner) {
                res.json({ ok: false, error: 'name and ownerId required' });
                break;
            }
            // Check username uniqueness
            if (gcUsername && Object.values(groups).find(g => g.username === gcUsername)) {
                res.json({ ok: false, error: 'username already taken' });
                break;
            }
            const groupId = 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            groups[groupId] = {
                id: groupId,
                name: gcName,
                username: gcUsername,
                avatar: gcAvatar,
                description: gcDesc,
                ownerId: gcOwner,
                members: [gcOwner],
                groupKey: gcKey,
                createdAt: Date.now()
            };
            groupMessages[groupId] = [];
            logMessage(`[GROUP] Created: ${gcName} (@${gcUsername}) by ${gcOwner.slice(0,8)}`);
            res.json({ ok: true, groupId, group: groups[groupId] });
            break;

        case 'groupJoin':
            const gjId = req.body.groupId;
            const gjMember = req.body.memberId;
            if (!gjId || !gjMember || !groups[gjId]) {
                res.json({ ok: false, error: 'invalid group or member' });
                break;
            }
            if (!groups[gjId].members.includes(gjMember)) {
                groups[gjId].members.push(gjMember);
            }
            logMessage(`[GROUP] ${gjMember.slice(0,8)} joined ${groups[gjId].name}`);
            // Возвращаем groupKey для расшифровки сообщений
            res.json({ ok: true, group: groups[gjId], groupKey: groups[gjId].groupKey, memberCount: groups[gjId].members.length });
            break;

        case 'groupLeave':
            const glId = req.body.groupId;
            const glMember = req.body.memberId;
            if (glId && glMember && groups[glId]) {
                groups[glId].members = groups[glId].members.filter(m => m !== glMember);
                logMessage(`[GROUP] ${glMember.slice(0,8)} left ${groups[glId].name}`);
            }
            res.json({ ok: true });
            break;

        case 'groupSearch':
            const gsQuery = (req.body.query || '').toLowerCase().trim();
            if (!gsQuery) {
                res.json({ ok: true, results: [] });
                break;
            }
            const gsResults = Object.values(groups).filter(g => 
                g.username?.includes(gsQuery) || g.name.toLowerCase().includes(gsQuery)
            ).map(g => ({
                id: g.id,
                name: g.name,
                username: g.username,
                avatar: g.avatar,
                description: g.description,
                memberCount: g.members.length
            }));
            res.json({ ok: true, results: gsResults });
            break;

        case 'groupInfo':
            const giId = req.body.groupId;
            if (giId && groups[giId]) {
                res.json({ ok: true, group: { ...groups[giId], memberCount: groups[giId].members.length } });
            } else {
                res.json({ ok: false, error: 'group not found' });
            }
            break;

        case 'groupSend':
            const gsMsgGroupId = req.body.groupId;
            const gsMsgFrom = req.body.from;
            const gsMsgContent = req.body.content;
            const gsMsgType = req.body.type || 'text';
            const gsMsgId = req.body.id || ('gm_' + Date.now());
            const gsMsgTs = req.body.timestamp || Date.now();
            if (!gsMsgGroupId || !gsMsgFrom || !groups[gsMsgGroupId]) {
                res.json({ ok: false, error: 'invalid group' });
                break;
            }
            if (!groupMessages[gsMsgGroupId]) groupMessages[gsMsgGroupId] = [];
            groupMessages[gsMsgGroupId].push({
                id: gsMsgId,
                from: gsMsgFrom,
                content: gsMsgContent,
                type: gsMsgType,
                timestamp: gsMsgTs
            });
            // Keep last 500 messages
            if (groupMessages[gsMsgGroupId].length > 500) {
                groupMessages[gsMsgGroupId] = groupMessages[gsMsgGroupId].slice(-500);
            }
            res.json({ ok: true, messageId: gsMsgId });
            break;

        case 'groupPoll':
            const gpGroupId = req.body.groupId;
            const gpSince = req.body.since || 0;
            if (!gpGroupId || !groups[gpGroupId]) {
                res.json({ ok: false, error: 'invalid group' });
                break;
            }
            const gpMsgs = (groupMessages[gpGroupId] || []).filter(m => m.timestamp > gpSince);
            res.json({ ok: true, messages: gpMsgs, group: { name: groups[gpGroupId].name, memberCount: groups[gpGroupId].members.length } });
            break;

        // === CHANNEL ENDPOINTS ===
        case 'channelCreate':
            const chName = req.body.name;
            const chUsername = req.body.username?.toLowerCase().replace(/[^a-z0-9_]/g, '');
            const chOwner = req.body.ownerId;
            const chAvatar = req.body.avatar;
            const chDesc = req.body.description;
            if (!chName || !chOwner) {
                res.json({ ok: false, error: 'name and ownerId required' });
                break;
            }
            if (chUsername && Object.values(channels).find(c => c.username === chUsername)) {
                res.json({ ok: false, error: 'username taken' });
                break;
            }
            const channelId = 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            channels[channelId] = {
                id: channelId, name: chName, username: chUsername, avatar: chAvatar,
                description: chDesc, ownerId: chOwner, subscribers: [chOwner], createdAt: Date.now()
            };
            channelPosts[channelId] = [];
            res.json({ ok: true, channelId, channel: channels[channelId] });
            break;

        case 'channelSubscribe':
            const csId = req.body.channelId;
            const csUser = req.body.userId;
            if (csId && csUser && channels[csId]) {
                if (!channels[csId].subscribers.includes(csUser)) channels[csId].subscribers.push(csUser);
                res.json({ ok: true, subscriberCount: channels[csId].subscribers.length });
            } else {
                res.json({ ok: false, error: 'invalid channel' });
            }
            break;

        case 'channelUnsubscribe':
            const cuId = req.body.channelId;
            const cuUser = req.body.userId;
            if (cuId && cuUser && channels[cuId]) {
                channels[cuId].subscribers = channels[cuId].subscribers.filter(s => s !== cuUser);
                res.json({ ok: true });
            } else {
                res.json({ ok: false });
            }
            break;

        case 'channelSearch':
            const chQuery = (req.body.query || '').toLowerCase().trim();
            const chResults = Object.values(channels).filter(c =>
                c.username?.includes(chQuery) || c.name.toLowerCase().includes(chQuery)
            ).map(c => ({ id: c.id, name: c.name, username: c.username, avatar: c.avatar, subscriberCount: c.subscribers.length }));
            res.json({ ok: true, results: chResults });
            break;

        case 'channelInfo':
            const ciId = req.body.channelId;
            if (ciId && channels[ciId]) {
                res.json({ ok: true, channel: { ...channels[ciId], subscriberCount: channels[ciId].subscribers.length } });
            } else {
                res.json({ ok: false, error: 'not found' });
            }
            break;

        case 'channelPost':
            const cpId = req.body.channelId;
            const cpFrom = req.body.from;
            const cpContent = req.body.content;
            const cpMedia = req.body.mediaUri;
            const cpMediaType = req.body.mediaType;
            if (!cpId || !channels[cpId]) {
                res.json({ ok: false, error: 'invalid channel' });
                break;
            }
            if (channels[cpId].ownerId !== cpFrom) {
                res.json({ ok: false, error: 'not owner' });
                break;
            }
            const postId = 'p_' + Date.now();
            const post = { id: postId, content: cpContent, mediaUri: cpMedia, mediaType: cpMediaType, timestamp: Date.now(), views: 0, reactions: {} };
            if (!channelPosts[cpId]) channelPosts[cpId] = [];
            channelPosts[cpId].push(post);
            res.json({ ok: true, postId, post });
            break;

        case 'channelPoll':
            const cpPollId = req.body.channelId;
            const cpSince = req.body.since || 0;
            if (!cpPollId || !channels[cpPollId]) {
                res.json({ ok: false, error: 'invalid channel' });
                break;
            }
            const posts = (channelPosts[cpPollId] || []).filter(p => p.timestamp > cpSince);
            res.json({ ok: true, posts, channel: { name: channels[cpPollId].name, subscriberCount: channels[cpPollId].subscribers.length } });
            break;

        case 'channelReact':
            const crChId = req.body.channelId;
            const crPostId = req.body.postId;
            const crEmoji = req.body.emoji;
            const crUser = req.body.userId;
            if (crChId && crPostId && crEmoji && channelPosts[crChId]) {
                const postIdx = channelPosts[crChId].findIndex(p => p.id === crPostId);
                if (postIdx >= 0) {
                    if (!channelPosts[crChId][postIdx].reactions) channelPosts[crChId][postIdx].reactions = {};
                    if (!channelPosts[crChId][postIdx].reactions[crEmoji]) channelPosts[crChId][postIdx].reactions[crEmoji] = [];
                    if (!channelPosts[crChId][postIdx].reactions[crEmoji].includes(crUser)) {
                        channelPosts[crChId][postIdx].reactions[crEmoji].push(crUser);
                    }
                    res.json({ ok: true, reactions: channelPosts[crChId][postIdx].reactions });
                } else {
                    res.json({ ok: false, error: 'post not found' });
                }
            } else {
                res.json({ ok: false });
            }
            break;

        case 'channelView':
            const cvChId = req.body.channelId;
            const cvPostId = req.body.postId;
            if (cvChId && cvPostId && channelPosts[cvChId]) {
                const pIdx = channelPosts[cvChId].findIndex(p => p.id === cvPostId);
                if (pIdx >= 0) {
                    channelPosts[cvChId][pIdx].views = (channelPosts[cvChId][pIdx].views || 0) + 1;
                    res.json({ ok: true, views: channelPosts[cvChId][pIdx].views });
                } else {
                    res.json({ ok: false });
                }
            } else {
                res.json({ ok: false });
            }
            break;

        case 'status':
            res.json({
                success: true,
                status: 'running',
                type: 'node_relay',
                activePeers: Object.keys(activePeers).length,
                queuedMessages: messageQueue.length,
                storedUserData: Object.keys(userDataStore).length,
                uptime: process.uptime(),
                version: '2.1-node-sync'
            });
            break;

        default:
            res.json({ success: false, error: 'unknown action' });
            break;
    }
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`NODUS Relay Server running on port ${PORT} (HTTP + WebSocket)`);
    logMessage('Relay server started with WebSocket support');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down relay server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Shutting down relay server...');
    process.exit(0);
});
