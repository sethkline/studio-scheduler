# PWA Security and Production Configuration

This document details the security measures, cache isolation strategies, and production configuration for the Dance Studio Scheduler PWA.

## Table of Contents

1. [Production Configuration](#production-configuration)
2. [Cache Isolation](#cache-isolation)
3. [Offline Data Staleness](#offline-data-staleness)
4. [Studio-Specific Branding](#studio-specific-branding)
5. [Testing Checklist](#testing-checklist)

---

## Production Configuration

### Dev Options

The PWA dev options are now environment-aware to prevent development tools from leaking into production builds:

**File**: `nuxt.config.ts:276`

```typescript
devOptions: {
  enabled: process.env.NODE_ENV === 'development',
  type: 'module'
}
```

**Why**: Development service worker tools should never be enabled in production as they can expose debugging information and bypass caching strategies.

### Workbox Caching Strategies

The caching strategies have been hardened for production and multi-user safety:

#### NetworkOnly Routes (No Caching)

These routes are **NEVER** cached to prevent security issues:

1. **Supabase Auth/API** (`/auth`, `/rest`)
   - Prevents stale authentication tokens
   - Ensures fresh user session data
   - Avoids cross-user data leaks

2. **Stripe Payments** (all `stripe.com` URLs)
   - Payment data must always be fresh
   - Prevents duplicate charges
   - Ensures PCI compliance

3. **Authenticated API Routes** (`/api/profile`, `/api/auth`, `/api/students`, `/api/teachers`, `/api/staff`)
   - User-specific data requires fresh requests
   - Prevents User A seeing User B's data
   - Maintains RBAC integrity

#### NetworkFirst Routes (Short TTL)

These routes can be cached but with strict expiration:

1. **Public API Routes** (`/api/recitals`, `/api/public`) - 5 minutes TTL
2. **Supabase Storage** (images, assets) - 24 hours TTL

#### CacheFirst Routes

Only static assets that don't change:

1. **Images** - 30 days TTL

### Cache Versioning

All cache names include a version suffix (`-v1`) to enable cache busting:

```typescript
cacheName: 'supabase-storage-v1'
cacheName: 'public-api-cache-v1'
cacheName: 'image-cache-v1'
```

**To bust all caches**: Increment the version number and redeploy.

### Automatic Cache Cleanup

```typescript
cleanupOutdatedCaches: true
```

Automatically removes old cache versions when the service worker updates.

---

## Cache Isolation

### User-Specific Cache Keys

**File**: `utils/offlineStorage.ts`

All cached data is now prefixed with the user ID to prevent cross-user access:

```typescript
// Cache key format: {userId}:{resourceId}
const cacheKey = userId ? `${userId}:${key}` : key
```

**Example**:
- User A's schedule: `user-123:schedule-456`
- User B's schedule: `user-789:schedule-456`

Even if both users access the same resource ID, they get separate cache entries.

### Cache Clearing on Logout

**File**: `stores/auth.ts:155`

When a user logs out, ALL their cached data is cleared:

1. **IndexedDB**: User-specific entries removed from all object stores
2. **Service Worker Caches**: API and Supabase caches deleted

```typescript
async clearProfile() {
  // Clear IndexedDB user data
  await offlineStorage.clearUserData(this.userProfile.id)

  // Clear service worker caches
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter(name => name.includes('api-cache') || name.includes('supabase'))
      .map(name => caches.delete(name))
  )
}
```

### Plugin-Based Cache Monitoring

**File**: `plugins/pwa-cache-isolation.client.ts`

A client-side plugin monitors user changes and automatically clears caches:

```typescript
watch(user, async (newUser, oldUser) => {
  // If user changed, clear all caches
  if (oldUser && (!newUser || newUser.id !== oldUser.id)) {
    await clearCaches()
  }
})
```

**Triggers**:
- User logs out
- User logs in as different user
- User switches accounts

---

## Offline Data Staleness

### OfflineDataBanner Component

**File**: `components/OfflineDataBanner.vue`

A global banner that warns users when they're viewing stale cached data:

**Features**:
1. **Offline Indicator**: Shows when user is offline
2. **Staleness Warning**: Shows when cached data is older than 30 minutes (configurable)
3. **Last Sync Time**: Displays human-readable time since last sync
4. **Pending Actions Count**: Shows how many actions are queued
5. **Retry Button**: Manually trigger sync

**Usage**:

```vue
<template>
  <OfflineDataBanner
    store-name="schedules"
    cache-key="current-schedule"
    :staleness-threshold="30"
  />
</template>
```

**Props**:
- `storeName` - IndexedDB store to check
- `cacheKey` - Specific cache key to monitor
- `stalenessThreshold` - Minutes before showing warning (default: 30)

### Cache Metadata Tracking

**File**: `utils/offlineStorage.ts:182`

Every cached item stores metadata:

```typescript
interface CachedData {
  key: string
  data: any
  timestamp: number     // When cached
  expiresAt?: number   // When expires
  userId?: string      // Owner
}
```

Use `getCacheMetadata()` to check data age:

```typescript
const { getCacheMetadata } = useOfflineStorage()
const metadata = await getCacheMetadata('schedules', 'schedule-123')

if (metadata) {
  const ageMinutes = (Date.now() - metadata.timestamp) / 60000
  console.log(`Data is ${ageMinutes} minutes old`)
}
```

### Offline Queue Management

**File**: `composables/useOffline.ts`

Enhanced with UI feedback:

1. **Toast Notifications**:
   - Action queued: "Your changes will be saved when online"
   - Sync complete: "3 actions synced successfully"
   - Sync failed: "Action failed after multiple retries"

2. **Action Descriptions**:
   ```typescript
   queueAction({
     type: 'api-call',
     endpoint: '/api/students',
     method: 'POST',
     data: studentData,
     description: 'Create new student' // Shows in notifications
   })
   ```

3. **Retry Logic**:
   - Automatic retry on network restore
   - Up to 5 retry attempts
   - Exponential backoff (planned)

---

## Studio-Specific Branding

### Dynamic Manifest

**File**: `server/api/manifest.json.get.ts`

The PWA manifest is generated server-side and customized per studio:

**Default Manifest**:
```json
{
  "name": "Dance Studio Scheduler",
  "short_name": "Studio",
  "theme_color": "#8B5CF6"
}
```

**Studio-Customized Manifest**:
```json
{
  "name": "Ballet Academy - Studio Manager",
  "short_name": "Ballet Academy",
  "theme_color": "#FF6B9D"
}
```

**Data Source**: `studio_profile` table
- `studio_name` → manifest name
- `primary_color` → theme color
- `logo_url` → icons (future)

**Caching**: 1 hour cache to balance freshness and performance

### Future: Multi-Tenant Icons

When implementing multi-tenant support:

1. **Icon Generation**: Generate PWA icons from studio logo
2. **Storage**: Store in `/studios/{studio_id}/icons/`
3. **Fallback**: Use default icons if studio hasn't uploaded
4. **Manifest Update**: Point icon URLs to studio-specific paths

---

## Testing Checklist

### Phase 1: Production Configuration

- [ ] Build production bundle: `npm run build`
- [ ] Verify dev options disabled in production
- [ ] Check service worker registration (no dev tools)
- [ ] Inspect Workbox config in generated SW

### Phase 2: Cache Isolation

1. **Test User A**:
   - [ ] Login as User A
   - [ ] Browse schedules/students (cache populated)
   - [ ] Check IndexedDB (should have `userA:*` keys)
   - [ ] Logout

2. **Test User B**:
   - [ ] Login as User B
   - [ ] Browse same resources
   - [ ] Check IndexedDB (should have `userB:*` keys)
   - [ ] Verify NO `userA:*` keys visible

3. **Test Cache Clearing**:
   - [ ] Login as User A
   - [ ] Cache data
   - [ ] Logout
   - [ ] Check IndexedDB (all User A data removed)
   - [ ] Check Service Worker caches (api-cache cleared)

### Phase 3: Offline Functionality

- [ ] Disconnect network (DevTools → Network → Offline)
- [ ] Browse cached pages (should work)
- [ ] See OfflineDataBanner
- [ ] Attempt form submission (should queue)
- [ ] Reconnect network
- [ ] Verify queued action processed
- [ ] See "Sync Complete" toast

### Phase 4: Data Staleness

- [ ] Cache some data
- [ ] Wait 31 minutes (or change threshold to 1 minute)
- [ ] Refresh page
- [ ] See "Data may be outdated" banner
- [ ] Click "Retry" button
- [ ] Verify fresh data loaded

### Phase 5: PWA Installation

**Mobile (iOS Safari)**:
- [ ] Open app in Safari
- [ ] Tap Share → Add to Home Screen
- [ ] Verify icon, name, splash screen
- [ ] Launch from home screen (standalone mode)

**Mobile (Android Chrome)**:
- [ ] See "Install App" banner
- [ ] Tap "Install"
- [ ] Verify icon, name, splash screen
- [ ] Launch from home screen

**Desktop (Chrome)**:
- [ ] See "Install" icon in address bar
- [ ] Click to install
- [ ] Verify app window (no browser UI)

### Phase 6: Lighthouse Audit

```bash
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse
# Select "Progressive Web App" category
# Run audit
```

**Target Scores**:
- PWA: 90+
- Installable: ✓
- Offline capable: ✓
- Themed: ✓

---

## Security Best Practices

### Do's ✅

1. **Always** use NetworkOnly for authenticated routes
2. **Always** clear caches on logout
3. **Always** use user-specific cache keys
4. **Always** show staleness warnings for cached data
5. **Always** validate permissions server-side (never trust cached data)

### Don'ts ❌

1. **Never** cache authentication tokens
2. **Never** cache user-specific API responses with NetworkFirst
3. **Never** share cache between users
4. **Never** trust cached data without re-validation
5. **Never** enable dev options in production

---

## Troubleshooting

### Issue: User A sees User B's data

**Diagnosis**: Cache isolation not working

**Fix**:
1. Check cache keys include userId: `utils/offlineStorage.ts:91`
2. Verify logout clears caches: `stores/auth.ts:155`
3. Check plugin is loaded: `plugins/pwa-cache-isolation.client.ts`

### Issue: Stale data not showing warning

**Diagnosis**: OfflineDataBanner not configured

**Fix**:
1. Add `<OfflineDataBanner />` to layout
2. Pass correct `store-name` and `cache-key` props
3. Check cache metadata exists: `getCacheMetadata()`

### Issue: Dev options enabled in production

**Diagnosis**: Environment variable not set

**Fix**:
```bash
NODE_ENV=production npm run build
```

### Issue: Queued actions not syncing

**Diagnosis**: processQueue not called

**Fix**:
1. Check online detection: `useOffline().isOnline`
2. Manually trigger: `processQueue()`
3. Check console for errors

---

## Maintenance

### Updating Cache Versions

When you need to bust all caches (e.g., after breaking API changes):

1. Update cache names in `nuxt.config.ts`:
   ```typescript
   cacheName: 'supabase-storage-v2'  // was v1
   cacheName: 'public-api-cache-v2'   // was v1
   ```

2. Redeploy

3. Service worker will auto-clean old caches

### Monitoring Cache Size

```javascript
// Console command
const cacheSize = await caches.keys().then(async keys => {
  const sizes = await Promise.all(keys.map(async key => {
    const cache = await caches.open(key)
    const requests = await cache.keys()
    return { name: key, count: requests.length }
  }))
  return sizes
})
console.table(cacheSize)
```

---

## Future Enhancements

1. **Background Sync**: Use Background Sync API for queued actions
2. **Push Notifications**: Notify users of schedule changes
3. **Periodic Sync**: Refresh cached data in background
4. **Smarter Cache Invalidation**: Invalidate related caches on update
5. **Offline Analytics**: Track offline usage patterns

---

## References

- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [PWA Security Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker Lifecycle](https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle)
- [IndexedDB Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
