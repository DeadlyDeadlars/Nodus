/**
 * NODUS Relay Server v3
 * С rate limiting и улучшенной безопасностью
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const nacl = require('tweetnacl');

const app = express();
app.use(cors());
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    if (buf.length > 1024 * 1024) {
      throw new Error('Request too large');
    }
  }
}));

// Connection limiting per IP
const connectionLimits = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const hashedIp = nacl.hash(Buffer.from(ip + ':nodus:salt:v1')).slice(0, 16).toString('hex');
  const connections = connectionLimits.get(hashedIp) || 0;
  
  if (connections > 5) {
    return res.status(429).json({ error: 'Too many connections' });
  }
  
  connectionLimits.set(hashedIp, connections + 1);
  res.on('close', () => {
    connectionLimits.set(hashedIp, Math.max(0, (connectionLimits.get(hashedIp) || 1) - 1));
  });
  next();
});

// ============ ENVIRONMENT VALIDATION ============
const TURN_SECRET = process.env.TURN_SECRET;
const CRED_SECRET = process.env.CRED_SECRET;

if (!TURN_SECRET || !CRED_SECRET) {
  console.error('CRITICAL: Required environment variables missing (TURN_SECRET, CRED_SECRET)');
  process.exit(1);
}

// ============ RATE LIMITING (IP-HASHED) ============
const rateLimits = new Map();
const blockedIPs = new Set();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMITS = {
  default: 100,    // Увеличено с 10
  register: 20,    // Увеличено с 2
  send: 200,       // Увеличено с 20
  poll: 300,       // Увеличено с 30
  search: 50,      // Увеличено с 5
  call: 100,       // Увеличено с 10
};

function blockIP(hashedIp, duration = 3600000) {
  blockedIPs.add(hashedIp);
  setTimeout(() => blockedIPs.delete(hashedIp), duration);
}

// Hash IP for privacy - we don't store actual IPs
function hashIP(ip) {
  const hash = nacl.hash(Buffer.from(ip + ':nodus:salt:v1'));
  return Buffer.from(hash.slice(0, 16)).toString('hex');
}

// Hash username for privacy-preserving search
function hashUsername(username) {
  const normalized = username.toLowerCase().trim();
  const hash = nacl.hash(Buffer.from(normalized + ':nodus:search:v1'));
  return Buffer.from(hash.slice(0, 16)).toString('hex');
}

function getRateLimitKey(ip, action) {
  return `${hashIP(ip)}:${action}`;
}

function checkRateLimit(ip, action = 'default') {
  const hashedIp = hashIP(ip);
  
  // Check if IP is blocked
  if (blockedIPs.has(hashedIp)) {
    return false;
  }
  
  const key = `${hashedIp}:${action}`;
  const now = Date.now();
  const limit = RATE_LIMITS[action] || RATE_LIMITS.default;
  
  let entry = rateLimits.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS, violations: 0 };
    rateLimits.set(key, entry);
  }
  
  entry.count++;
  
  // Auto-block after repeated violations
  if (entry.count > limit) {
    entry.violations = (entry.violations || 0) + 1;
    if (entry.violations >= 3) {
      blockIP(hashedIp, 3600000); // 1 hour block
    }
    return false;
  }
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetTime + RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(key);
    }
  }
}, 60000);

// Rate limit middleware
function rateLimitMiddleware(action) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, action)) {
      return res.status(429).json({ ok: false, error: 'Rate limit exceeded. Try again later.' });
    }
    next();
  };
}

// ============ INPUT VALIDATION ============
function sanitizeString(str, maxLen = 1000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen).replace(/[<>]/g, '');
}

function validatePeerId(peerId) {
  if (typeof peerId !== 'string') return false;
  if (peerId.length < 16 || peerId.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(peerId);
}

function validateMailboxId(mailboxId) {
  if (typeof mailboxId !== 'string') return false;
  if (mailboxId.length < 16 || mailboxId.length > 128) return false;
  return /^[a-f0-9_]+$/.test(mailboxId);
}

// Proxy endpoint для браузера
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {} } = req.body;
    
    if (!url) {
      return res.json({ ok: false, error: 'URL required' });
    }

    console.log(`[Proxy] Fetching ${url}`);
    
    // Блокируем вредоносные домены
    const blockedDomains = [
      'malware.com', 'phishing.com', 'spam.com'
    ];
    
    const urlObj = new URL(url);
    if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.json({ ok: false, error: 'Blocked domain' });
    }
    
    // Добавляем заголовки для анонимности
    const proxyHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      ...headers
    };

    // Удаляем заголовки которые могут выдать прокси
    delete proxyHeaders['X-Forwarded-For'];
    delete proxyHeaders['X-Real-IP'];
    delete proxyHeaders['Via'];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Увеличил до 30 сек

    const response = await fetch(url, {
      method,
      headers: proxyHeaders,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.json({ ok: false, error: `HTTP ${response.status} ${response.statusText}` });
    }

    let content = await response.text();
    
    // Базовая очистка контента от трекеров
    content = content
      .replace(/google-analytics\.com\/[^"']*/g, '#blocked')
      .replace(/googletagmanager\.com\/[^"']*/g, '#blocked')
      .replace(/facebook\.com\/tr[^"']*/g, '#blocked')
      .replace(/doubleclick\.net\/[^"']*/g, '#blocked');
    
    res.json({
      ok: true,
      content,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      url: response.url,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Proxy] Error:', error);
    
    if (error.name === 'AbortError') {
      res.json({ ok: false, error: 'Request timeout (30s)' });
    } else if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      res.json({ ok: false, error: 'Connection timeout - site may be slow or unreachable' });
    } else if (error.code === 'ENOTFOUND') {
      res.json({ ok: false, error: 'Domain not found' });
    } else if (error.code === 'ECONNREFUSED') {
      res.json({ ok: false, error: 'Connection refused by server' });
    } else {
      res.json({ ok: false, error: `Network error: ${error.message}` });
    }
  }
});

// Health check для браузера
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: Date.now() });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ============ STORAGE ============
const wsConnections = new Map();      // peerId -> ws
const activePeers = {};               // peerId -> { info, lastSeen }
const profiles = {};                  // fingerprint -> profile
const messageQueue = [];              // legacy message queue
const fileChunks = {};                // peerId -> [{ fileId, index, data }] - file transfer chunks
const callEvents = {};                // peerId -> [events]
const signalingQueue = {};            // peerId -> [signals]
const groups = {};                    // groupId -> group
const groupMessages = {};             // groupId -> [messages]
const channels = {};                  // channelId -> channel
const channelPosts = {};              // channelId -> [posts]
const userChats = {};                 // fingerprint -> encrypted chats
const preKeyBundles = {};             // peerId -> X3DH prekey bundle

// Blind relay storage
const mailboxes = new Map();          // mailboxId -> { messages: [], lastAccess }
const registeredKeys = new Map();     // mailboxId -> publicKey
const challenges = new Map();         // mailboxId -> { challenge, expires }

// ============ UTILS ============
function logMessage(msg) {
  console.log(new Date().toISOString().slice(11, 19) + ' ' + msg);
}

function b64ToBytes(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function generateChallenge() {
  return bytesToB64(nacl.randomBytes(32));
}

function verifySignature(message, signature, publicKey) {
  try {
    const msgBytes = typeof message === 'string' 
      ? new Uint8Array([...message].map(c => c.charCodeAt(0)))
      : message;
    return nacl.sign.detached.verify(msgBytes, b64ToBytes(signature), b64ToBytes(publicKey));
  } catch {
    return false;
  }
}

// Alias for message signature verification
const verifyMessageSignature = verifySignature;

// ============ CLEANUP ============
setInterval(() => {
  const now = Date.now();
  // Cleanup old peers
  Object.keys(activePeers).forEach(id => {
    if (now - activePeers[id].lastSeen > 300000) delete activePeers[id];
  });
  // Cleanup call events
  Object.keys(callEvents).forEach(id => {
    callEvents[id] = callEvents[id].filter(e => now - e.ts < 120000);
    if (callEvents[id].length === 0) delete callEvents[id];
  });
  // Cleanup mailboxes
  for (const [id, mb] of mailboxes) {
    mb.messages = mb.messages.filter(m => now - m.timestamp < 7 * 24 * 60 * 60 * 1000);
    if (mb.messages.length === 0 && now - mb.lastAccess > 86400000) mailboxes.delete(id);
  }
}, 60000);

// ============ WEBSOCKET ============
wss.on('connection', (ws) => {
  let peerId = null;
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.action === 'subscribe' && msg.peerId) {
        peerId = msg.peerId;
        wsConnections.set(peerId, ws);
        logMessage(`[WS] Client connected`);
        
        // Send pending messages
        const pending = messageQueue.filter(m => m.toPeerId === peerId);
        messageQueue.length = 0;
        messageQueue.push(...messageQueue.filter(m => m.toPeerId !== peerId));
        pending.forEach(m => ws.send(JSON.stringify({ type: 'message', ...m })));
      }
    } catch {}
  });
  
  ws.on('close', () => {
    if (peerId) {
      wsConnections.delete(peerId);
      logMessage(`[WS] Client disconnected`);
    }
  });
  
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function sendToWs(peerId, data) {
  const ws = wsConnections.get(peerId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// ============ BLIND RELAY API ============
app.post('/api/challenge', rateLimitMiddleware('register'), (req, res) => {
  const { mailboxId } = req.body;
  if (!validateMailboxId(mailboxId)) return res.json({ ok: false, error: 'Invalid mailboxId' });
  
  const challenge = generateChallenge();
  challenges.set(mailboxId, { challenge, expires: Date.now() + 60000 });
  res.json({ ok: true, challenge });
});

app.post('/api/register', rateLimitMiddleware('register'), (req, res) => {
  const { mailboxId, publicKey, signature, challenge } = req.body;
  if (!validateMailboxId(mailboxId) || !publicKey || !signature || !challenge) {
    return res.json({ ok: false, error: 'Missing or invalid fields' });
  }
  
  const stored = challenges.get(mailboxId);
  if (!stored || stored.challenge !== challenge || Date.now() > stored.expires) {
    return res.json({ ok: false, error: 'Invalid challenge' });
  }
  challenges.delete(mailboxId);
  
  if (!verifySignature(challenge, signature, publicKey)) {
    return res.json({ ok: false, error: 'Invalid signature' });
  }
  
  registeredKeys.set(mailboxId, publicKey);
  if (!mailboxes.has(mailboxId)) mailboxes.set(mailboxId, { messages: [], lastAccess: Date.now() });
  
  res.json({ ok: true });
});

app.post('/api/send', rateLimitMiddleware('send'), (req, res) => {
  const { mailboxId, blob } = req.body;
  if (!validateMailboxId(mailboxId) || !blob) return res.json({ ok: false, error: 'Missing fields' });
  if (blob.length > 1024 * 1024) return res.json({ ok: false, error: 'Too large' });
  
  if (!mailboxes.has(mailboxId)) mailboxes.set(mailboxId, { messages: [], lastAccess: Date.now() });
  const mb = mailboxes.get(mailboxId);
  
  if (mb.messages.length >= 1000) mb.messages.shift();
  const messageId = bytesToB64(nacl.randomBytes(16));
  mb.messages.push({ id: messageId, blob, timestamp: Date.now() });
  
  res.json({ ok: true, messageId });
});

app.post('/api/poll', rateLimitMiddleware('poll'), (req, res) => {
  const { mailboxId, timestamp, signature } = req.body;
  if (!mailboxId || !timestamp || !signature) return res.json({ ok: false, error: 'Missing fields' });
  
  const ts = parseInt(timestamp);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 60000) return res.json({ ok: false, error: 'Invalid timestamp' });
  
  const publicKey = registeredKeys.get(mailboxId);
  if (!publicKey) return res.json({ ok: false, error: 'Not registered' });
  
  if (!verifySignature(`poll:${mailboxId}:${timestamp}`, signature, publicKey)) {
    return res.json({ ok: false, error: 'Invalid signature' });
  }
  
  const mb = mailboxes.get(mailboxId);
  if (!mb) return res.json({ ok: true, messages: [] });
  
  mb.lastAccess = Date.now();
  const messages = mb.messages.map(m => ({ id: m.id, blob: m.blob, ts: m.timestamp }));
  
  // Minimal logging - no metadata
  if (messages.length > 0) {
    logMessage('[Poll] Messages delivered');
  }
  res.json({ ok: true, messages });
});

app.post('/api/ack', (req, res) => {
  const { mailboxId, messageIds, timestamp, signature } = req.body;
  if (!mailboxId || !messageIds || !timestamp || !signature) return res.json({ ok: false, error: 'Missing fields' });
  
  const publicKey = registeredKeys.get(mailboxId);
  if (publicKey && !verifySignature(`ack:${mailboxId}:${timestamp}:${messageIds.join(',')}`, signature, publicKey)) {
    return res.json({ ok: false, error: 'Invalid signature' });
  }
  
  const mb = mailboxes.get(mailboxId);
  if (mb) {
    mb.messages = mb.messages.filter(m => !messageIds.includes(m.id));
  }
  
  res.json({ ok: true });
});

// ============ LEGACY RELAY API ============
const relayChallenges = new Map(); // peerId -> { challenge, expires }

// Get challenge for relay operations
app.post('/relay/challenge', rateLimitMiddleware('register'), (req, res) => {
  const { peerId } = req.body;
  if (!validatePeerId(peerId)) return res.json({ success: false, error: 'Invalid peerId' });
  
  const challenge = generateChallenge();
  relayChallenges.set(peerId, { challenge, expires: Date.now() + 60000 });
  res.json({ success: true, challenge });
});

// Verify relay signature
function verifyRelayAuth(peerId, signature, challenge, publicKey) {
  if (!signature || !challenge || !publicKey) {
    console.log('[DEBUG] Missing fields:', { signature: !!signature, challenge: !!challenge, publicKey: !!publicKey });
    return false;
  }
  
  const stored = relayChallenges.get(peerId);
  if (!stored || stored.challenge !== challenge || Date.now() > stored.expires) {
    console.log('[DEBUG] Challenge mismatch:', { 
      hasStored: !!stored, 
      challengeMatch: stored?.challenge === challenge,
      expired: stored ? Date.now() > stored.expires : 'no stored'
    });
    return false;
  }
  
  const result = verifySignature(challenge, signature, publicKey);
  console.log('[DEBUG] Signature verification:', { 
    challenge: challenge.slice(0, 20) + '...', 
    signature: signature.slice(0, 20) + '...', 
    publicKey: publicKey.slice(0, 20) + '...',
    result 
  });
  return result;
}

app.post('/relay', (req, res) => {
  const { action } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Apply rate limiting based on action
  const actionLimits = {
    register: 'register',
    sendMessage: 'send',
    searchUser: 'search',
    callSend: 'call',
    callPoll: 'poll',
  };
  const limitAction = actionLimits[action] || 'default';
  if (!checkRateLimit(ip, limitAction)) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }
  
  switch (action) {
    case 'register': {
      const { peerId, info, signature, challenge } = req.body;
      if (!validatePeerId(peerId)) return res.json({ success: false, error: 'Invalid peerId' });
      
      // Require publicKey and signature for registration
      if (!info?.publicKey) {
        return res.json({ success: false, error: 'Public key required' });
      }
      
      if (!signature || !challenge) {
        return res.json({ success: false, error: 'Signature required' });
      }
      
      if (!verifyRelayAuth(peerId, signature, challenge, info.publicKey)) {
        return res.json({ success: false, error: 'Invalid signature' });
      }
      relayChallenges.delete(peerId);
      
      // Store username for search + encrypted profile for privacy
      const sanitizedInfo = {
        username: info?.username, // Plain username for search
        encryptedProfile: info?.encryptedProfile,
        usernameHash: info?.usernameHash,
        publicKey: info?.publicKey,
        boxPublicKey: info?.boxPublicKey,
      };
      
      activePeers[peerId] = { info: sanitizedInfo, lastSeen: Date.now() };
      
      profiles[peerId] = {
        ...profiles[peerId],
        fingerprint: peerId,
        username: sanitizedInfo.username || profiles[peerId]?.username,
        encryptedProfile: sanitizedInfo.encryptedProfile || profiles[peerId]?.encryptedProfile,
        usernameHash: sanitizedInfo.usernameHash || profiles[peerId]?.usernameHash,
        publicKey: sanitizedInfo.publicKey || profiles[peerId]?.publicKey,
        boxPublicKey: sanitizedInfo.boxPublicKey || profiles[peerId]?.boxPublicKey,
        updatedAt: Date.now()
      };
      
      res.json({ success: true, peerId });
      break;
    }
    
    case 'heartbeat': {
      const { peerId } = req.body;
      if (peerId && activePeers[peerId]) activePeers[peerId].lastSeen = Date.now();
      res.json({ success: true });
      break;
    }
    
    case 'sendMessage': {
      const { fromPeerId, toPeerId, message, signature, timestamp } = req.body;
      if (!validatePeerId(fromPeerId) || !validatePeerId(toPeerId) || !message) {
        return res.json({ success: false, error: 'Invalid params' });
      }
      
      // CRITICAL: Signature required
      if (!signature || !timestamp) {
        return res.json({ success: false, error: 'Signature required' });
      }
      
      // Verify timestamp freshness (5 min window)
      if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
        return res.json({ success: false, error: 'Timestamp expired' });
      }
      
      // Verify sender signature
      const senderInfo = activePeers[fromPeerId] || profiles[fromPeerId];
      if (!senderInfo?.publicKey) {
        return res.json({ success: false, error: 'Unknown sender' });
      }
      
      const msgToVerify = `${fromPeerId}:${toPeerId}:${timestamp}`;
      if (!verifyMessageSignature(msgToVerify, signature, senderInfo.publicKey)) {
        return res.json({ success: false, error: 'Invalid signature' });
      }
      
      const now = Date.now();
      const sent = sendToWs(toPeerId, { type: 'message', fromPeerId, message, timestamp: now });
      if (!sent) messageQueue.push({ fromPeerId, toPeerId, message, timestamp: now });
      
      res.json({ success: true, delivered: sent });
      break;
    }
    
    // Sealed Sender - server doesn't know who sent the message
    case 'sealedSend': {
      const { toPeerId, envelope } = req.body;
      if (!validatePeerId(toPeerId) || !envelope) {
        return res.json({ success: false, error: 'Invalid params' });
      }
      
      // Server only knows recipient, sender is encrypted inside envelope
      const sent = sendToWs(toPeerId, { type: 'sealed', envelope, timestamp: Date.now() });
      if (!sent) messageQueue.push({ toPeerId, envelope, sealed: true, timestamp: Date.now() });
      
      res.json({ success: true, delivered: sent });
      break;
    }
    
    case 'getMessages': {
      const { peerId } = req.body;
      if (!validatePeerId(peerId)) return res.json({ success: false, error: 'Invalid peerId' });
      
      const msgs = messageQueue.filter(m => m.toPeerId === peerId);
      const remaining = messageQueue.filter(m => m.toPeerId !== peerId);
      messageQueue.length = 0;
      messageQueue.push(...remaining);
      
      res.json({ success: true, messages: msgs, count: msgs.length });
      break;
    }

    // ✅ НОВОЕ: Публикация профиля для поиска
    case 'publishProfile': {
      const { profile, fingerprint } = req.body;
      if (!fingerprint || !profile) {
        return res.json({ ok: false, error: 'Missing profile or fingerprint' });
      }
      
      profiles[fingerprint] = {
        ...profile,
        fingerprint,
        updatedAt: Date.now()
      };
      
      logMessage(`[Profile] Published for ${fingerprint}, username: ${profile.username}`);
      res.json({ ok: true, success: true });
      break;
    }

    // ✅ НОВОЕ: Поиск пользователей по username
    case 'searchUsers': {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.json({ ok: true, users: [] });
      }
      
      const results = Object.values(profiles).filter(p => 
        p && p.username && p.username.toLowerCase().includes(query.toLowerCase())
      );
      
      logMessage(`[Search] Query: "${query}", found: ${results.length}`);
      res.json({ ok: true, users: results, success: true });
      break;
    }
    
    // File chunk transfer (raw, encrypted with fileKey by sender)
    case 'fileChunk': {
      const { toPeerId, fromPeerId, fileId, index, data } = req.body;
      if (!validatePeerId(toPeerId) || !fileId) {
        return res.json({ success: false, error: 'Invalid params' });
      }
      
      if (!fileChunks[toPeerId]) fileChunks[toPeerId] = [];
      fileChunks[toPeerId].push({ fromPeerId, fileId, index, data, ts: Date.now() });
      
      // Limit chunks per peer (prevent DoS)
      if (fileChunks[toPeerId].length > 1000) {
        fileChunks[toPeerId] = fileChunks[toPeerId].slice(-500);
      }
      
      res.json({ success: true });
      break;
    }
    
    case 'getFileChunks': {
      const { peerId } = req.body;
      if (!validatePeerId(peerId)) return res.json({ success: false, error: 'Invalid peerId' });
      
      const chunks = fileChunks[peerId] || [];
      delete fileChunks[peerId];
      
      res.json({ success: true, chunks });
      break;
    }
    
    // X3DH PreKey Management
    case 'uploadPreKeys': {
      const { peerId, identityKey, signedPreKey, oneTimePreKeys } = req.body;
      if (!validatePeerId(peerId) || !identityKey || !signedPreKey) {
        return res.json({ ok: false, error: 'Invalid params' });
      }
      
      preKeyBundles[peerId] = {
        identityKey,
        signedPreKey: signedPreKey.publicKey,
        signedPreKeyId: signedPreKey.id,
        signedPreKeySignature: signedPreKey.signature,
        oneTimePreKeys: oneTimePreKeys || [],
      };
      res.json({ ok: true });
      break;
    }
    
    case 'getPreKeyBundle': {
      const { peerId } = req.body;
      if (!validatePeerId(peerId)) return res.json({ ok: false });
      
      const bundle = preKeyBundles[peerId];
      if (!bundle) return res.json({ ok: false, error: 'No prekeys' });
      
      // Pop one-time prekey if available
      let oneTimePreKey, oneTimePreKeyId;
      if (bundle.oneTimePreKeys?.length > 0) {
        const opk = bundle.oneTimePreKeys.shift();
        oneTimePreKey = opk.publicKey;
        oneTimePreKeyId = opk.id;
      }
      
      res.json({
        ok: true,
        bundle: {
          identityKey: bundle.identityKey,
          signedPreKey: bundle.signedPreKey,
          signedPreKeyId: bundle.signedPreKeyId,
          signedPreKeySignature: bundle.signedPreKeySignature,
          oneTimePreKey,
          oneTimePreKeyId,
        },
      });
      break;
    }
    
    case 'searchUser': {
      const query = (req.body.query || req.body.username || '').toLowerCase().trim();
      if (!query) return res.json({ success: true, users: [], results: [] });
      
      const results = [];
      const seen = new Set();
      
      // Search by username or fingerprint
      Object.entries(activePeers).forEach(([id, peer]) => {
        const username = (peer.info?.username || '').toLowerCase();
        if (username.includes(query) || id.toLowerCase().includes(query)) {
          seen.add(id);
          results.push({
            peerId: id,
            fingerprint: id,
            username: peer.info?.username,
            publicKey: peer.info?.publicKey,
            boxPublicKey: peer.info?.boxPublicKey,
            isOnline: true
          });
        }
      });
      
      // Search saved profiles
      Object.entries(profiles).forEach(([id, p]) => {
        if (seen.has(id)) return;
        const username = (p.username || '').toLowerCase();
        if (username.includes(query) || id.toLowerCase().includes(query)) {
          results.push({
            peerId: id,
            fingerprint: id,
            username: p.username,
            publicKey: p.publicKey,
            boxPublicKey: p.boxPublicKey,
            isOnline: false
          });
        }
      });
      
      logMessage(`[Search] Query: ${query}, Found: ${results.length}`);
      res.json({ success: true, users: results, results });
      break;
    }
    
    case 'saveProfile': {
      const { fingerprint, username, alias, avatar, bio, publicKey, encryptedProfile } = req.body;
      if (!fingerprint) return res.json({ ok: false });
      
      profiles[fingerprint] = {
        ...profiles[fingerprint],
        fingerprint, username, alias, avatar, bio, publicKey, encryptedProfile,
        updatedAt: Date.now()
      };
      
      logMessage(`[Profile] Saved`);
      res.json({ ok: true, success: true });
      break;
    }
    
    case 'getProfile': {
      const { fingerprint, peerId } = req.body;
      const id = fingerprint || peerId;
      const p = profiles[id];
      if (p) {
        res.json({ ok: true, ...p });
      } else {
        res.json({ ok: false, error: 'not found' });
      }
      break;
    }
    
    case 'presenceGet': {
      const peerIds = req.body.peerIds || [];
      const now = Date.now();
      const presence = {};
      peerIds.forEach(id => {
        const peer = activePeers[id];
        presence[id] = peer 
          ? { online: now - peer.lastSeen < 60000, lastSeen: Math.floor(peer.lastSeen / 1000) }
          : { online: false, lastSeen: 0 };
      });
      res.json({ ok: true, presence });
      break;
    }
    
    case 'callSend': {
      const { to, from, callId, event, kind, payload } = req.body;
      if (!to || !from || !callId || !event) return res.json({ error: 'missing params' });
      
      if (!callEvents[to]) callEvents[to] = [];
      callEvents[to].push({ from, callId, event, kind: kind || 'voice', payload, ts: Date.now() });
      if (callEvents[to].length > 50) callEvents[to] = callEvents[to].slice(-50);
      
      logMessage(`[Call] Event processed`);
      res.json({ ok: true });
      break;
    }
    
    case 'callPoll': {
      const { peerId } = req.body;
      if (!peerId) return res.json({ error: 'peerId required' });
      
      const events = callEvents[peerId] || [];
      delete callEvents[peerId];
      res.json(events);
      break;
    }
    
    // Groups - Privacy-preserving: server doesn't know members
    case 'groupCreate': {
      const { name, username, ownerId, avatar, description, encryptedGroupKey, encryptedName } = req.body;
      if (!ownerId) return res.json({ ok: false, error: 'ownerId required' });
      
      const uname = username?.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (uname && Object.values(groups).find(g => g.username === uname)) {
        return res.json({ ok: false, error: 'username taken' });
      }
      
      const groupId = 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      // Server stores only: encrypted name, public username, encrypted group key
      // NO member list - members use their own mailboxes
      groups[groupId] = { 
        id: groupId, 
        encryptedName: encryptedName || name, // encrypted by group key
        username: uname, 
        avatar, 
        description,
        encryptedGroupKey, // encrypted for owner, others get via invite
        memberCount: 1, // approximate, for display only
        createdAt: Date.now() 
      };
      groupMessages[groupId] = [];
      
      logMessage(`[Group] Created`);
      res.json({ ok: true, groupId, group: { id: groupId, username: uname, memberCount: 1 } });
      break;
    }
    
    case 'groupJoin': {
      // Just increment counter - actual membership is client-side
      const { groupId } = req.body;
      if (!groupId || !groups[groupId]) return res.json({ ok: false });
      
      groups[groupId].memberCount = (groups[groupId].memberCount || 0) + 1;
      res.json({ ok: true, groupId });
      break;
    }
    
    case 'groupLeave': {
      const { groupId } = req.body;
      if (!groupId || !groups[groupId]) return res.json({ ok: false });
      
      groups[groupId].memberCount = Math.max(0, (groups[groupId].memberCount || 1) - 1);
      res.json({ ok: true });
      break;
    }
    
    case 'groupInfo': {
      const { groupId } = req.body;
      if (groupId && groups[groupId]) {
        // Return only public info
        const g = groups[groupId];
        res.json({ ok: true, group: { 
          id: g.id, username: g.username, avatar: g.avatar,
          encryptedName: g.encryptedName, encryptedGroupKey: g.encryptedGroupKey,
          memberCount: g.memberCount, createdAt: g.createdAt 
        }});
      } else {
        res.json({ ok: false });
      }
      break;
    }
    
    case 'groupSend': {
      const { groupId, encryptedContent, senderId, id, timestamp } = req.body;
      if (!groupId || !encryptedContent || !groups[groupId]) return res.json({ ok: false });
      
      if (!groupMessages[groupId]) groupMessages[groupId] = [];
      const msgId = id || 'gm_' + Date.now();
      // Store only encrypted content - server can't read messages
      groupMessages[groupId].push({ 
        id: msgId, 
        e: encryptedContent, // encrypted by Sender Keys
        s: hashUsername(senderId || 'anon'), // hashed sender for dedup
        t: timestamp || Date.now() 
      });
      if (groupMessages[groupId].length > 500) groupMessages[groupId] = groupMessages[groupId].slice(-500);
      
      res.json({ ok: true, messageId: msgId });
      break;
    }
    
    case 'groupPoll': {
      const { groupId, since } = req.body;
      if (!groupId || !groups[groupId]) return res.json({ ok: false });
      
      const msgs = (groupMessages[groupId] || []).filter(m => m.t > (since || 0));
      res.json({ ok: true, messages: msgs });
      break;
    }
    
    case 'groupSearch': {
      const q = (req.body.query || '').toLowerCase();
      const results = Object.values(groups)
        .filter(g => g.username?.includes(q))
        .map(g => ({ id: g.id, username: g.username, avatar: g.avatar, memberCount: g.memberCount }));
      res.json({ ok: true, results });
      break;
    }
    
    default:
      res.json({ ok: true, success: true });
  }
});

// ============ SOCIAL NETWORK API ============
const socialPosts = {};       // postId -> post
const socialFollows = {};     // oderId -> Set of following ids
const socialProfiles = {};    // oderId -> profile

app.post('/social', (req, res) => {
  const { action } = req.body;
  
  switch (action) {
    case 'createPost': {
      const { post } = req.body;
      if (!post?.id || !post?.authorId) return res.json({ ok: false, error: 'Invalid post' });
      
      socialPosts[post.id] = { ...post, timestamp: post.timestamp || Date.now() };
      logMessage(`[Social] Post created: ${post.id.slice(0,8)} by ${post.authorId.slice(0,8)}`);
      res.json({ ok: true, postId: post.id });
      break;
    }
    
    case 'toggleLike': {
      const { postId, oderId } = req.body;
      const post = socialPosts[postId];
      if (!post) return res.json({ ok: false, error: 'Post not found' });
      
      if (!post.likes) post.likes = [];
      const idx = post.likes.indexOf(oderId);
      if (idx >= 0) {
        post.likes.splice(idx, 1);
        res.json({ ok: true, liked: false });
      } else {
        post.likes.push(oderId);
        res.json({ ok: true, liked: true });
      }
      break;
    }
    
    case 'addComment': {
      const { postId, comment } = req.body;
      const post = socialPosts[postId];
      if (!post || !comment) return res.json({ ok: false });
      
      if (!post.comments) post.comments = [];
      post.comments.push(comment);
      res.json({ ok: true, commentId: comment.id });
      break;
    }
    
    case 'repost': {
      const { repost, originalPostId } = req.body;
      if (!repost?.id) return res.json({ ok: false });
      
      socialPosts[repost.id] = repost;
      const original = socialPosts[originalPostId];
      if (original) {
        if (!original.reposts) original.reposts = [];
        original.reposts.push(repost.authorId);
      }
      res.json({ ok: true, postId: repost.id });
      break;
    }
    
    case 'toggleFollow': {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) return res.json({ ok: false });
      
      if (!socialFollows[followerId]) socialFollows[followerId] = new Set();
      const set = socialFollows[followerId];
      
      if (set.has(followingId)) {
        set.delete(followingId);
        res.json({ ok: true, following: false });
      } else {
        set.add(followingId);
        res.json({ ok: true, following: true });
      }
      break;
    }
    
    case 'getFeed': {
      const { oderId, offset = 0, limit = 20 } = req.body;
      const following = socialFollows[oderId] || new Set();
      
      const posts = Object.values(socialPosts)
        .filter(p => p.authorId === oderId || following.has(p.authorId))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(offset, offset + limit);
      
      res.json({ ok: true, posts });
      break;
    }
    
    case 'getExplore': {
      const { offset = 0, limit = 20 } = req.body;
      
      const posts = Object.values(socialPosts)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(offset, offset + limit);
      
      res.json({ ok: true, posts });
      break;
    }
    
    case 'getProfile': {
      const { oderId } = req.body;
      const profile = socialProfiles[oderId] || profiles[oderId];
      if (profile) {
        const userPosts = Object.values(socialPosts).filter(p => p.authorId === oderId);
        const followersCount = Object.values(socialFollows).filter(s => s.has(oderId)).length;
        const followingCount = socialFollows[oderId]?.size || 0;
        
        res.json({ 
          ok: true, 
          profile: { 
            ...profile, 
            postsCount: userPosts.length,
            followersCount,
            followingCount
          } 
        });
      } else {
        res.json({ ok: false, error: 'Profile not found' });
      }
      break;
    }
    
    case 'updateProfile': {
      const { profile } = req.body;
      if (!profile?.oderId) return res.json({ ok: false });
      
      socialProfiles[profile.oderId] = { ...socialProfiles[profile.oderId], ...profile };
      res.json({ ok: true });
      break;
    }
    
    case 'deletePost': {
      const { postId, authorId } = req.body;
      const post = socialPosts[postId];
      if (post && post.authorId === authorId) {
        delete socialPosts[postId];
        res.json({ ok: true });
      } else {
        res.json({ ok: false, error: 'Not authorized' });
      }
      break;
    }
    
    default:
      res.json({ ok: false, error: 'Unknown action' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    peers: Object.keys(activePeers).length,
    profiles: Object.keys(profiles).length,
    mailboxes: mailboxes.size,
    groups: Object.keys(groups).length,
    socialPosts: Object.keys(socialPosts).length,
    uptime: process.uptime()
  });
});

// ============ ZERO-KNOWLEDGE API ============
const zkMailboxes = new Map();
const anonCredentials = new Map();
const POW_DIFFICULTY = 26; // Production hardened

// Adaptive PoW difficulty based on server load
function getAdaptiveDifficulty() {
  const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
  if (memUsage > 0.8) return 26;
  if (memUsage > 0.5) return 24;
  return 22;
}

// Verify Proof-of-Work
function verifyProofOfWork(data, nonce, difficulty = POW_DIFFICULTY) {
  const combined = data + nonce.toString();
  const hash = nacl.hash(Buffer.from(combined));
  
  let zeroBits = 0;
  for (const byte of hash) {
    if (byte === 0) { zeroBits += 8; }
    else {
      zeroBits += Math.clz32(byte) - 24;
      break;
    }
    if (zeroBits >= difficulty) return true;
  }
  return zeroBits >= difficulty;
}

// Verify ZK Envelope
function verifyZKEnvelope(envelope) {
  if (!envelope || envelope.v !== 2) return false;
  
  // Check timestamp (5 min window)
  const now = Date.now();
  if (Math.abs(now - envelope.ts) > 5 * 60 * 1000) return false;
  
  // Verify PoW
  const powData = `${envelope.mid}:${envelope.ts}`;
  return verifyProofOfWork(powData, envelope.pow?.n);
}

// ZK Send - relay doesn't know sender
app.post('/api/zk/send', rateLimitMiddleware('send'), (req, res) => {
  const { envelope } = req.body;
  
  if (!verifyZKEnvelope(envelope)) {
    return res.json({ ok: false, error: 'Invalid envelope or PoW' });
  }
  
  const { mid, blob, cred } = envelope;
  
  // Optional: verify anonymous credential
  if (cred && !anonCredentials.has(cred)) {
    // Credential not recognized, but still allow (rate limit protects)
  }
  
  if (!zkMailboxes.has(mid)) {
    zkMailboxes.set(mid, { messages: [], lastAccess: Date.now() });
  }
  
  const mb = zkMailboxes.get(mid);
  if (mb.messages.length >= 500) mb.messages.shift();
  
  const msgId = bytesToB64(nacl.randomBytes(16));
  mb.messages.push({ id: msgId, blob, ts: envelope.ts });
  
  logMessage(`[ZK] Message stored for ${mid.slice(0,8)}...`);
  res.json({ ok: true, id: msgId });
});

// ZK Poll - relay doesn't know who is polling (only mailbox ID)
app.post('/api/zk/poll', rateLimitMiddleware('poll'), (req, res) => {
  const { mailboxId, pow } = req.body;
  
  if (!mailboxId || !pow) {
    return res.json({ ok: false, error: 'Missing fields' });
  }
  
  // Verify PoW for poll (lighter difficulty)
  const powData = `poll:${mailboxId}:${Math.floor(Date.now() / 60000)}`; // 1 min granularity
  if (!verifyProofOfWork(powData, pow.n, 12)) {
    return res.json({ ok: false, error: 'Invalid PoW' });
  }
  
  const mb = zkMailboxes.get(mailboxId);
  if (!mb) {
    return res.json({ ok: true, messages: [] });
  }
  
  mb.lastAccess = Date.now();
  const messages = mb.messages.map(m => ({ id: m.id, blob: m.blob, ts: m.ts }));
  
  res.json({ ok: true, messages });
});

// ZK Ack - delete messages
app.post('/api/zk/ack', (req, res) => {
  const { mailboxId, ids, pow } = req.body;
  
  if (!mailboxId || !ids || !pow) {
    return res.json({ ok: false, error: 'Missing fields' });
  }
  
  const powData = `ack:${mailboxId}:${ids.join(',')}`;
  if (!verifyProofOfWork(powData, pow.n, 10)) {
    return res.json({ ok: false, error: 'Invalid PoW' });
  }
  
  const mb = zkMailboxes.get(mailboxId);
  if (mb) {
    mb.messages = mb.messages.filter(m => !ids.includes(m.id));
  }
  
  res.json({ ok: true });
});

// Issue anonymous credential
app.post('/api/credentials/issue', rateLimitMiddleware('register'), (req, res) => {
  const { blindedToken, pow } = req.body;
  
  if (!blindedToken || !pow) {
    return res.json({ ok: false, error: 'Missing fields' });
  }
  
  // Require PoW to get credential (prevents spam)
  const powData = `cred:${blindedToken}`;
  if (!verifyProofOfWork(powData, pow.n, 18)) {
    return res.json({ ok: false, error: 'Invalid PoW' });
  }
  
  // Sign the blinded token
  const serverKey = nacl.sign.keyPair.fromSeed(
    nacl.hash(Buffer.from(CRED_SECRET)).slice(0, 32)
  );
  
  const signature = nacl.sign.detached(b64ToBytes(blindedToken), serverKey.secretKey);
  const signedToken = bytesToB64(signature);
  
  anonCredentials.set(blindedToken, { signature: signedToken, issuedAt: Date.now() });
  
  // Cleanup old credentials (older than 7 days)
  const now = Date.now();
  for (const [token, data] of anonCredentials) {
    if (now - data.issuedAt > 7 * 24 * 60 * 60 * 1000) {
      anonCredentials.delete(token);
    }
  }
  
  logMessage(`[ZK] Credential issued`);
  res.json({ ok: true, signature: signedToken });
});

// ZK Health check
app.get('/api/zk/health', (req, res) => {
  res.json({
    ok: true,
    zkMailboxes: zkMailboxes.size,
    credentials: anonCredentials.size,
    powDifficulty: POW_DIFFICULTY
  });
});

// TURN credentials (временные, истекают через 24 часа)
app.get('/api/turn', (req, res) => {
  const ttl = 86400; // 24 часа
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:nodus`;
  
  // HMAC-SHA1 для coturn
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha1', TURN_SECRET);
  hmac.update(username);
  const credential = hmac.digest('base64');
  
  res.json({
    ok: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:194.87.103.193:3478' },
      { 
        urls: 'turn:194.87.103.193:3478',
        username,
        credential
      },
      { 
        urls: 'turn:194.87.103.193:3478?transport=tcp',
        username,
        credential
      }
    ],
    ttl
  });
});

// ============ START ============
const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NODUS Relay v3 running on port ${PORT}`);
  console.log(`   - Legacy API: /relay`);
  console.log(`   - Blind API: /api/*`);
  console.log(`   - Zero-Knowledge API: /api/zk/*`);
  console.log(`   - WebSocket: ws://localhost:${PORT}`);
});
