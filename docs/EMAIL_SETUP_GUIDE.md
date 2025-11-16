# Email System Quick Setup Guide

This guide will help you get the email notification system up and running quickly.

## Prerequisites

- Mailgun account (free tier available)
- Supabase database access
- Admin access to the application

## Step 1: Mailgun Setup

1. **Sign up for Mailgun** at https://www.mailgun.com
2. **Add and verify your domain** in the Mailgun dashboard
3. **Set up DNS records** (SPF, DKIM, DMARC) for email authentication
4. **Get your API credentials**:
   - API Key (starts with `key-...`)
   - Domain (e.g., `mg.yourdomain.com`)

## Step 2: Environment Configuration

Add these variables to your `.env` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=key-your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key

# Email Addresses
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_REPLY_TO_ADDRESS=support@yourdomain.com

# Application URL (for unsubscribe links)
MARKETING_SITE_URL=https://yourdomain.com
```

**Important**: The `MAILGUN_WEBHOOK_SIGNING_KEY` is different from the API key. Find it in:
- Mailgun Dashboard → Sending → Webhooks → "HTTP webhook signing key"

## Step 3: Database Migration

Execute the database schema to create required tables:

1. **Open Supabase SQL Editor**
2. **Run the migration**:
   ```sql
   -- Copy and paste contents from:
   -- /docs/database/email-system-schema.sql
   ```
3. **Verify tables were created**:
   - `email_templates`
   - `email_logs`
   - `email_queue`
   - `email_preferences`
   - `email_batches`

## Step 4: Seed Default Templates

Seed the database with default email templates:

### Option A: Using API (Recommended)

```bash
curl -X POST https://yourdomain.com/api/email/seed-templates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Option B: Using Code

```typescript
// In your application (admin only)
const { $fetch } = useNuxtApp()

try {
  const result = await $fetch('/api/email/seed-templates', {
    method: 'POST',
  })
  console.log('Templates seeded:', result)
} catch (error) {
  console.error('Seeding failed:', error)
}
```

## Step 5: Configure Mailgun Webhooks

Set up webhooks to track email delivery and engagement:

1. **Go to Mailgun Dashboard** → Sending → Webhooks
2. **Copy your webhook signing key**:
   - Look for "HTTP webhook signing key" at the top of the page
   - Copy this key and add it to your `.env` as `MAILGUN_WEBHOOK_SIGNING_KEY`
3. **Add webhook URL**: `https://yourdomain.com/api/email/webhook`
4. **Select events to track**:
   - ☑️ Delivered
   - ☑️ Opened
   - ☑️ Clicked
   - ☑️ Failed
   - ☑️ Bounced
   - ☑️ Complained (spam)
5. **Save webhook configuration**

**Security Note**: The webhook endpoint verifies all requests using the signing key to prevent spoofing.

## Step 6: Test Email Sending

Send a test email to verify everything works:

```typescript
const emailService = useEmailService()

// Send a test enrollment confirmation
await emailService.sendEmail({
  templateSlug: 'enrollment-confirmation',
  recipientEmail: 'your-email@example.com',
  recipientName: 'Test User',
  templateData: {
    parent_name: 'Test Parent',
    student_name: 'Test Student',
    class_name: 'Ballet Basics',
    class_day: 'Monday',
    class_time: '4:00 PM',
    teacher_name: 'Ms. Smith',
    start_date: 'Today',
  },
})
```

## Step 7: Set Up Queue Processing (Optional but Recommended)

For scheduled emails, set up automatic queue processing:

### Option A: GitHub Actions

Create `.github/workflows/process-email-queue.yml`:

```yaml
name: Process Email Queue
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Process Queue
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/email/queue/process \
            -H "Content-Type: application/json" \
            -d '{"limit": 100}'
```

### Option B: Vercel Cron (if using Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/email/queue/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Option C: Manual Processing

Process queue manually when needed:

```typescript
await $fetch('/api/email/queue/process', {
  method: 'POST',
  body: { limit: 100 },
})
```

## Verification Checklist

After setup, verify:

- [ ] Database tables created successfully
- [ ] Environment variables configured
- [ ] Default templates seeded (6 templates)
- [ ] Test email sent and received
- [ ] Test email appears in `email_logs` table
- [ ] Mailgun webhook configured
- [ ] Webhook events updating `email_logs` (check after opening test email)
- [ ] Unsubscribe page accessible at `/unsubscribe?token=test`
- [ ] Queue processing working (if scheduled emails needed)

## Common Issues

### Issue: Emails not sending

**Solutions**:
1. Verify Mailgun API key is correct
2. Check Mailgun domain is verified (green checkmark in dashboard)
3. Review Mailgun logs for errors
4. Check `email_logs` table for error messages

### Issue: Emails going to spam

**Solutions**:
1. Verify DNS records (SPF, DKIM, DMARC) are correct
2. Send from verified domain
3. Include unsubscribe link (automatic)
4. Add physical address to studio profile

### Issue: Webhooks not working

**Solutions**:
1. Verify webhook URL is publicly accessible (not localhost)
2. Check webhook signature verification
3. Review Mailgun webhook logs
4. Test webhook with Mailgun's "Test Webhook" button

### Issue: Template variables not replaced

**Solutions**:
1. Use correct syntax: `{{variable_name}}`
2. Ensure variable names match exactly (case-sensitive)
3. Pass variables in `templateData` object

## Next Steps

1. **Customize Templates**: Edit default templates to match your branding
2. **Create Custom Templates**: Add templates for your specific needs
3. **Set Up Automations**: Integrate email sending into your workflows
4. **Monitor Analytics**: Review email performance in `email_logs`
5. **Build UI**: Create admin pages for email management (optional)

## Support

For detailed documentation, see:
- [Email Notification System Documentation](/docs/email-notification-system.md)
- [Database Schema](/docs/database/email-system-schema.sql)
- [API Endpoints](/server/api/email/*)

For Mailgun-specific issues:
- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Mailgun Support](https://www.mailgun.com/support/)

## Quick Reference

### Send Email
```typescript
await useEmailService().sendEmail({
  templateSlug: 'template-name',
  recipientEmail: 'user@example.com',
  recipientName: 'User Name',
  templateData: { /* variables */ },
})
```

### Send Batch Emails
```typescript
await useEmailService().sendBatchEmails({
  batchName: 'Campaign Name',
  templateId: 'uuid',
  recipients: [/* array of recipients */],
})
```

### Schedule Email
```typescript
await useEmailService().sendEmail({
  // ... email data
  scheduledFor: '2024-12-01T09:00:00Z',
})
```

### Preview Template
```typescript
const preview = await useEmailService().previewTemplate(
  'template-id',
  { /* sample data */ }
)
```

---

**Setup Complete!** You're now ready to send beautiful, tracked emails to your studio community.
