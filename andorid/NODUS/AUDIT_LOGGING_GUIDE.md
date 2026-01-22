# 📊 Audit Logging Usage Guide

## Overview
Audit logging tracks all critical security events in the app. Events are stored locally with only hashes (no sensitive data).

## Logged Events

| Event Type | Description | When Triggered |
|------------|-------------|----------------|
| `key_rotation` | User keypair rotated | Every 30 days or manual |
| `key_change` | Contact's key changed | MITM detection |
| `auth_fail` | Authentication failed | Debugger detected |
| `decrypt_fail` | Message decryption failed | Invalid ciphertext |
| `ssl_pin_fail` | SSL pinning failed | MITM attempt |
| `replay_attack` | Duplicate nonce detected | Message replay |
| `rate_limit` | Rate limit exceeded | Abuse attempt |
| `root_detected` | Rooted device detected | Security check |

## Usage in Code

### View Audit Logs
```typescript
import { getAuditLogs } from './utils/secureLog';

const logs = getAuditLogs();
console.log('Security events:', logs);

// Example output:
// [
//   { type: 'key_rotation', timestamp: 1704276610433, hash: 'a3f2...' },
//   { type: 'replay_attack', timestamp: 1704276620123, hash: 'b8e1...' },
// ]
```

### Clear Audit Logs
```typescript
import { clearAuditLogs } from './utils/secureLog';

clearAuditLogs();
```

### Manual Logging (if needed)
```typescript
import { auditLog } from './utils/secureLog';

// Log custom security event
auditLog('decrypt_fail', { 
  messageId: 'msg_123',
  reason: 'invalid_signature' 
});
```

## UI Integration

Add to Settings screen:

```typescript
import { getAuditLogs } from '../utils/secureLog';

function SecurityLogsScreen() {
  const logs = getAuditLogs();
  
  return (
    <ScrollView>
      <Text style={styles.title}>Security Events</Text>
      {logs.map((log, i) => (
        <View key={i} style={styles.logItem}>
          <Text style={styles.type}>{log.type}</Text>
          <Text style={styles.time}>
            {new Date(log.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.hash}>{log.hash}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

## Analysis

### Check for Security Issues
```typescript
const logs = getAuditLogs();

// Count events by type
const counts = logs.reduce((acc, log) => {
  acc[log.type] = (acc[log.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Event counts:', counts);

// Check for suspicious activity
if (counts.replay_attack > 5) {
  console.warn('⚠️ Multiple replay attacks detected!');
}

if (counts.key_change > 0) {
  console.warn('⚠️ Contact key changed - possible MITM!');
}

if (counts.ssl_pin_fail > 0) {
  console.error('🚨 SSL pinning failed - MITM attack!');
}
```

### Export for Analysis
```typescript
import RNFS from 'react-native-fs';

async function exportAuditLogs() {
  const logs = getAuditLogs();
  const json = JSON.stringify(logs, null, 2);
  const path = `${RNFS.DocumentDirectoryPath}/audit_logs.json`;
  await RNFS.writeFile(path, json, 'utf8');
  console.log('Logs exported to:', path);
}
```

## Privacy

- **No sensitive data** is logged (only hashes)
- **No message content** is stored
- **No user IDs** in plaintext (only first 8 chars)
- **Automatic cleanup** (keeps last 1000 events)

## Storage

- Location: MMKV encrypted storage
- Key: `audit_log`
- Max size: ~50KB (1000 events)
- Encrypted: Yes (with device key)

## Best Practices

1. **Review regularly** - Check logs weekly for suspicious activity
2. **Export before updates** - Save logs before app updates
3. **Don't share logs** - Contains security-sensitive information
4. **Clear after review** - Remove old logs to save space

## Alerts

Set up alerts for critical events:

```typescript
import { getAuditLogs } from './utils/secureLog';
import { Alert } from 'react-native';

function checkSecurityAlerts() {
  const logs = getAuditLogs();
  const recent = logs.filter(l => Date.now() - l.timestamp < 3600000); // Last hour
  
  const critical = recent.filter(l => 
    ['ssl_pin_fail', 'key_change', 'root_detected'].includes(l.type)
  );
  
  if (critical.length > 0) {
    Alert.alert(
      '⚠️ Security Alert',
      `${critical.length} critical security events detected in the last hour.`,
      [
        { text: 'View Logs', onPress: () => navigateToSecurityLogs() },
        { text: 'Dismiss' }
      ]
    );
  }
}

// Run on app start
useEffect(() => {
  checkSecurityAlerts();
}, []);
```

## Troubleshooting

### Logs not appearing
- Check if storage is initialized
- Verify audit logging is enabled
- Check for errors in console

### Too many events
- Increase max size in `secureLog.ts`
- Implement log rotation
- Export and clear old logs

### Performance impact
- Minimal (<1ms per event)
- Async storage writes
- No network calls

---

**Note:** Audit logs are for security monitoring only. They don't affect app functionality.
