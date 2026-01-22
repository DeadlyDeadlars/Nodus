# 🛡️ NODUS SECURITY FEATURES - QUICK REFERENCE

## 🔐 Cryptographic Primitives

| Feature | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| Encryption | XSalsa20-Poly1305 | 256-bit | NaCl secretbox |
| Key Exchange | X25519 (ECDH) | 256-bit | Curve25519 |
| Signatures | Ed25519 | 256-bit | EdDSA |
| Hashing | SHA-512 | 512-bit | For KDF and fingerprints |
| Password KDF | Argon2id | 256-bit | 64MB memory, 3 iterations |

## 🔑 Key Management

### Storage Locations
- **Device Key**: Hardware Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
- **User Keypair**: Keychain with hardware security level
- **Group Keys**: Encrypted MMKV (encrypted with device key)
- **Session Keys**: Memory only (wiped after use)

### Key Rotation
- **User Keys**: Every 30 days (automatic)
- **Group Keys**: Every 100 messages OR 7 days
- **Old Keys**: Last 3 generations kept for decryption

## 🛡️ Attack Mitigations

| Attack Type | Mitigation | Implementation |
|-------------|------------|----------------|
| Replay Attack | Persistent nonces | 60s window, stored across restarts |
| MITM | SSL Pinning + TOFU | Mandatory in production |
| Traffic Analysis | Adaptive dummy traffic | 10-70% dummy messages |
| Brute Force | Argon2id + PoW | 64MB memory-hard + 24-bit PoW |
| Key Compromise | Forward secrecy | Automatic rotation |
| Memory Forensics | Secure wiping | Overwrite with random + zeros |
| DoS/Spam | PoW + Rate limiting | 24-bit PoW + 60 msg/min |
| Root/Debug | Environment checks | Block in production |

## 📊 Security Levels

### Message Security
```
┌─────────────────────────────────────┐
│ Layer 1: E2E Encryption (X25519)    │
│ Layer 2: Envelope Encryption        │
│ Layer 3: Relay Encryption (Blind)   │
│ Layer 4: TLS 1.3 (SSL Pinned)       │
└─────────────────────────────────────┘
```

### Metadata Protection
- ✅ Sender/receiver hidden from relay (blind routing)
- ✅ Message size hidden (fixed blocks: 256, 512, 1024, 2048 bytes)
- ✅ Timing hidden (random delays + dummy traffic)
- ✅ Group membership hidden (anonymous mailboxes)

## 🔒 Trust Model

### TOFU (Trust On First Use)
1. First contact → Automatically pin key
2. Key change → Show warning, require verification
3. Verified → Mark as trusted (green checkmark)

### Verification Methods
- **Safety Numbers**: 60-digit number (Signal-style)
- **QR Codes**: Scan to verify in person
- **Emoji Fingerprint**: 8 emojis for quick visual check
- **Color Fingerprint**: 8 colors for accessibility

## ⚡ Performance Impact

| Feature | CPU Impact | Memory Impact | Network Impact |
|---------|------------|---------------|----------------|
| Argon2id | ~100ms | 64MB | None |
| PoW (24-bit) | ~10s | Minimal | None |
| Dummy Traffic | Minimal | Minimal | +10-30% |
| Nonce Storage | Minimal | ~10KB | None |
| Key Rotation | Minimal | +1KB/group | Minimal |

## 🚨 Security Warnings

### Critical (Block App)
- ❌ Debugger detected (production)
- ❌ Device rooted/jailbroken (production)
- ❌ SSL pinning unavailable (production)

### High (Show Warning)
- ⚠️ Contact key changed
- ⚠️ Keychain unavailable
- ⚠️ Unverified contact

### Medium (Log Only)
- ℹ️ Development mode
- ℹ️ Fallback to SHA-512 KDF
- ℹ️ Bootstrap node failed

## 🔧 Configuration

### Adjustable Parameters

```typescript
// src/config.ts
BOOTSTRAP_NODES: string[]           // Add more for redundancy
BOOTSTRAP_ROTATION_INTERVAL: number // Default: 1 hour

// src/services/zkRelay.ts
POW_DIFFICULTY: number              // Default: 24 bits

// src/services/groupCrypto.ts
KEY_ROTATION_INTERVAL: number       // Default: 100 messages
KEY_MAX_AGE: number                 // Default: 7 days

// src/utils/rateLimiter.ts
RateLimits.SEND_MESSAGE: number     // Default: 60/min

// src/utils/metadataProtection.ts
BLOCK_SIZES: number[]               // Default: [256, 512, 1024, 2048]
```

## 📱 Platform-Specific

### Android
- **Keystore**: Hardware-backed (TEE/StrongBox)
- **Root Detection**: Native module + checks
- **SSL Pinning**: Network Security Config

### iOS
- **Keychain**: Secure Enclave (SEP)
- **Jailbreak Detection**: File system checks
- **SSL Pinning**: NSURLSession pinning

## 🧪 Testing Commands

```bash
# Security audit
npm run test:security

# Check for hardcoded secrets
grep -r "sk_" src/
grep -r "password" src/

# Verify SSL pins
openssl s_client -connect relay.com:443 | openssl x509 -pubkey

# Test rate limiting
for i in {1..100}; do curl -X POST ...; done

# Memory leak check
npm run test:memory
```

## 📚 References

- [NaCl Crypto Library](https://nacl.cr.yp.to/)
- [Signal Protocol](https://signal.org/docs/)
- [Argon2 Spec](https://github.com/P-H-C/phc-winner-argon2)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

---

**Last Updated:** 2026-01-03  
**Security Version:** 1.0.0  
**Audit Status:** ✅ Ready for Review
