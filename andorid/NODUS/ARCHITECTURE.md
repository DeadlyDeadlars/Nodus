# NODUS - Zero-Access Secure Messenger

## Architecture Overview

NODUS is a secure messenger with **provably zero-access architecture**. The server cannot read messages, cannot identify users, and cannot recover keys.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │   UI    │──│ Messaging │──│ Transport│──│ Zero-Knowledge  │ │
│  │ (React) │  │  Service  │  │  Layer   │  │     Relay       │ │
│  └─────────┘  └───────────┘  └──────────┘  └─────────────────┘ │
│       │             │              │                            │
│       │      ┌──────┴──────┐       │                            │
│       │      │   Crypto    │       │                            │
│       │      │   Layer     │       │                            │
│       │      └─────────────┘       │                            │
│       │             │              │                            │
│       └─────────────┼──────────────┘                            │
│                     │                                            │
│              ┌──────┴──────┐                                     │
│              │   Secure    │                                     │
│              │   Storage   │                                     │
│              └─────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Security Model

### Key Principles

1. **Client-Side Key Generation**: All cryptographic keys are generated on the client device. The server NEVER participates in key generation or exchange.

2. **Zero-Knowledge Relay**: The relay server is a "dumb pipe" that:
   - Cannot decrypt message content
   - Cannot identify sender or receiver
   - Cannot link messages to users
   - Cannot recover user keys

3. **End-to-End Encryption**: All messages are encrypted before leaving the device using:
   - X25519 for key exchange
   - HKDF for key derivation
   - XSalsa20-Poly1305 for symmetric encryption (ChaCha20-Poly1305 equivalent)

### Cryptographic Primitives

| Function | Algorithm | Library |
|----------|-----------|---------|
| Identity Key | X25519 | tweetnacl |
| Key Exchange | X25519 ECDH | tweetnacl |
| Key Derivation | HKDF-SHA512 | custom impl |
| Symmetric Encryption | XSalsa20-Poly1305 | tweetnacl |
| Signatures | Ed25519 | tweetnacl |
| Hashing | SHA-512 | tweetnacl |

### Identity Model

```
user_id = hex(SHA512(identity_public_key)[0:16])
```

- Identity key pair generated on first app launch
- Private key stored encrypted in device Keychain
- Public key shared for establishing sessions

### Session Establishment

```
shared_secret = X25519(my_secret_key, peer_public_key)
session_keys = HKDF(shared_secret, "nodus:session:<peer_id>")
```

### Message Format

```json
{
  "from": "user_id",
  "to": "user_id", 
  "payload": "<encrypted_blob>",
  "timestamp": 1704412800000,
  "nonce": "<random_16_bytes>"
}
```

The `payload` is encrypted with session keys. The relay only sees:
- `mailboxId` (derived from user_id, rotates every 24h)
- `blob` (encrypted envelope)

## Threat Model

### What We Protect Against

| Threat | Protection |
|--------|------------|
| Server compromise | Zero-knowledge architecture - server has no keys |
| Network eavesdropping | E2EE with forward secrecy ready |
| Metadata analysis | Mailbox ID rotation, no sender info in transport |
| Key theft | Keys encrypted at rest, Keychain storage |
| Replay attacks | Nonce + timestamp validation |
| Man-in-the-middle | Key verification via fingerprints |

### What We Don't Protect Against (Yet)

| Threat | Future Solution |
|--------|-----------------|
| Device compromise | Secure enclave integration |
| Traffic analysis | Sealed Sender |
| Forward secrecy | Double Ratchet |
| Group key compromise | MLS protocol |

## Why Keys Cannot Be Recovered

1. **No Server Storage**: Private keys are never sent to the server
2. **No Key Escrow**: No backup mechanism that could leak keys
3. **No Recovery**: If device is lost, keys are lost (by design)
4. **No Backdoors**: Open source, auditable code

### Proof of Zero-Access

```
Server receives: { mailboxId, blob }

mailboxId = hash(user_id + epoch)  // Cannot reverse to user_id
blob = encrypt(envelope, derived_key)  // Cannot decrypt without user's key

Server CANNOT:
- Derive user_id from mailboxId
- Decrypt blob without session key
- Session key requires user's private key
- Private key never leaves device
∴ Server has zero access to content
```

## Directory Structure

```
src/
├── core/
│   ├── crypto/           # Cryptographic primitives
│   │   ├── types.ts
│   │   ├── CryptoProvider.ts
│   │   ├── NaClCryptoProvider.ts
│   │   ├── IdentityService.ts
│   │   └── SessionManager.ts
│   ├── transport/        # Network layer
│   │   ├── types.ts
│   │   ├── ITransport.ts
│   │   └── RelayTransport.ts
│   ├── messaging/        # Message handling
│   │   ├── types.ts
│   │   └── MessageService.ts
│   ├── storage/          # Secure storage
│   │   └── SecureStorage.ts
│   └── index.ts          # Core initialization
├── services/             # Legacy (being migrated)
├── screens/              # UI screens
└── components/           # UI components
```

## Usage

### Initialize Core

```typescript
import { initializeCore } from './core';

const core = await initializeCore({
  relayUrls: ['https://relay1.nodus.network', 'https://relay2.nodus.network'],
});

await core.start();
```

### Send Message

```typescript
await core.sendMessage(
  recipientUserId,
  recipientPublicKey,
  'Hello, secure world!'
);
```

### Receive Messages

```typescript
core.onMessage((message) => {
  console.log(`From: ${message.from}`);
  console.log(`Content: ${message.content}`);
});
```

## Comparison with Telegram

| Feature | NODUS | Telegram |
|---------|-------|----------|
| E2EE by default | ✅ Yes | ❌ No (opt-in) |
| Server key access | ❌ Never | ✅ Has keys for cloud chats |
| Key generation | Client only | Server-assisted |
| Protocol | X25519 + HKDF | MTProto |
| Open source client | ✅ Yes | ✅ Yes |
| Open source server | ✅ Yes | ❌ No |
| Zero-knowledge | ✅ Provable | ❌ No |

## Roadmap

### Phase 1 (Current) ✅
- [x] X25519 key exchange
- [x] HKDF key derivation
- [x] XSalsa20-Poly1305 encryption
- [x] Zero-knowledge relay
- [x] Basic messaging

### Phase 2 (Next)
- [ ] Double Ratchet for forward secrecy
- [ ] Prekey bundles for async messaging
- [ ] Key verification UI

### Phase 3 (Future)
- [ ] Sealed Sender (hide sender from relay)
- [ ] MLS for group messaging
- [ ] Multi-device sync

## Building

```bash
# Install dependencies
npm install

# Start Metro
npm start

# Build Android
npm run android

# Build release
npm run build:android
```

## Testing

```bash
# Run tests
npm test

# Test crypto layer
npm test -- --grep crypto
```

## License

MIT
