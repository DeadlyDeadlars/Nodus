# NODUS MVP Architecture

## Infrastructure

| Resource | Address | Port | Purpose |
|----------|---------|------|---------|
| VPS | 194.87.103.193 | 3000 | Relay (WebSocket) |
| VPS | 194.87.103.193 | 3001 | Bootstrap + Signaling |
| Hosting | bibliotekaznanyi.online | 443 | Backend API |

## Directory Structure

```
server/
├── vps/                    # VPS 194.87.103.193
│   ├── relay.js           # Zero-knowledge relay (port 3000)
│   └── bootstrap.js       # Bootstrap + Signaling (port 3001)
│
└── backend/               # bibliotekaznanyi.online
    └── api.php            # Feed, Push, Discovery

src/core/
├── crypto/
│   ├── keys.ts            # Key generation (X25519)
│   ├── encrypt.ts         # XSalsa20-Poly1305
│   └── session.ts         # Session key derivation (HKDF)
│
├── transport/
│   ├── relay.ts           # Relay client
│   ├── p2p.ts             # WebRTC P2P
│   └── hybrid.ts          # P2P-first, relay fallback
│
├── messaging/
│   └── e2ee.ts            # E2EE message handling
│
└── storage/
    └── secure.ts          # Encrypted local storage
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native Client                      │
├─────────────────────────────────────────────────────────────┤
│  src/core/                                                   │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ crypto/ │→ │ messaging/│→ │transport/│→ │   storage/  │ │
│  └─────────┘  └───────────┘  └──────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                           │
         │ HTTPS                     │ WebSocket/WebRTC
         ▼                           ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│ Backend API         │    │ VPS 194.87.103.193              │
│ bibliotekaznanyi.   │    │ ┌─────────────┐ ┌────────────┐ │
│ online              │    │ │ Relay:3000  │ │Bootstrap   │ │
│                     │    │ │ (messages)  │ │+Signaling  │ │
│ - Feed              │    │ └─────────────┘ │:3001       │ │
│ - Push              │    │                 └────────────┘ │
│ - Discovery         │    └─────────────────────────────────┘
└─────────────────────┘
```

## Security Model

- All keys generated on client only
- Server stores only encrypted blobs
- No plaintext logs
- TTL cleanup (24-48h)
- Signature verification for spam prevention
