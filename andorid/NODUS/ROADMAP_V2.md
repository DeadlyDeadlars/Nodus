# NODUS Development Roadmap

## Current State: v2.0.0 - Zero-Access Foundation

### Completed ✅

#### Core Architecture
- [x] Layered architecture (crypto/transport/messaging/storage)
- [x] CryptoProvider abstraction for swappable implementations
- [x] Zero-knowledge relay design
- [x] Client-side key generation only

#### Cryptography
- [x] X25519 key exchange (ECDH)
- [x] HKDF key derivation
- [x] XSalsa20-Poly1305 encryption
- [x] Ed25519 signatures
- [x] Secure random generation

#### Security
- [x] Keys never leave device
- [x] Encrypted storage (Keychain + MMKV)
- [x] Mailbox ID rotation (24h)
- [x] Rate limiting on relay
- [x] Signature verification

---

## Phase 2: Forward Secrecy (v2.1.0)

**Goal**: Implement Double Ratchet for forward secrecy

### Tasks

#### Double Ratchet Implementation
- [ ] Symmetric ratchet (chain keys)
- [ ] DH ratchet (new key pairs)
- [ ] Message keys derivation
- [ ] Out-of-order message handling
- [ ] Skipped message keys storage

#### Prekey Bundles
- [ ] One-time prekeys generation
- [ ] Signed prekeys
- [ ] Prekey bundle upload to relay
- [ ] Prekey bundle retrieval
- [ ] Session initialization from bundle

#### Key Verification
- [ ] Safety numbers generation
- [ ] QR code verification
- [ ] Manual fingerprint comparison
- [ ] Key change notifications

### Extension Points (Already Prepared)
```typescript
// src/core/crypto/types.ts
export interface RatchetState {
  rootKey: Uint8Array;
  chainKey: Uint8Array;
  messageNumber: number;
}
```

---

## Phase 3: Metadata Protection (v2.2.0)

**Goal**: Implement Sealed Sender to hide sender from relay

### Tasks

#### Sealed Sender
- [ ] Sender certificate generation
- [ ] Envelope encryption (hide sender)
- [ ] Relay cannot see who sent message
- [ ] Recipient-only sender reveal

#### Traffic Analysis Resistance
- [ ] Constant-rate message sending
- [ ] Dummy traffic generation
- [ ] Message batching
- [ ] Timing obfuscation

### Extension Points (Already Prepared)
```typescript
// src/core/crypto/types.ts
export interface SealedEnvelope {
  ephemeralPublic: string;
  ciphertext: string;
}
```

---

## Phase 4: Group Messaging (v2.3.0)

**Goal**: Implement MLS for scalable group E2EE

### Tasks

#### MLS Protocol
- [ ] Group key agreement
- [ ] Add/remove members
- [ ] Key rotation on membership change
- [ ] Commit messages
- [ ] Welcome messages

#### Group Management
- [ ] Group creation
- [ ] Member invitation
- [ ] Admin controls
- [ ] Group metadata encryption

---

## Phase 5: Multi-Device (v2.4.0)

**Goal**: Sync across user's devices securely

### Tasks

#### Device Linking
- [ ] Device key generation
- [ ] QR code linking
- [ ] Device list management
- [ ] Device revocation

#### Message Sync
- [ ] Fan-out to all devices
- [ ] Read receipt sync
- [ ] Contact sync
- [ ] Settings sync

---

## Phase 6: Platform Expansion (v3.0.0)

**Goal**: Desktop clients (Windows/Linux)

### Tasks

#### Electron/Tauri Client
- [ ] Shared crypto core (WebAssembly)
- [ ] Platform-agnostic transport
- [ ] Native secure storage
- [ ] Cross-platform UI

---

## Technical Debt & Improvements

### Performance
- [ ] Lazy session initialization
- [ ] Message queue optimization
- [ ] Background sync
- [ ] Offline message queue

### Security Hardening
- [ ] libsodium migration (optional)
- [ ] Secure enclave integration
- [ ] Certificate pinning
- [ ] Jailbreak/root detection

### Testing
- [ ] Fuzzing crypto layer
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security audit

---

## Migration Path

### From v1.x to v2.x
1. New core runs alongside legacy code
2. LegacyAdapter bridges old/new
3. Gradual migration of features
4. Legacy code removal after full migration

### Backward Compatibility
- Old message format supported
- Old key format supported
- Automatic migration on app update

---

## Security Milestones

| Version | Security Level | Comparison |
|---------|---------------|------------|
| v2.0 | E2EE, Zero-Access | > Telegram Cloud |
| v2.1 | + Forward Secrecy | = Signal (basic) |
| v2.2 | + Sealed Sender | = Signal (full) |
| v2.3 | + MLS Groups | > Signal (groups) |

---

## Timeline (Estimated)

| Phase | Version | Target |
|-------|---------|--------|
| Foundation | v2.0.0 | ✅ Done |
| Forward Secrecy | v2.1.0 | Q1 2026 |
| Sealed Sender | v2.2.0 | Q2 2026 |
| MLS Groups | v2.3.0 | Q3 2026 |
| Multi-Device | v2.4.0 | Q4 2026 |
| Desktop | v3.0.0 | 2027 |
