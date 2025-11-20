# Deployment Guide

## Overview

This guide covers deploying the Studio Scheduler application to production. The application is built with Nuxt 3 and can be deployed to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:

- [ ] Supabase project set up with database migrations run
- [ ] Stripe account (production keys)
- [ ] Mailgun account configured
- [ ] Domain name (optional but recommended)
- [ ] SSL certificate (provided by most hosting platforms)

## Environment Variables

### Required Production Variables

Create a `.env` file or configure environment variables in your hosting platform:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_KEY=your-production-service-key

# Stripe Configuration (PRODUCTION KEYS)
STRIPE_PUBLISHABLE_KEY=pk_live_your-production-key
STRIPE_SECRET_KEY=sk_live_your-production-key

# Mailgun Configuration
MAILGUN_API_KEY=your-production-mailgun-key
MAILGUN_DOMAIN=mg.yourdomain.com

# Application URL
MARKETING_SITE_URL=https://yourdomain.com

# Node Environment
NODE_ENV=production
```

**IMPORTANT**: Never commit real credentials to version control. Use your hosting platform's environment variable management.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides excellent support for Nuxt 3 applications with zero configuration.

#### Steps:

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy via CLI**:
   ```bash
   vercel
   ```
   Or deploy via GitHub integration at [vercel.com](https://vercel.com)

3. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables from the list above
   - Ensure "Production" is selected

4. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.output`
   - Install Command: `npm install`
   - Node Version: 18.x or higher

5. **Deploy**:
   ```bash
   vercel --prod
   ```

#### Vercel Configuration File (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "nuxt.config.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

### Option 2: Netlify

Netlify also provides excellent Nuxt 3 support.

#### Steps:

1. **Create `netlify.toml`** in project root:
   ```toml
   [build]
     command = "npm run build"
     publish = ".output/public"

   [[redirects]]
     from = "/*"
     to = "/"
     status = 200
   ```

2. **Deploy via CLI**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```
   Or connect your GitHub repository at [netlify.com](https://netlify.com)

3. **Configure Environment Variables**:
   - Go to Site Settings → Build & Deploy → Environment
   - Add all required variables

### Option 3: Self-Hosted (VPS/Server)

For complete control, deploy to your own server.

#### Requirements:
- Node.js 18.x or higher
- PM2 or similar process manager
- Nginx or Apache (reverse proxy)
- SSL certificate (Let's Encrypt recommended)

#### Steps:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Transfer files to server**:
   ```bash
   rsync -avz .output/ user@server:/var/www/studio-scheduler/
   ```

3. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

4. **Start the application**:
   ```bash
   cd /var/www/studio-scheduler
   pm2 start .output/server/index.mjs --name studio-scheduler
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL** (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 4: Docker

Deploy using Docker containers.

#### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["node", ".output/server/index.mjs"]
```

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  studio-scheduler:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

#### Deploy:

```bash
docker-compose up -d
```

## Database Migration

### Initial Setup

1. **Run Supabase migrations**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run migration scripts in order from `/supabase/migrations/`

2. **Set up Row-Level Security (RLS)**:
   - Ensure all RLS policies are enabled
   - Test with different user roles
   - Verify public access to public pages

3. **Seed initial data** (if needed):
   ```sql
   -- Create initial studio profile
   INSERT INTO studio_profile (name, email)
   VALUES ('Your Studio Name', 'contact@yourstudio.com');
   ```

### Migration Process

For future schema changes:

1. **Create migration file** in Supabase dashboard
2. **Test in staging environment** first
3. **Back up production database**
4. **Apply migration** to production
5. **Verify** all features work correctly

## Post-Deployment Checklist

### Functionality Testing

- [ ] User authentication (sign up, login, logout)
- [ ] Role-based access control (admin, staff, teacher, parent)
- [ ] Class scheduling and management
- [ ] Recital creation and program building
- [ ] Ticket purchase flow
- [ ] Stripe payment processing
- [ ] Email notifications
- [ ] PDF generation (tickets, programs)
- [ ] QR code scanning
- [ ] Real-time seat updates
- [ ] PWA installation and offline functionality

### Performance Testing

- [ ] Page load times < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Mobile responsiveness
- [ ] Database query performance
- [ ] Image optimization
- [ ] Service worker caching

### Security Testing

- [ ] SSL certificate installed and working
- [ ] Environment variables not exposed
- [ ] RLS policies functioning correctly
- [ ] API endpoints protected
- [ ] CSRF protection enabled
- [ ] Webhook signature verification
- [ ] SQL injection prevention
- [ ] XSS protection

### Monitoring Setup

- [ ] Error tracking (Sentry, Rollbar, etc.)
- [ ] Analytics (Google Analytics, Plausible, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Database performance monitoring
- [ ] Payment webhook monitoring

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
SUPABASE_URL=https://dev-project.supabase.co
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
MARKETING_SITE_URL=http://localhost:3000
```

### Staging

```bash
NODE_ENV=staging
SUPABASE_URL=https://staging-project.supabase.co
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
MARKETING_SITE_URL=https://staging.yourdomain.com
```

### Production

```bash
NODE_ENV=production
SUPABASE_URL=https://prod-project.supabase.co
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
MARKETING_SITE_URL=https://yourdomain.com
```

## Stripe Webhook Configuration

### Production Setup

1. **Create webhook endpoint** in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. **Get webhook signing secret**:
   - Copy the webhook signing secret from Stripe
   - Add to environment variables as `STRIPE_WEBHOOK_SECRET`

3. **Test webhook**:
   ```bash
   stripe trigger checkout.session.completed
   ```

## Mailgun Configuration

### Production Setup

1. **Verify domain** in Mailgun dashboard
2. **Add DNS records** (MX, TXT, CNAME)
3. **Test email delivery**:
   ```bash
   curl -s --user 'api:YOUR_API_KEY' \
     https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
     -F from='Studio <noreply@yourdomain.com>' \
     -F to='test@example.com' \
     -F subject='Test Email' \
     -F text='Testing email delivery'
   ```

## Continuous Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Rollback Procedure

If deployment fails or issues arise:

1. **Vercel/Netlify**: Use platform's rollback feature
   ```bash
   vercel rollback
   ```

2. **Self-hosted**: Revert to previous PM2 deployment
   ```bash
   pm2 restart studio-scheduler
   ```

3. **Database**: Restore from backup
   - Use Supabase point-in-time recovery
   - Or restore from manual backup

## Monitoring and Alerts

### Recommended Tools

- **Sentry**: Error tracking and performance monitoring
- **Supabase Dashboard**: Database metrics and logs
- **Stripe Dashboard**: Payment monitoring and alerts
- **UptimeRobot**: Website uptime monitoring
- **Google Analytics**: User behavior and traffic

### Key Metrics to Monitor

- API response times
- Database query performance
- Error rates
- Payment success rates
- Email delivery rates
- User authentication success
- PWA installation rates

## Troubleshooting

### Common Issues

**Build Failures**:
- Check Node.js version (must be 18+)
- Verify all dependencies are installed
- Check for TypeScript errors

**Environment Variable Issues**:
- Ensure all required variables are set
- Check for typos in variable names
- Verify values are not wrapped in quotes (unless needed)

**Database Connection Errors**:
- Verify Supabase URL and keys
- Check RLS policies
- Ensure database is not paused (free tier)

**Payment Issues**:
- Verify Stripe keys (test vs. production)
- Check webhook endpoint is accessible
- Verify webhook signature validation

## Support

For deployment issues:

1. Check [Nuxt Deployment Docs](https://nuxt.com/docs/getting-started/deployment)
2. Review [Supabase Docs](https://supabase.com/docs)
3. Consult platform-specific documentation
4. Open an issue in the project repository

## Related Documentation

- [Architecture Guide](/docs/architecture.md)
- [Testing Guide](/docs/testing.md)
- [Environment Variables](/.env.example)
- [Database Schema](/docs/database/recital-program-db.md)
