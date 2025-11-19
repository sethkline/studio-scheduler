# Security Testing Guide

This guide provides instructions for testing the security configurations implemented in the application.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Fill in the required values in .env
   ```

## Testing Security Headers

### 1. Build for Production

```bash
NODE_ENV=production npm run build
```

This will:
- Disable devtools
- Disable PWA devOptions
- Enable strict security headers
- Apply production-only CSP policies

### 2. Start Production Server

```bash
NODE_ENV=production npm run preview
```

### 3. Test Security Headers

Use curl to check response headers:

```bash
# Test main page
curl -I http://localhost:3000

# Expected headers:
# - Content-Security-Policy: (with Stripe and Supabase domains)
# - Strict-Transport-Security: max-age=31536000; includeSubdomains; preload
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: SAMEORIGIN
# - X-XSS-Protection: 1; mode=block
# - Referrer-Policy: strict-origin-when-cross-origin
# - Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)
```

Or use browser DevTools:
1. Open Network tab
2. Navigate to any page
3. Click on the document request
4. View Response Headers

### 4. Test Rate Limiting

#### Public API Endpoints (50 requests/minute):

```bash
# Test /api/public/* rate limiting
for i in {1..60}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/public/test
  sleep 0.1
done
```

Expected: First 50 requests return 200, subsequent requests return 429 (Too Many Requests)

#### Payment Endpoints (30 requests/minute):

```bash
# Test /api/payments/* rate limiting
for i in {1..40}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/payments/test
  sleep 0.1
done
```

Expected: First 30 requests succeed, subsequent requests return 429

### 5. Test Content Security Policy

Open browser console and check for CSP violations:

1. Navigate to any page
2. Open Developer Console
3. Look for CSP violation messages
4. Ensure Stripe and Supabase resources load without errors

#### Allowed Domains

The CSP allows:
- **Stripe**: `*.stripe.com`, `js.stripe.com`, `api.stripe.com`
- **Supabase**: `*.supabase.co` (HTTP and WebSocket)
- **Self**: Application's own origin

#### Test CSP Violations

Try to load resources from unauthorized domains:
```javascript
// This should be blocked by CSP
const script = document.createElement('script');
script.src = 'https://evil.com/malicious.js';
document.head.appendChild(script);
```

### 6. Test Environment-Based Configuration

#### Development Mode:

```bash
NODE_ENV=development npm run dev
```

Check that:
- DevTools are accessible at `http://localhost:3000/__nuxt_devtools__/client/`
- PWA devOptions are enabled
- CSP is less restrictive

#### Production Mode:

```bash
NODE_ENV=production npm run preview
```

Check that:
- DevTools are NOT accessible
- PWA devOptions are disabled
- Strict CSP is enforced
- HSTS header is present

## Lighthouse Security Audit

Run Lighthouse audit to check for security issues:

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Performance", "Best Practices", and "SEO"
4. Run audit
5. Check "Security" section in Best Practices

Expected results:
- ✅ Uses HTTPS (in production deployment)
- ✅ Has valid HSTS header
- ✅ Has valid CSP
- ✅ No security vulnerabilities detected

## Security Checklist

- [ ] All required environment variables are set (see .env.example)
- [ ] Production build completes without errors
- [ ] Security headers are present in responses
- [ ] CSP allows Stripe and Supabase, blocks unauthorized domains
- [ ] Rate limiting works for public endpoints
- [ ] DevTools disabled in production
- [ ] PWA devOptions disabled in production
- [ ] HSTS header present with correct values
- [ ] X-Frame-Options prevents clickjacking
- [ ] Permissions-Policy restricts sensitive features
- [ ] No CSP violations in browser console
- [ ] Lighthouse security audit shows no major issues

## Common Issues

### CSP Violations

If you see CSP violations:
1. Check browser console for specific blocked resources
2. Verify the domain is in the allowed list in `nuxt.config.ts`
3. Add necessary domains to CSP configuration

### Rate Limiting Not Working

If rate limiting doesn't work:
1. Ensure nuxt-security module is installed: `npm list nuxt-security`
2. Check routeRules in `nuxt.config.ts`
3. Clear cache and restart server

### Environment Variables Not Validated

If validation doesn't run:
1. Check that `validateEnvironmentVariables()` is called before `defineNuxtConfig`
2. Verify NODE_ENV is set correctly
3. Check console for warning messages

## Additional Tools

### Security Headers Testing

Use online tools to test security headers:
- https://securityheaders.com
- https://observatory.mozilla.org

### SSL/TLS Testing (Production)

Once deployed with HTTPS:
- https://www.ssllabs.com/ssltest/

### Penetration Testing

For comprehensive security testing:
- OWASP ZAP: https://www.zaproxy.org/
- Burp Suite: https://portswigger.net/burp

## References

- [Nuxt Security Module](https://nuxt-security.vercel.app/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
