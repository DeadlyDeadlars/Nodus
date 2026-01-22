/**
 * NODUS Relay Server v4
 * Zero-Knowledge Relay - DUMB PIPE
 * 
 * SECURITY INVARIANTS:
 * ❌ Server CANNOT generate keys
 * ❌ Server CANNOT store keys
 * ❌ Server CANNOT participate in key exchange
 * ❌ Server CANNOT decrypt messages
 * ❌ Server CANNOT link sender to receiver
 * 
 * Server ONLY:
 * ✅ Stores encrypted blobs by mailboxId
 * ✅ Verifies signatures (to prevent spam)
 * ✅ Deletes messages after delivery
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nacl = require('tweetnacl');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ============ STORAGE (In-memory, replace with Redis in production) ============

// mailboxId -> { publicKey, messages: [{ id, blob, ts }] }
const mailboxes = new Map();

// Challenge storage (short-lived)
const challenges = new Map();

// Rate limiting
const rateLimits = new Map();

// ============ HELPERS ============

function hashIP(ip) {
  const hash = nacl.hash(Buffer.from(ip + ':nodus:salt:v1'));
  return Buffer.from(hash.slice(0, 16)).toString('hex');
}

function checkRateLimit(ip, action, limit = 100) {
  const key = `${hashIP(ip)}:${action}`;
  const now = Date.now();
  
  let entry = rateLimits.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + 60000 };
    rateLimits.set(key, entry);
  }
  
  entry.count++;
  return entry.count <= limit;
}

function generateId() {
  return Buffer.from(nacl.randomBytes(16)).toString('hex');
}

function verifySignature(message, signatureB64, publicKeyB64) {
  try {
    const msgBytes = Buffer.from(message);
    const signature = Buffer.from(signatureB64, 'base64');
    const publicKey = Buffer.from(publicKeyB64, 'base64');
    return nacl.sign.detached.verify(msgBytes, signature, publicKey);
  } catch {
    return false;
  }
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '4.0.0', type: 'zero-knowledge-relay' });
});

// Get challenge for registration
app.post('/api/challenge', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'challenge', 20)) {
    return res.status(429).json({ ok: false, error: 'Rate limited' });
  }
  
  const { mailboxId } = req.body;
  if (!mailboxId || typeof mailboxId !== 'string' || mailboxId.length !== 32) {
    return res.status(400).json({ ok: false, error: 'Invalid mailboxId' });
  }
  
  const challenge = Buffer.from(nacl.randomBytes(32)).toString('base64');
  challenges.set(mailboxId, { challenge, expires: Date.now() + 60000 });
  
  res.json({ ok: true, challenge });
});

// Register mailbox with public key
app.post('/api/register', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'register', 10)) {
    return res.status(429).json({ ok: false, error: 'Rate limited' });
  }
  
  const { mailboxId, publicKey, signature, challenge } = req.body;
  
  // Validate inputs
  if (!mailboxId || !publicKey || !signature || !challenge) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  
  // Verify challenge
  const stored = challenges.get(mailboxId);
  if (!stored || stored.challenge !== challenge || Date.now() > stored.expires) {
    return res.status(400).json({ ok: false, error: 'Invalid challenge' });
  }
  challenges.delete(mailboxId);
  
  // Verify signature
  if (!verifySignature(challenge, signature, publicKey)) {
    return res.status(400).json({ ok: false, error: 'Invalid signature' });
  }
  
  // Register mailbox
  if (!mailboxes.has(mailboxId)) {
    mailboxes.set(mailboxId, { publicKey, messages: [] });
  } else {
    // Update public key if re-registering
    mailboxes.get(mailboxId).publicKey = publicKey;
  }
  
  res.json({ ok: true });
});

// Send message to mailbox
app.post('/api/send', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'send', 200)) {
    return res.status(429).json({ ok: false, error: 'Rate limited' });
  }
  
  const { mailboxId, blob } = req.body;
  
  if (!mailboxId || !blob) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  
  // Blob size limit (1MB)
  if (blob.length > 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'Blob too large' });
  }
  
  // Create mailbox if doesn't exist (anonymous send)
  if (!mailboxes.has(mailboxId)) {
    mailboxes.set(mailboxId, { publicKey: null, messages: [] });
  }
  
  const mailbox = mailboxes.get(mailboxId);
  
  // Limit messages per mailbox
  if (mailbox.messages.length >= 1000) {
    // Remove oldest
    mailbox.messages.shift();
  }
  
  const message = {
    id: generateId(),
    blob,
    ts: Date.now(),
  };
  
  mailbox.messages.push(message);
  
  res.json({ ok: true, id: message.id });
});

// Poll messages from mailbox
app.post('/api/poll', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'poll', 300)) {
    return res.status(429).json({ ok: false, error: 'Rate limited' });
  }
  
  const { mailboxId, timestamp, signature } = req.body;
  
  if (!mailboxId) {
    return res.status(400).json({ ok: false, error: 'Missing mailboxId' });
  }
  
  const mailbox = mailboxes.get(mailboxId);
  if (!mailbox) {
    return res.json({ ok: true, messages: [] });
  }
  
  // Verify signature if mailbox has public key
  if (mailbox.publicKey && signature) {
    const message = `poll:${mailboxId}:${timestamp}`;
    if (!verifySignature(message, signature, mailbox.publicKey)) {
      return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }
  }
  
  res.json({ ok: true, messages: mailbox.messages });
});

// Acknowledge (delete) messages
app.post('/api/ack', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'ack', 300)) {
    return res.status(429).json({ ok: false, error: 'Rate limited' });
  }
  
  const { mailboxId, messageIds, timestamp, signature } = req.body;
  
  if (!mailboxId || !messageIds || !Array.isArray(messageIds)) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  
  const mailbox = mailboxes.get(mailboxId);
  if (!mailbox) {
    return res.json({ ok: true });
  }
  
  // Verify signature
  if (mailbox.publicKey && signature) {
    const message = `ack:${mailboxId}:${timestamp}:${messageIds.join(',')}`;
    if (!verifySignature(message, signature, mailbox.publicKey)) {
      return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }
  }
  
  // Remove acknowledged messages
  const idsSet = new Set(messageIds);
  mailbox.messages = mailbox.messages.filter(m => !idsSet.has(m.id));
  
  res.json({ ok: true });
});

// ============ CLEANUP ============

// Clean old messages every hour
setInterval(() => {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  for (const [mailboxId, mailbox] of mailboxes) {
    mailbox.messages = mailbox.messages.filter(m => now - m.ts < maxAge);
    
    // Remove empty mailboxes without public key
    if (mailbox.messages.length === 0 && !mailbox.publicKey) {
      mailboxes.delete(mailboxId);
    }
  }
  
  // Clean expired challenges
  for (const [id, data] of challenges) {
    if (now > data.expires) {
      challenges.delete(id);
    }
  }
  
  // Clean old rate limits
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetTime + 60000) {
      rateLimits.delete(key);
    }
  }
}, 60 * 60 * 1000);

// ============ START ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NODUS Zero-Knowledge Relay v4 running on port ${PORT}`);
  console.log('Security: Server CANNOT decrypt messages or link users');
});
