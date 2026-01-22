# NODUS - Zero-Access Secure Messenger

A secure messenger that is **provably safer than Telegram** with zero-trust architecture.

## Key Features

- 🔐 **E2EE by Default** - All messages encrypted end-to-end
- 🚫 **Zero-Access** - Server cannot read messages or identify users
- 🔑 **Client-Side Keys** - All keys generated on device, never on server
- 🌐 **Censorship Resistant** - Multiple relay fallback, P2P ready
- 📱 **Cross-Platform Ready** - Architecture supports future desktop clients

## Security Comparison

| Feature | NODUS | Telegram |
|---------|-------|----------|
| E2EE by default | ✅ Yes | ❌ No |
| Server key access | ❌ Never | ✅ Yes |
| Zero-knowledge relay | ✅ Yes | ❌ No |
| Open source server | ✅ Yes | ❌ No |
| Provable security | ✅ Yes | ❌ No |

## Quick Start

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run tests
npm test
```

## Architecture

```
src/core/
├── crypto/           # Cryptographic primitives (X25519, HKDF, XSalsa20)
├── transport/        # Zero-knowledge relay communication
├── messaging/        # E2EE message handling
└── storage/          # Encrypted local storage
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Security

- **Threat Model**: [THREAT_MODEL.md](./THREAT_MODEL.md)
- **Cryptography**: X25519 + HKDF + XSalsa20-Poly1305
- **Key Storage**: Device Keychain (hardware-backed)

### Why Keys Cannot Be Recovered

1. Private keys generated only on client
2. Never sent to server
3. No key escrow or backup
4. Server is provably zero-knowledge

## Roadmap

See [ROADMAP_V2.md](./ROADMAP_V2.md) for development plans.

### Coming Soon
- Double Ratchet (forward secrecy)
- Sealed Sender (hide sender from relay)
- MLS (scalable group encryption)

## Building Release

```bash
# Build release APK
npm run build:android

# Install on device
npm run install:release
```

## Testing

```bash
# All tests
npm test

# Crypto tests only
npm run test:crypto

# Security tests
npm run test:security
```

## License

MIT

