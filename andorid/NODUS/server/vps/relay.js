/**
 * NODUS Relay Server - Zero-Knowledge Message Relay
 * VPS: 194.87.103.193:3000
 * 
 * SECURITY: Server CANNOT decrypt messages or link users
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Redis for TTL storage (24-48h)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const TTL = 48 * 60 * 60; // 48 hours

// Rate limiting (in-memory)
const rates = new Map();
const rateLimit = (ip, limit = 100) => {
  const key = ip;
  const now = Date.now();
  let r = rates.get(key);
  if (!r || now > r.reset) r = { count: 0, reset: now + 60000 };
  rates.set(key, r);
  return ++r.count <= limit;
};

// Health
app.get('/health', (_, res) => res.json({ ok: true, service: 'relay' }));

// POST /relay/send - Send encrypted message
app.post('/relay/send', async (req, res) => {
  if (!rateLimit(req.ip, 200)) return res.status(429).json({ error: 'rate_limit' });
  
  const { to, payload, nonce } = req.body;
  if (!to || !payload) return res.status(400).json({ error: 'missing_fields' });
  if (payload.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'payload_too_large' });
  
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const msg = JSON.stringify({ id, payload, nonce, ts: Date.now() });
  
  await redis.lpush(`inbox:${to}`, msg);
  await redis.ltrim(`inbox:${to}`, 0, 999); // Max 1000 messages
  await redis.expire(`inbox:${to}`, TTL);
  
  res.json({ ok: true, id });
});

// POST /relay/fetch - Fetch messages for user
app.post('/relay/fetch', async (req, res) => {
  if (!rateLimit(req.ip, 300)) return res.status(429).json({ error: 'rate_limit' });
  
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'missing_user_id' });
  
  const raw = await redis.lrange(`inbox:${user_id}`, 0, -1);
  const messages = raw.map(r => JSON.parse(r));
  
  res.json({ ok: true, messages });
});

// POST /relay/ack - Acknowledge (delete) messages
app.post('/relay/ack', async (req, res) => {
  if (!rateLimit(req.ip, 300)) return res.status(429).json({ error: 'rate_limit' });
  
  const { user_id, message_ids } = req.body;
  if (!user_id || !message_ids?.length) return res.status(400).json({ error: 'missing_fields' });
  
  // Remove acknowledged messages
  const raw = await redis.lrange(`inbox:${user_id}`, 0, -1);
  const idsSet = new Set(message_ids);
  const remaining = raw.filter(r => !idsSet.has(JSON.parse(r).id));
  
  await redis.del(`inbox:${user_id}`);
  if (remaining.length) {
    await redis.rpush(`inbox:${user_id}`, ...remaining);
    await redis.expire(`inbox:${user_id}`, TTL);
  }
  
  res.json({ ok: true });
});

// POST /media/upload - Chunked media upload
app.post('/media/upload', async (req, res) => {
  if (!rateLimit(req.ip, 50)) return res.status(429).json({ error: 'rate_limit' });
  
  const { media_id, chunk_index, chunk_data, total_chunks } = req.body;
  if (!media_id || chunk_index === undefined || !chunk_data) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  
  await redis.hset(`media:${media_id}`, chunk_index.toString(), chunk_data);
  await redis.hset(`media:${media_id}`, 'total', total_chunks.toString());
  await redis.expire(`media:${media_id}`, TTL);
  
  res.json({ ok: true, chunk_index });
});

// GET /media/fetch/:media_id - Fetch media chunks
app.get('/media/fetch/:media_id', async (req, res) => {
  if (!rateLimit(req.ip, 100)) return res.status(429).json({ error: 'rate_limit' });
  
  const data = await redis.hgetall(`media:${req.params.media_id}`);
  if (!data || !data.total) return res.status(404).json({ error: 'not_found' });
  
  const total = parseInt(data.total);
  const chunks = [];
  for (let i = 0; i < total; i++) {
    chunks.push(data[i.toString()] || null);
  }
  
  res.json({ ok: true, chunks, total });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Relay running on :${PORT}`));
