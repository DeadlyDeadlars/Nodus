# 🔄 MIGRATION GUIDE - Security Update

## Overview
This update moves encryption keys from MMKV to hardware-backed Keychain for enhanced security. Existing users need to migrate their data.

## Automatic Migration (Recommended)

Add this migration code to `src/App.tsx` or your app initialization:

```typescript
import { storage } from './services/storage';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';

async function migrateToKeychain() {
  try {
    // Check if already migrated
    const migrated = storage.getString('keychain_migrated');
    if (migrated === 'true') return;

    // Get old device key from MMKV
    const oldKeyStorage = new MMKV({ id: 'nodus-key-storage' });
    const oldDeviceKey = oldKeyStorage.getString('device_encryption_key');
    
    if (oldDeviceKey) {
      // Store in Keychain
      await Keychain.setGenericPassword('device_key', oldDeviceKey, {
        service: 'nodus.device.key',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      });
      
      // Mark as migrated
      storage.set('keychain_migrated', 'true');
      
      // Clean up old storage
      oldKeyStorage.delete('device_encryption_key');
      
      console.log('✅ Successfully migrated to Keychain');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Show user-friendly error
    Alert.alert(
      'Migration Required',
      'Please backup your data and reinstall the app for enhanced security.',
      [{ text: 'OK' }]
    );
  }
}

// Call on app start
useEffect(() => {
  migrateToKeychain();
}, []);
```

## Manual Migration (If Automatic Fails)

### Step 1: Export Backup
```typescript
import { backup } from './services/backup';

// In your settings screen
async function exportBackup() {
  const backupData = await backup.createBackup();
  // Save to file or cloud
}
```

### Step 2: Update App
- Install new version from store
- App will initialize with new Keychain storage

### Step 3: Restore Backup
```typescript
async function restoreBackup(backupData: string) {
  await backup.restoreBackup(backupData);
}
```

## For Developers

### Testing Migration
```bash
# 1. Install old version
npm run android

# 2. Create test data
# (send some messages, add contacts)

# 3. Install new version
npm run android

# 4. Verify data is accessible
# (check messages, contacts still work)
```

### Rollback Plan
If migration fails, you can temporarily revert:

```typescript
// In src/services/storage.ts
// Comment out Keychain code and use old MMKV approach
function getOrCreateDeviceKey(): string {
  const keyStorage = new MMKV({ id: 'nodus-key-storage' });
  let key = keyStorage.getString('device_encryption_key');
  
  if (!key) {
    const keyBytes = nacl.randomBytes(32);
    key = b64encode(Array.from(keyBytes).map(b => String.fromCharCode(b)).join(''));
    keyStorage.set('device_encryption_key', key);
  }
  
  return key;
}

const deviceKey = getOrCreateDeviceKey();
export const storage = new MMKV({ id: 'nodus-storage', encryptionKey: deviceKey });
```

## Verification

After migration, verify:
1. ✅ Messages are readable
2. ✅ Contacts are visible
3. ✅ Can send/receive new messages
4. ✅ Groups still work
5. ✅ Settings preserved

## Troubleshooting

### "Cannot read messages after update"
- Restore from backup
- Check Keychain permissions in device settings

### "App crashes on startup"
- Clear app data (will lose messages)
- Restore from backup

### "Keychain not available"
- Device may not support hardware security
- App will show warning but continue with fallback

## Support

If migration fails:
1. Export backup before updating
2. Contact support with error logs
3. Restore from backup after fix

---

**Note:** This is a one-time migration. Future updates won't require this process.
