# 🖥️ RELAY SERVER SECURITY UPDATES

## Overview
While the client-side fixes are complete, the relay server needs corresponding updates for full security.

## 📋 Server-Side TODO List

### 🔴 Critical (Required for Production)

#### 1. Adaptive PoW Difficulty
**File:** `relay-server/server.js`

```javascript
let currentDifficulty = 24;
let requestCount = 0;
let lastAdjustment = Date.now();

// Adjust difficulty based on load
setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastAdjustment) / 1000; // seconds
  const requestsPerSecond = requestCount / elapsed;
  
  if (requestsPerSecond > 100) {
    currentDifficulty = Math.min(28, currentDifficulty + 1);
    console.log(`⬆️ Increased PoW difficulty to ${currentDifficulty}`);
  } else if (requestsPerSecond < 10 && currentDifficulty > 20) {
    currentDifficulty = Math.max(20, currentDifficulty - 1);
    console.log(`⬇️ Decreased PoW difficulty to ${currentDifficulty}`);
  }
  
  requestCount = 0;
  lastAdjustment = now;
}, 60000); // Every minute

// In message handler
function verifyPoW(data, nonce, difficulty = currentDifficulty) {
  // ... existing verification code
}
```

#### 2. Rate Limiting per IP/Fingerprint
```javascript
const rateLimit = require('express-rate-limit');

// Per-IP rate limiting
const ipLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-fingerprint rate limiting (for Tor/VPN users)
const fingerprintLimiter = new Map();

function checkFingerprintLimit(fingerprint) {
  const now = Date.now();
  const entry = fingerprintLimiter.get(fingerprint);
  
  if (!entry || now > entry.reset) {
    fingerprintLimiter.set(fingerprint, { count: 1, reset: now + 60000 });
    return true;
  }
  
  entry.count++;
  return entry.count <= 100;
}

app.use('/api', ipLimiter);
```

#### 3. Connection Limits
```javascript
const connections = new Map(); // IP -> count

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  const count = connections.get(ip) || 0;
  
  if (count >= 10) {
    ws.close(1008, 'Too many connections from this IP');
    return;
  }
  
  connections.set(ip, count + 1);
  
  ws.on('close', () => {
    connections.set(ip, (connections.get(ip) || 1) - 1);
  });
});
```

#### 4. Message Size Limits
```javascript
app.use(express.json({ limit: '10mb' }));

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    if (data.length > 10 * 1024 * 1024) { // 10MB
      ws.close(1009, 'Message too large');
      return;
    }
    // ... process message
  });
});
```

---

### 🟡 High Priority (Recommended)

#### 5. Nonce Tracking (Server-Side)
```javascript
const usedNonces = new Map(); // nonce -> expiry

function validateNonce(nonce) {
  const now = Date.now();
  
  // Cleanup old nonces
  if (Math.random() < 0.01) {
    for (const [n, expiry] of usedNonces) {
      if (expiry < now) usedNonces.delete(n);
    }
  }
  
  // Check if used
  if (usedNonces.has(nonce)) {
    const expiry = usedNonces.get(nonce);
    if (expiry > now) return false; // Replay attack
  }
  
  // Mark as used
  usedNonces.set(nonce, now + 120000); // 2 minutes
  return true;
}
```

#### 6. Logging and Monitoring
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log security events
function logSecurityEvent(type, data) {
  logger.warn('SECURITY_EVENT', {
    type,
    timestamp: Date.now(),
    ...data
  });
}

// Examples
logSecurityEvent('REPLAY_ATTACK', { ip, nonce });
logSecurityEvent('INVALID_POW', { ip, difficulty });
logSecurityEvent('RATE_LIMIT', { ip, endpoint });
```

#### 7. DDoS Protection
```javascript
// Use Cloudflare or similar
// Or implement basic protection:

const ddosProtection = new Map(); // IP -> { requests: [], blocked: false }

function checkDDoS(ip) {
  const now = Date.now();
  const entry = ddosProtection.get(ip) || { requests: [], blocked: false };
  
  // Remove old requests
  entry.requests = entry.requests.filter(t => now - t < 10000);
  
  // Check if blocked
  if (entry.blocked && now - entry.blockedAt < 300000) {
    return false; // Still blocked
  }
  
  // Add current request
  entry.requests.push(now);
  
  // Block if > 1000 requests in 10 seconds
  if (entry.requests.length > 1000) {
    entry.blocked = true;
    entry.blockedAt = now;
    logSecurityEvent('DDOS_DETECTED', { ip, requests: entry.requests.length });
    return false;
  }
  
  ddosProtection.set(ip, entry);
  return true;
}
```

---

### 🟢 Medium Priority (Nice to Have)

#### 8. Metrics and Analytics
```javascript
const metrics = {
  totalMessages: 0,
  totalConnections: 0,
  avgPoWTime: 0,
  rejectedMessages: 0,
  activeConnections: 0,
};

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

#### 9. Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: wss.clients.size,
    difficulty: currentDifficulty,
  });
});
```

#### 10. Graceful Shutdown
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  wss.clients.forEach(ws => {
    ws.close(1001, 'Server shutting down');
  });
  
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(0);
  }, 10000);
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Update Node.js to latest LTS
- [ ] Install dependencies: `npm install express-rate-limit winston`
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure firewall rules

### Deployment
- [ ] Deploy to production server
- [ ] Enable HTTPS/WSS
- [ ] Configure reverse proxy (nginx/Cloudflare)
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log rotation

### Post-Deployment
- [ ] Test rate limiting
- [ ] Test PoW verification
- [ ] Monitor logs for attacks
- [ ] Set up alerts for anomalies
- [ ] Document incident response plan

---

## 📊 Monitoring Metrics

### Key Metrics to Track
1. **Requests per second** - Detect DDoS
2. **PoW difficulty** - Ensure adaptive scaling
3. **Rejected messages** - Detect attack attempts
4. **Connection count** - Monitor capacity
5. **Memory usage** - Prevent leaks
6. **Response time** - Ensure performance

### Alert Thresholds
- 🔴 > 1000 req/s from single IP
- 🔴 > 50% messages rejected
- 🟡 > 10,000 active connections
- 🟡 > 80% memory usage
- 🟢 > 1s average response time

---

## 🔒 Security Best Practices

1. **Never log sensitive data** (keys, messages, IPs in plaintext)
2. **Use environment variables** for secrets
3. **Keep dependencies updated** (`npm audit fix`)
4. **Use HTTPS/WSS only** in production
5. **Implement CORS** properly
6. **Validate all inputs** (never trust client)
7. **Use prepared statements** if using database
8. **Implement CSP headers**
9. **Enable HSTS**
10. **Regular security audits**

---

## 🧪 Testing

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test config
cat > load-test.yml <<EOF
config:
  target: 'https://your-relay.com'
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - name: "Send message"
    flow:
      - post:
          url: "/api/send"
          json:
            to: "test"
            message: "test"
EOF

# Run test
artillery run load-test.yml
```

### Security Testing
```bash
# Test rate limiting
for i in {1..200}; do
  curl -X POST https://your-relay.com/api/send
done

# Test PoW verification
curl -X POST https://your-relay.com/api/send \
  -H "Content-Type: application/json" \
  -d '{"pow": "invalid"}'

# Test connection limits
for i in {1..20}; do
  wscat -c wss://your-relay.com &
done
```

---

## 📝 Implementation Priority

1. **Week 1**: Rate limiting + Connection limits
2. **Week 2**: Adaptive PoW + Nonce tracking
3. **Week 3**: Logging + Monitoring
4. **Week 4**: DDoS protection + Testing

---

**Status:** 📋 TODO  
**Priority:** 🔴 Critical  
**Estimated Time:** 2-3 weeks
