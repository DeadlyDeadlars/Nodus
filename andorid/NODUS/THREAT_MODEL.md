# NODUS Security Threat Model

## Overview

This document describes the threat model for NODUS messenger and how the architecture addresses each threat.

## Adversary Capabilities

We assume adversaries with the following capabilities:

### Passive Adversary
- Can observe all network traffic
- Can observe relay server storage
- Can perform traffic analysis

### Active Adversary
- Can modify network traffic
- Can compromise relay server
- Can perform man-in-the-middle attacks

### Compromised Server
- Full access to relay server code and data
- Can modify server behavior
- Can store all received data indefinitely

## Threat Analysis

### 1. Message Content Disclosure

**Threat**: Adversary reads message content

**Mitigation**:
- All messages encrypted with XSalsa20-Poly1305
- Keys derived via X25519 ECDH + HKDF
- Server never has access to session keys

**Proof**:
```
message_ciphertext = encrypt(plaintext, session_key)
session_key = HKDF(X25519(my_sk, peer_pk))
Server has: ciphertext
Server needs: session_key
session_key requires: my_sk OR peer_sk
Neither sk ever sent to server
∴ Server cannot decrypt
```

### 2. Sender/Receiver Identification

**Threat**: Adversary identifies who is communicating with whom

**Mitigation**:
- Mailbox IDs rotate every 24 hours
- Mailbox ID = hash(user_id + epoch)
- No sender information in transport layer

**Proof**:
```
mailbox_id = SHA512(user_id || ":nodus:mailbox:epoch:" || epoch)[0:16]
Given: mailbox_id
Cannot derive: user_id (hash is one-way)
Cannot link: mailbox_id_day1 to mailbox_id_day2 (different epochs)
```

### 3. Key Compromise

**Threat**: Adversary obtains user's private key

**Mitigation**:
- Private keys stored in device Keychain (hardware-backed when available)
- Keys encrypted at rest
- No key backup to server

**Future Enhancement**: Double Ratchet for forward secrecy

### 4. Replay Attacks

**Threat**: Adversary replays old messages

**Mitigation**:
- Each message has unique nonce
- Timestamp validation (10-second window)
- Nonce tracking to detect replays

### 5. Man-in-the-Middle

**Threat**: Adversary intercepts key exchange

**Mitigation**:
- Key fingerprint verification
- Out-of-band verification (QR code, voice)
- Safety numbers comparison

### 6. Server Compromise

**Threat**: Adversary gains full control of relay server

**Impact Analysis**:
| Data | Server Has | Can Adversary Use? |
|------|------------|-------------------|
| Mailbox IDs | Yes | Cannot link to users |
| Encrypted blobs | Yes | Cannot decrypt |
| Timestamps | Yes | Limited metadata |
| IP addresses | Hashed only | Cannot identify |
| User IDs | No | N/A |
| Private keys | No | N/A |
| Message content | No | N/A |

**Conclusion**: Server compromise reveals minimal metadata, no content.

### 7. Traffic Analysis

**Threat**: Adversary analyzes traffic patterns

**Current Mitigation**:
- Mailbox ID rotation
- Message padding (256-byte blocks)

**Future Enhancement**: Sealed Sender to hide sender from relay

### 8. Device Theft

**Threat**: Adversary steals user's device

**Mitigation**:
- Keys in Keychain (requires device unlock)
- App lock with PIN/biometric
- Remote wipe capability (planned)

## Security Guarantees

### What We Guarantee

1. **Confidentiality**: Only sender and recipient can read messages
2. **Integrity**: Messages cannot be modified without detection
3. **Authentication**: Messages are from claimed sender (with verification)

### What We Don't Guarantee (Yet)

1. **Forward Secrecy**: Compromise of current key reveals past messages
   - Solution: Double Ratchet (Phase 2)

2. **Sender Anonymity**: Relay knows which mailbox receives message
   - Solution: Sealed Sender (Phase 3)

3. **Deniability**: Cannot deny sending a message
   - Solution: Deniable authentication (Future)

## Comparison: NODUS vs Telegram

| Security Property | NODUS | Telegram (Cloud) | Telegram (Secret) |
|-------------------|-------|------------------|-------------------|
| E2EE | ✅ Always | ❌ No | ✅ Yes |
| Server key access | ❌ Never | ✅ Yes | ❌ No |
| Forward secrecy | ⏳ Planned | ❌ No | ✅ Yes |
| Metadata protection | ✅ Partial | ❌ No | ❌ No |
| Open protocol | ✅ Yes | ❌ MTProto | ❌ MTProto |
| Verifiable | ✅ Yes | ❌ No | ❌ No |

## Incident Response

### If Server Is Compromised

1. **Immediate**: No user data at risk (zero-knowledge)
2. **Action**: Rotate relay servers
3. **User action**: None required

### If User Key Is Compromised

1. **Impact**: Future messages to that user readable
2. **Action**: User generates new identity
3. **Mitigation**: Double Ratchet limits exposure

### If Protocol Vulnerability Found

1. **Action**: Update crypto version
2. **Backward compatibility**: Old messages remain secure
3. **Forward**: New messages use fixed protocol

## Audit Checklist

- [ ] No private keys in logs
- [ ] No plaintext in network traffic
- [ ] No user IDs in relay storage
- [ ] Proper key derivation
- [ ] Secure random number generation
- [ ] Constant-time comparisons
- [ ] Memory wiping after use
