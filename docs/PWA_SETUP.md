# PWA Setup Guide

This document provides step-by-step instructions for setting up all Progressive Web App features, including installation, offline support, and push notifications.

## Prerequisites

- Node.js 18+ and npm installed
- Supabase project set up
- All dependencies installed (`npm install`)

## 1. Generate VAPID Keys

VAPID keys are required for web push notifications.

```bash
node scripts/generateVapidKeys.mjs
```

This will output two keys:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

## 2. Update Environment Variables

Add the following to your `.env` file:

```env
# Web Push Notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here

# If not already set
MAILGUN_DOMAIN=your_mailgun_domain
```

**Important:**
- Never commit `.env` to version control
- Keep the private key secret
- Both keys are required for push notifications to work

## 3. Create Database Table

Run the SQL migration to create the `push_subscriptions` table:

```bash
# Connect to your Supabase dashboard
# Go to SQL Editor
# Paste the contents of docs/database/migrations/create_push_subscriptions_table.sql
# Run the query
```

Or use the Supabase CLI:

```bash
supabase db push --file docs/database/migrations/create_push_subscriptions_table.sql
```

## 4. Verify PWA Files

Ensure these files exist in your `public/` directory:

```
public/
├── manifest.json          ✓ Web app manifest
├── sw.js                  ✓ Service worker
├── apple-touch-icon.png   ✓ iOS icon
├── icons/
│   ├── icon-72x72.png     ✓
│   ├── icon-96x96.png     ✓
│   ├── icon-128x128.png   ✓
│   ├── icon-144x144.png   ✓
│   ├── icon-152x152.png   ✓
│   ├── icon-180x180.png   ✓
│   ├── icon-192x192.png   ✓
│   ├── icon-384x384.png   ✓
│   ├── icon-512x512.png   ✓
│   ├── icon-192x192-maskable.png  ✓
│   └── icon-512x512-maskable.png  ✓
└── screenshots/
    ├── schedule.png       ✓
    └── recitals.png       ✓
```

If any icons are missing, regenerate them:

```bash
node scripts/generateIcons.mjs
node scripts/generateScreenshots.mjs
```

## 5. Development Setup

Start the development server:

```bash
npm run dev
```

The PWA features are enabled in development mode with the `devOptions.enabled: true` configuration.

## 6. Testing PWA Features

### Test Service Worker Registration

1. Open the app in your browser
2. Open DevTools (F12)
3. Go to Application tab > Service Workers
4. You should see the service worker registered

### Test Offline Mode

1. Open DevTools > Network tab
2. Check "Offline" mode
3. Refresh the page
4. The app should load from cache
5. Navigate to previously visited pages
6. You should see the offline indicator

### Test Installation

**On Desktop (Chrome/Edge):**
1. Wait 30 seconds after loading the app
2. Install prompt should appear
3. Or click the install icon in the address bar
4. Click "Install"

**On Android (Chrome):**
1. Open the app
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home screen"
4. Follow the prompts

**On iOS (Safari):**
1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Test Push Notifications

1. Subscribe to notifications:
```typescript
const { subscribe } = usePushNotifications()
await subscribe()
```

2. Send a test notification:
```typescript
const { sendTestNotification } = usePushNotifications()
await sendTestNotification()
```

3. Check that notification appears on your device

## 7. Production Build

Build the app for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Important Production Notes:

1. **HTTPS Required:** Service workers only work over HTTPS (except localhost)
2. **Domain Matching:** Service worker scope must match your domain
3. **Caching:** Clear browser cache between deployments if needed
4. **VAPID Keys:** Ensure keys are set in production environment variables

## 8. Deployment Checklist

Before deploying to production:

- [ ] VAPID keys generated and added to environment variables
- [ ] Database migration applied (push_subscriptions table created)
- [ ] All PWA files present in public directory
- [ ] HTTPS enabled on production domain
- [ ] Environment variables set in hosting platform
- [ ] Service worker scope configured correctly
- [ ] Tested installation on iOS and Android
- [ ] Tested offline functionality
- [ ] Tested push notifications

## 9. Monitoring and Maintenance

### Service Worker Updates

The service worker checks for updates every hour. When an update is available:

1. New service worker downloads in the background
2. User sees update notification
3. User clicks "Update Now"
4. App reloads with new service worker

### Push Subscription Management

Monitor push subscriptions:

```sql
-- Count active subscriptions
SELECT COUNT(*) FROM push_subscriptions;

-- Subscriptions per user
SELECT user_id, COUNT(*) as subscription_count
FROM push_subscriptions
GROUP BY user_id;

-- Recent subscriptions
SELECT * FROM push_subscriptions
ORDER BY created_at DESC
LIMIT 10;
```

### Clean Up Invalid Subscriptions

The system automatically removes invalid subscriptions (410/404 errors) when sending notifications. No manual cleanup needed.

## 10. Troubleshooting

### Service Worker Not Registering

**Problem:** Service worker fails to register

**Solutions:**
1. Check console for errors
2. Verify `/sw.js` is accessible
3. Ensure HTTPS is enabled (production)
4. Clear browser cache and reload

### Installation Prompt Not Showing

**Problem:** Install prompt doesn't appear

**Solutions:**
1. Wait at least 30 seconds on the page
2. Check if already installed
3. Visit the site at least twice, 5 minutes apart
4. Use browser menu to install manually
5. Check browser support (iOS Safari, Chrome, Edge)

### Offline Mode Not Working

**Problem:** App doesn't work offline

**Solutions:**
1. Visit pages while online first (to cache them)
2. Check service worker is active (DevTools > Application)
3. Verify cache storage has data (DevTools > Application > Cache Storage)
4. Check network requests are being intercepted

### Push Notifications Not Working

**Problem:** Notifications not received

**Solutions:**
1. Verify VAPID keys are set correctly
2. Check notification permission is granted
3. Verify subscription saved to database
4. Check browser console for errors
5. Test with `sendTestNotification()`
6. Ensure user is subscribed (check `isSubscribed` state)

### Icons Not Displaying

**Problem:** App icons don't show correctly

**Solutions:**
1. Regenerate icons: `node scripts/generateIcons.mjs`
2. Clear browser cache
3. Check manifest.json is accessible
4. Verify icon paths in manifest.json
5. Check icon sizes match requirements

## 11. Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge | Samsung Internet |
|---------|--------|--------|---------|------|------------------|
| Service Worker | ✅ | ✅ | ✅ | ✅ | ✅ |
| Install to Home Screen | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ⚠️ | ✅ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ Full support | ⚠️ Partial support | ❌ Not supported

## 12. Testing Commands

```bash
# Generate VAPID keys
node scripts/generateVapidKeys.mjs

# Regenerate icons
node scripts/generateIcons.mjs

# Regenerate screenshots
node scripts/generateScreenshots.mjs

# Build for production
npm run build

# Preview production build
npm run preview

# Run with HTTPS locally (for PWA testing)
npm run dev -- --https
```

## 13. Environment Variables Reference

Required variables:

```env
# Supabase (existing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# Stripe (existing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (existing)
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=your_domain

# PWA - Push Notifications (NEW)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Marketing Site (existing)
MARKETING_SITE_URL=https://your-site.com
```

## 14. API Endpoints

### Push Notifications

**Subscribe:**
```typescript
POST /api/notifications/subscribe
Body: {
  endpoint: string,
  keys: {
    p256dh: string,
    auth: string
  }
}
```

**Unsubscribe:**
```typescript
POST /api/notifications/unsubscribe
Body: {
  endpoint: string
}
```

**Send Test:**
```typescript
POST /api/notifications/send-test
Body: {} (empty)
```

## 15. Support

For issues or questions:

1. Check this guide first
2. Review `/docs/pwa-guide.md` for detailed documentation
3. Check browser console for errors
4. Verify all environment variables are set
5. Test in incognito/private mode
6. Clear cache and try again

## 16. Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [@vite-pwa/nuxt Guide](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
