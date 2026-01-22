/**
 * NODUS Bootstrap + Signaling Server
 * VPS: 194.87.103.193:3001
 * 
 * - Bootstrap: Discovery of online peers
 * - Signaling: WebRTC SDP/ICE exchange for calls
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Online peers: peerId -> { ws, capabilities, lastSeen }
const peers = new Map();

// Pending signals: peerId -> [{ from, type, data }]
const signals = new Map();

// ============ REST API (Bootstrap) ============

app.get('/health', (_, res) => res.json({ ok: true, service: 'bootstrap+signaling' }));

// POST /bootstrap/register - Register peer online
app.post('/bootstrap/register', (req, res) => {
  const { peer_id, capabilities } = req.body;
  if (!peer_id) return res.status(400).json({ error: 'missing_peer_id' });
  
  const existing = peers.get(peer_id);
  if (existing) {
    existing.capabilities = capabilities || {};
    existing.lastSeen = Date.now();
  } else {
    peers.set(peer_id, { ws: null, capabilities: capabilities || {}, lastSeen: Date.now() });
  }
  
  res.json({ ok: true });
});

// POST /bootstrap/discover - Get online peers
app.post('/bootstrap/discover', (req, res) => {
  const { peer_ids } = req.body; // Optional filter
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 min
  
  const online = [];
  for (const [id, p] of peers) {
    if (now - p.lastSeen > timeout) {
      peers.delete(id);
      continue;
    }
    if (!peer_ids || peer_ids.includes(id)) {
      online.push({ peer_id: id, capabilities: p.capabilities });
    }
  }
  
  res.json({ ok: true, peers: online });
});

// POST /bootstrap/heartbeat - Keep alive
app.post('/bootstrap/heartbeat', (req, res) => {
  const { peer_id } = req.body;
  if (!peer_id) return res.status(400).json({ error: 'missing_peer_id' });
  
  const p = peers.get(peer_id);
  if (p) p.lastSeen = Date.now();
  
  res.json({ ok: true });
});

// ============ WebSocket (Signaling) ============

wss.on('connection', (ws) => {
  let peerId = null;
  
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      
      switch (msg.type) {
        case 'register':
          peerId = msg.peer_id;
          const existing = peers.get(peerId);
          if (existing) {
            existing.ws = ws;
            existing.lastSeen = Date.now();
          } else {
            peers.set(peerId, { ws, capabilities: msg.capabilities || {}, lastSeen: Date.now() });
          }
          
          // Send pending signals
          const pending = signals.get(peerId) || [];
          pending.forEach(s => ws.send(JSON.stringify(s)));
          signals.delete(peerId);
          
          ws.send(JSON.stringify({ type: 'registered', peer_id: peerId }));
          break;
          
        case 'signal':
          // Forward SDP/ICE to target peer
          const target = peers.get(msg.to);
          const signalData = { type: 'signal', from: peerId, signal_type: msg.signal_type, data: msg.data };
          
          if (target?.ws?.readyState === 1) {
            target.ws.send(JSON.stringify(signalData));
          } else {
            // Queue for later
            if (!signals.has(msg.to)) signals.set(msg.to, []);
            signals.get(msg.to).push(signalData);
            // Limit queue
            if (signals.get(msg.to).length > 50) signals.get(msg.to).shift();
          }
          break;
          
        case 'heartbeat':
          if (peerId) {
            const p = peers.get(peerId);
            if (p) p.lastSeen = Date.now();
          }
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (e) {
      console.error('WS error:', e.message);
    }
  });
  
  ws.on('close', () => {
    if (peerId) {
      const p = peers.get(peerId);
      if (p) p.ws = null;
    }
  });
});

// Cleanup stale peers every minute
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000;
  for (const [id, p] of peers) {
    if (now - p.lastSeen > timeout) peers.delete(id);
  }
  // Cleanup old signals
  for (const [id, s] of signals) {
    if (s.length === 0 || !peers.has(id)) signals.delete(id);
  }
}, 60000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Bootstrap+Signaling running on :${PORT}`));
