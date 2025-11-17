# Public Studio Website - Deployment Guide

This guide covers deploying the new public-facing studio website (Story 2.3).

## Overview

The application has been restructured to support both public-facing pages and admin portal:
- **Public pages**: Root level (`/`, `/classes`, `/teachers`, etc.)
- **Admin pages**: `/admin/*` routes (protected by authentication)
- **Parent portal**: `/parent/*` routes (existing, unchanged)
- **Public recitals**: `/public/recitals/*` (existing ticketing, unchanged)

## Pre-Deployment Checklist

### 1. Database Migration

Run the blog and newsletter tables migration:

```sql
-- Run this in your Supabase SQL editor or via CLI
-- File: supabase/migrations/add_blog_tables.sql
```

This creates:
- `blog_posts` table for CMS
- `newsletter_subscribers` table for email marketing
- Adds theme color columns to `studio_profile`

### 2. Environment Variables

Update your `.env` file with these new variables:

```bash
# Base URL for your studio website (required for SEO)
MARKETING_SITE_URL=https://yourstudio.com

# Google Analytics 4 (optional)
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Existing variables (ensure these are set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
```

### 3. Update robots.txt Domain

Edit `/public/robots.txt` and replace `yourdomain.com` with your actual domain:

```txt
Sitemap: https://yourstudio.com/sitemap.xml
```

### 4. Prepare Open Graph Image

Create a branded social sharing image:
- **Size**: 1200x630 pixels
- **Format**: JPG or PNG
- **Location**: `/public/og-image.jpg` (or PNG)
- **Content**: Studio logo, name, and tagline

If you don't have one, the system will fall back to your studio logo.

## Deployment Steps

### Step 1: Build and Test Locally

```bash
# Install dependencies
npm install

# Run database migration (if using Supabase CLI)
npx supabase migration up

# Start dev server
npm run dev

# Test the following:
# - Public home page: http://localhost:3000
# - Admin dashboard: http://localhost:3000/admin/dashboard (requires login)
# - All public pages render without errors
# - Theme colors apply if configured in Studio Profile
```

### Step 2: Configure Studio Settings

1. **Login as admin** at `/login`
2. **Go to Admin → Studio Profile** (`/admin/studio/profile`)
3. **Configure theme colors** (optional):
   - Primary Color: Main brand color (e.g., `#8b5cf6`)
   - Secondary Color: Accent color (e.g., `#ec4899`)
   - Accent Color: Highlight color (e.g., `#f59e0b`)
4. **Verify studio information** is complete:
   - Name, description, email, phone
   - Social media links
   - Logo uploaded

### Step 3: Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

### Step 4: Deploy to Hosting

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# https://vercel.com/yourstudio/settings/environment-variables
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

#### Option C: Node.js Server

```bash
# Build
npm run build

# Start production server
node .output/server/index.mjs
```

### Step 5: Post-Deployment Verification

Visit these URLs and verify they work:

**Public Pages (should work WITHOUT login):**
- [ ] Home: `https://yourstudio.com/`
- [ ] Classes: `https://yourstudio.com/classes`
- [ ] Teachers: `https://yourstudio.com/teachers`
- [ ] Schedule: `https://yourstudio.com/schedule`
- [ ] Contact: `https://yourstudio.com/contact`
- [ ] About: `https://yourstudio.com/about`
- [ ] Pricing: `https://yourstudio.com/pricing`
- [ ] Gallery: `https://yourstudio.com/gallery`
- [ ] Blog: `https://yourstudio.com/blog`

**Admin Pages (should redirect to login if not authenticated):**
- [ ] Admin Dashboard: `https://yourstudio.com/admin/dashboard`
- [ ] Class Management: `https://yourstudio.com/admin/classes`

**SEO & Technical:**
- [ ] Sitemap: `https://yourstudio.com/sitemap.xml`
- [ ] Robots.txt: `https://yourstudio.com/robots.txt`
- [ ] OG Image: `https://yourstudio.com/og-image.jpg` (if uploaded)

### Step 6: Update Bookmarks

Notify your staff to update their bookmarks:

| Old URL | New URL |
|---------|---------|
| `/` | `/admin/dashboard` |
| `/classes` | `/admin/classes` |
| `/teachers` | `/admin/teachers` |
| `/schedules` | `/admin/schedules` |
| `/recitals` | `/admin/recitals` |
| `/studio/profile` | `/admin/studio/profile` |

**Note**: Old bookmarks will redirect to login automatically.

## SEO Setup

### Google Search Console

1. **Verify your site**: https://search.google.com/search-console
2. **Submit sitemap**: Add `https://yourstudio.com/sitemap.xml`
3. **Request indexing** for key pages

### Google Analytics 4

1. **Create GA4 property**: https://analytics.google.com
2. **Copy Measurement ID** (starts with `G-`)
3. **Add to environment variables**:
   ```bash
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ```

### Social Media

Test your OG images:
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

## Content Management

### Creating Blog Posts

Currently, blog posts must be added directly to the database. A future admin UI is planned.

**Manual creation via Supabase**:

```sql
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  category,
  status,
  published_at
) VALUES (
  'Welcome to Our New Website',
  'welcome-new-website',
  'We''re excited to announce our brand new website...',
  '<p>Full HTML content here...</p>',
  'news',
  'published',
  NOW()
);
```

### Managing Newsletter Subscribers

View subscribers in Supabase:

```sql
SELECT email, name, subscribed_at
FROM newsletter_subscribers
WHERE status = 'active'
ORDER BY subscribed_at DESC;
```

## Troubleshooting

### Issue: Admin pages show 404

**Solution**: Run database migrations to ensure all tables exist.

### Issue: Theme colors not applying

**Solution**:
1. Check Studio Profile has theme colors set
2. Clear browser cache
3. Verify CSS custom properties in browser DevTools

### Issue: Sitemap returns empty

**Solution**: Check database has published blog posts and recital shows.

### Issue: Images not loading

**Solution**: Verify Supabase Storage is configured and public bucket permissions are set.

### Issue: Analytics not tracking

**Solution**:
1. Verify `GOOGLE_ANALYTICS_ID` is set
2. Check browser console for errors
3. Disable ad blockers for testing

## Performance Optimization

### Recommended Settings

1. **Enable caching** on your CDN/hosting provider
2. **Compress images** before uploading
3. **Use WebP format** for logo and OG image
4. **Enable Gzip/Brotli** compression

### Lighthouse Targets

Aim for these scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

## Support & Maintenance

### Regular Tasks

- **Weekly**: Review new newsletter subscribers
- **Monthly**: Update blog with new content
- **Quarterly**: Review Google Analytics data
- **Yearly**: Refresh OG images and testimonials

### Backup Strategy

Ensure you have backups of:
- Supabase database (automatic with Supabase)
- Environment variables
- Custom OG images
- Studio logo files

## Future Enhancements

Features planned for future releases:
- Admin UI for blog post management
- Email welcome series for trial class signups
- A/B testing for landing page CTAs
- Newsletter automation and templates
- Advanced analytics dashboard
- Testimonial submission form

## Questions?

Refer to:
- Project README: `/README.md`
- CLAUDE.md: Project overview for AI assistants
- Database docs: `/docs/database/`

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Version**: 2.3.0 (Public Website Launch)
