// Bootstrap нода сервер
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

class BootstrapNode {
  constructor(port = 8080) {
    this.port = port;
    this.peers = new Map(); // peerId -> { ws, lastSeen, info }
    this.app = express();
    this.wss = new WebSocket.Server({ port: this.port + 1 });
    
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupRoutes() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        peers: this.peers.size,
        uptime: process.uptime()
      });
    });
    
    // Получить список активных пиров
    this.app.get('/peers', (req, res) => {
      const activePeers = Array.from(this.peers.entries())
        .filter(([_, peer]) => Date.now() - peer.lastSeen < 60000)
        .map(([peerId, peer]) => ({
          peerId,
          role: peer.info?.role || 'client',
          lastSeen: peer.lastSeen
        }));
      
      res.json({ peers: activePeers, total: activePeers.length });
    });

    // Регистрация пира через HTTP (fallback)
    this.app.post('/register', (req, res) => {
      const { peerId, info } = req.body;
      
      if (!peerId) {
        return res.status(400).json({ error: 'peerId required' });
      }
      
      this.peers.set(peerId, {
        lastSeen: Date.now(),
        info: info || {},
        ws: null
      });
      
      console.log(`Peer registered via HTTP: ${peerId} (${info?.role || 'client'})`);
      res.json({ success: true, peerId });
    });

    // Поиск пира
    this.app.post('/find', (req, res) => {
      const { peerId } = req.body;
      const peer = this.peers.get(peerId);
      
      if (peer && Date.now() - peer.lastSeen < 60000) {
        res.json({ 
          found: true, 
          peer: {
            peerId,
            role: peer.info?.role || 'client',
            lastSeen: peer.lastSeen
          }
        });
      } else {
        res.json({ found: false });
      }
    });

    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`Bootstrap node HTTP server running on port ${this.port}`);
      console.log(`Bootstrap node WebSocket server running on port ${this.port + 1}`);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      let peerId = null;
      const clientIP = req.socket.remoteAddress;
      
      console.log(`New WebSocket connection from ${clientIP}`);

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          switch (msg.type) {
            case 'register':
              peerId = msg.peerId;
              this.peers.set(peerId, {
                ws,
                lastSeen: Date.now(),
                info: msg.info || {}
              });
              
              console.log(`Peer registered: ${peerId} (${msg.info?.role || 'client'})`);
              ws.send(JSON.stringify({ 
                type: 'registered', 
                peerId,
                bootstrapId: 'bootstrap_' + Date.now()
              }));
              break;

            case 'findPeer':
              const targetPeer = this.peers.get(msg.targetPeerId);
              if (targetPeer && targetPeer.ws && targetPeer.ws.readyState === WebSocket.OPEN) {
                // Передаем сигнал для WebRTC
                targetPeer.ws.send(JSON.stringify({
                  type: 'peerSignal',
                  fromPeerId: peerId,
                  signal: msg.signal
                }));
                
                console.log(`Relaying signal from ${peerId} to ${msg.targetPeerId}`);
              } else {
                ws.send(JSON.stringify({
                  type: 'peerNotFound',
                  targetPeerId: msg.targetPeerId
                }));
              }
              break;

            case 'heartbeat':
              if (peerId && this.peers.has(peerId)) {
                this.peers.get(peerId).lastSeen = Date.now();
                ws.send(JSON.stringify({ type: 'heartbeatAck' }));
              }
              break;

            case 'getPeers':
              const activePeers = Array.from(this.peers.entries())
                .filter(([_, peer]) => Date.now() - peer.lastSeen < 60000)
                .map(([id, peer]) => ({
                  peerId: id,
                  role: peer.info?.role || 'client'
                }));
              
              ws.send(JSON.stringify({
                type: 'peersList',
                peers: activePeers
              }));
              break;
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        if (peerId) {
          console.log(`Peer disconnected: ${peerId}`);
          this.peers.delete(peerId);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  // Очистка неактивных пиров
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [peerId, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > 120000) { // 2 минуты
          this.peers.delete(peerId);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} inactive peers. Active peers: ${this.peers.size}`);
      }
    }, 60000); // Каждую минуту
  }

  // Статистика
  getStats() {
    const now = Date.now();
    const activePeers = Array.from(this.peers.values())
      .filter(peer => now - peer.lastSeen < 60000);
    
    const roleStats = {};
    activePeers.forEach(peer => {
      const role = peer.info?.role || 'client';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    return {
      totalPeers: this.peers.size,
      activePeers: activePeers.length,
      roleDistribution: roleStats,
      uptime: process.uptime()
    };
  }
}

// Запуск
const port = process.env.PORT || 8080;
const bootstrap = new BootstrapNode(port);
bootstrap.startCleanup();

// Логирование статистики каждые 5 минут
setInterval(() => {
  const stats = bootstrap.getStats();
  console.log('Bootstrap stats:', stats);
}, 300000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down bootstrap node...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down bootstrap node...');
  process.exit(0);
});
