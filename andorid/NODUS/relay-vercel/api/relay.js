// In-memory storage (resets on cold start, but works for testing)
const store = {
  users: {},      // fingerprint -> { profile, chats, lastSeen }
  groups: {},     // groupId -> { messages: [], members: [] }
  calls: {},      // peerId -> [events]
  presence: {},   // peerId -> timestamp
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const action = req.query.action;
  const body = req.body || {};
  
  try {
    switch (action) {
      case 'ping':
        return res.json({ ok: true, time: Date.now() });
        
      case 'heartbeat':
        if (body.peerId) store.presence[body.peerId] = Date.now();
        return res.json({ ok: true });
        
      case 'presenceGet': {
        const peerIds = body.peerIds || [];
        const now = Date.now();
        const result = {};
        for (const id of peerIds) {
          const last = store.presence[id] || 0;
          result[id] = now - last < 60000; // online if seen in last 60s
        }
        return res.json(result);
      }
      
      case 'saveProfile':
        if (body.fingerprint) {
          store.users[body.fingerprint] = { ...store.users[body.fingerprint], ...body };
        }
        return res.json({ ok: true });
        
      case 'getProfile':
        return res.json(store.users[body.fingerprint] || { ok: false });
        
      case 'searchUsers': {
        const q = (body.query || '').toLowerCase();
        const results = Object.values(store.users).filter(u => 
          u.username?.toLowerCase().includes(q) || u.alias?.toLowerCase().includes(q)
        ).slice(0, 20);
        return res.json(results);
      }
      
      case 'saveChats':
        if (body.fingerprint) {
          store.users[body.fingerprint] = { ...store.users[body.fingerprint], chatsToken: body.chatsToken };
        }
        return res.json({ ok: true });
        
      case 'getChats':
        return res.json({ ok: true, chatsToken: store.users[body.fingerprint]?.chatsToken || '' });
        
      case 'groupCreate':
        store.groups[body.groupId] = { messages: [], members: body.members || [], created: Date.now() };
        return res.json({ ok: true });
        
      case 'groupSend': {
        const g = store.groups[body.groupId];
        if (!g) return res.json({ ok: false, error: 'group not found' });
        const msg = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, ...body, timestamp: Date.now() };
        g.messages.push(msg);
        if (g.messages.length > 1000) g.messages = g.messages.slice(-500);
        return res.json({ ok: true, id: msg.id });
      }
      
      case 'groupPoll': {
        const g = store.groups[body.groupId];
        if (!g) return res.json([]);
        const since = body.since || 0;
        return res.json(g.messages.filter(m => m.timestamp > since));
      }
      
      case 'callSend': {
        const to = body.to;
        if (!store.calls[to]) store.calls[to] = [];
        store.calls[to].push({ ...body, timestamp: Date.now() });
        if (store.calls[to].length > 50) store.calls[to] = store.calls[to].slice(-20);
        return res.json({ ok: true });
      }
      
      case 'callPoll': {
        const events = store.calls[body.peerId] || [];
        store.calls[body.peerId] = [];
        return res.json(events);
      }
      
      default:
        return res.json({ ok: false, error: 'unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
