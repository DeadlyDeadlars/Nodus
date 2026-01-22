# NODUS - Files with Issues

## CRITICAL FILES (Fix First)

### 1. src/store.ts
**Severity:** CRITICAL  
**Issues:**
- All functions are empty stubs
- No actual state management
- No persistence
- No P2P integration

**Lines:** 1-50  
**Fix Time:** 2-3 hours

---

### 2. src/screens/OnboardingScreen.tsx
**Severity:** CRITICAL  
**Issues:**
- Hardcoded relay URL (line ~150)
- Unguarded console logs (lines ~180, ~200)
- No key validation
- No error handling
- Empty initCore function

**Lines:** 1-400+  
**Fix Time:** 3-4 hours

---

### 3. src/screens/ChatDetailScreen.tsx
**Severity:** CRITICAL  
**Issues:**
- 90KB file (too large)
- No message encryption
- No offline support
- Placeholder functions (lines ~30-50)
- No error handling
- Unguarded console logs

**Lines:** 1-2000+  
**Fix Time:** 8-10 hours (needs refactoring)

---

### 4. src/App.tsx
**Severity:** HIGH  
**Issues:**
- navigationRef created but never used (line ~180)
- No error boundary
- Panic mode logic unclear
- No error handling

**Lines:** 1-250  
**Fix Time:** 1-2 hours

---

### 5. src/AppWrapper.tsx
**Severity:** HIGH  
**Issues:**
- Unguarded console logs (lines ~20, ~30)
- Silent error handling
- No error boundary

**Lines:** 1-50  
**Fix Time:** 30 minutes

---

## HIGH PRIORITY FILES

### 6. src/screens/SettingsScreen.tsx
**Severity:** HIGH  
**Issues:**
- Empty functions (testNotification, rotateKeys)
- No actual settings persistence
- No validation
- Unguarded console logs

**Lines:** 1-800+  
**Fix Time:** 4-5 hours

---

### 7. src/screens/MyProfileScreen.tsx
**Severity:** HIGH  
**Issues:**
- Hardcoded relay URL (line ~150)
- Unguarded console logs (lines ~200, ~250)
- No error handling
- No validation

**Lines:** 1-400+  
**Fix Time:** 2-3 hours

---

### 8. src/screens/GroupSettingsScreen.tsx
**Severity:** HIGH  
**Issues:**
- Hardcoded relay URL (line ~10)
- No error handling
- Empty functions

**Lines:** 1-600+  
**Fix Time:** 3-4 hours

---

### 9. src/screens/MoreScreen.tsx
**Severity:** HIGH  
**Issues:**
- Empty testNotification function
- No error handling
- Placeholder functions

**Lines:** 1-800+  
**Fix Time:** 3-4 hours

---

### 10. src/screens/GlobalSearchScreen.tsx
**Severity:** HIGH  
**Issues:**
- Empty functions (joinRelayGroup, addSpace, addChannel)
- No error handling
- Unhandled promises

**Lines:** 1-400+  
**Fix Time:** 2-3 hours

---

## MEDIUM PRIORITY FILES

### 11. src/screens/BookmarksScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty functions (removeBookmark, clearAllBookmarks)
- No actual bookmark service

**Lines:** 1-100  
**Fix Time:** 1 hour

---

### 12. src/screens/ScheduledMessagesScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty functions (removeScheduledMessage)
- No actual scheduled message service

**Lines:** 1-100  
**Fix Time:** 1 hour

---

### 13. src/screens/BrowserScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty initialize function
- No actual browser implementation
- Placeholder functions

**Lines:** 1-500+  
**Fix Time:** 4-5 hours

---

### 14. src/screens/FeedScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Hardcoded private key (line ~50)
- No error handling
- Unhandled promises

**Lines:** 1-400+  
**Fix Time:** 3-4 hours

---

### 15. src/screens/UserProfileScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty functions
- No error handling
- Placeholder implementations

**Lines:** 1-300+  
**Fix Time:** 2-3 hours

---

### 16. src/screens/DebugScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty functions (connectToPeer, sendTestMessage)
- Placeholder implementations

**Lines:** 1-200  
**Fix Time:** 1-2 hours

---

### 17. src/screens/ChatsScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty messageQueue function
- No error handling
- Placeholder implementations

**Lines:** 1-500+  
**Fix Time:** 3-4 hours

---

### 18. src/screens/ChannelsScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- No error handling
- Placeholder implementations

**Lines:** 1-400+  
**Fix Time:** 2-3 hours

---

### 19. src/screens/CreateScreen.tsx
**Severity:** MEDIUM  
**Issues:**
- No validation
- No error handling
- Placeholder implementations

**Lines:** 1-400+  
**Fix Time:** 2-3 hours

---

### 20. src/components/CallOverlay.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty call sounds service
- No error handling

**Lines:** 1-300  
**Fix Time:** 1-2 hours

---

### 21. src/components/KeyVerificationModal.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty key verification service
- No actual verification logic

**Lines:** 1-200  
**Fix Time:** 1-2 hours

---

### 22. src/components/TransportIndicator.tsx
**Severity:** MEDIUM  
**Issues:**
- Empty transport mode hook
- No actual transport detection

**Lines:** 1-50  
**Fix Time:** 30 minutes

---

## LOW PRIORITY FILES

### 23. src/screens/ChannelDetailScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues
- Mostly functional

---

### 24. src/screens/ChannelSettingsScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues
- Mostly functional

---

### 25. src/screens/BackupScreen.tsx
**Severity:** LOW  
**Issues:**
- Placeholder backup service
- No actual backup implementation

---

### 26. src/screens/ChannelStatsScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 27. src/screens/StickerPacksScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 28. src/screens/PinScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 29. src/screens/VideoTestScreen.tsx
**Severity:** LOW  
**Issues:**
- Test screen only

---

## COMPONENT FILES

### 30. src/components/Icons.tsx
**Severity:** LOW  
**Issues:**
- None (just icon definitions)

---

### 31. src/components/VideoMessageRecorder.tsx
**Severity:** MEDIUM  
**Issues:**
- No error handling
- No validation

---

### 32. src/components/QRContactShare.tsx
**Severity:** MEDIUM  
**Issues:**
- No error handling
- Unhandled promises

---

### 33. src/components/PollMessage.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 34. src/components/ScheduleMessage.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 35. src/components/QuickReactions.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 36. src/components/DisappearingTimer.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 37. src/components/CircleVideoMessage.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 38. src/components/VideoTest.tsx
**Severity:** LOW  
**Issues:**
- Test component only

---

### 39. src/components/MediaViewer.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 40. src/components/NetworkStatus.tsx
**Severity:** MEDIUM  
**Issues:**
- No error handling

---

### 41. src/components/StoriesBar.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 42. src/components/LockScreen.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

### 43. src/components/CustomAlert.tsx
**Severity:** LOW  
**Issues:**
- Minor issues

---

## SUMMARY BY SEVERITY

### CRITICAL (Fix First - 5 files)
1. src/store.ts
2. src/screens/OnboardingScreen.tsx
3. src/screens/ChatDetailScreen.tsx
4. src/App.tsx
5. src/AppWrapper.tsx

**Total Fix Time:** 15-20 hours

### HIGH (Fix Next - 5 files)
6. src/screens/SettingsScreen.tsx
7. src/screens/MyProfileScreen.tsx
8. src/screens/GroupSettingsScreen.tsx
9. src/screens/MoreScreen.tsx
10. src/screens/GlobalSearchScreen.tsx

**Total Fix Time:** 14-18 hours

### MEDIUM (Fix After - 10 files)
11-20. Various screens and components

**Total Fix Time:** 20-25 hours

### LOW (Fix Last - 15+ files)
21+. Various screens and components

**Total Fix Time:** 10-15 hours

---

## TOTAL EFFORT ESTIMATE

- Critical: 15-20 hours
- High: 14-18 hours
- Medium: 20-25 hours
- Low: 10-15 hours
- **TOTAL: 59-78 hours (~2 weeks of full-time work)**

---

## RECOMMENDED FIX ORDER

**Week 1:**
1. src/store.ts (2-3 hours)
2. src/App.tsx (1-2 hours)
3. src/AppWrapper.tsx (30 min)
4. Create services (P2P, crypto, storage) (8-10 hours)
5. Create config/relay.ts (1 hour)
6. Create utils/logger.ts (1 hour)

**Week 2:**
7. src/screens/OnboardingScreen.tsx (3-4 hours)
8. src/screens/MyProfileScreen.tsx (2-3 hours)
9. src/screens/GroupSettingsScreen.tsx (3-4 hours)
10. src/screens/SettingsScreen.tsx (4-5 hours)

**Week 3:**
11. src/screens/ChatDetailScreen.tsx (8-10 hours - needs refactoring)
12. Other screens (10-15 hours)

**Week 4:**
13. Testing & QA (20+ hours)

---

**Generated:** 2026-01-17 21:42:54 UTC+5
