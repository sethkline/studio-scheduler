# Email Notification System Documentation

## Overview

The email notification system provides a comprehensive solution for sending automated and manual emails to parents, teachers, and other users. It includes template management, scheduled sending, email tracking, and unsubscribe functionality.

## Features

- ✅ **Template-Based Emails**: Create and manage reusable email templates with MJML
- ✅ **Personalization**: Dynamic variable replacement for personalized emails
- ✅ **Studio Branding**: Automatic inclusion of studio logo, colors, and contact information
- ✅ **HTML & Plain Text**: Dual-format emails for maximum compatibility
- ✅ **Delivery Tracking**: Track email delivery, opens, and clicks via Mailgun webhooks
- ✅ **Batch Sending**: Send emails to multiple recipients efficiently
- ✅ **Scheduled Emails**: Queue emails for future delivery
- ✅ **Unsubscribe Management**: Legal compliance with CAN-SPAM Act
- ✅ **Email Preferences**: Granular control over email categories
- ✅ **Email Analytics**: Track performance metrics (open rate, click rate, etc.)

## Architecture

### Database Schema

The system uses 5 main tables:

1. **`email_templates`**: Store email templates with MJML/HTML content
2. **`email_logs`**: Track all sent emails and their delivery status
3. **`email_queue`**: Queue for scheduled and batch emails
4. **`email_preferences`**: User email preferences and unsubscribe tokens
5. **`email_batches`**: Track batch email campaigns

See `/docs/database/email-system-schema.sql` for the complete schema.

### Key Components

- **Email Service** (`/server/utils/emailService.ts`): Core service for sending emails
- **Email Templates** (`/server/utils/emailTemplates.ts`): Default template definitions
- **API Endpoints** (`/server/api/email/*`): REST endpoints for email operations
- **Composable** (`/composables/useEmailService.ts`): Vue composable for frontend
- **Unsubscribe Page** (`/pages/unsubscribe.vue`): Self-service unsubscribe interface

## Getting Started

### 1. Database Setup

Run the database migration to create the required tables:

```sql
-- Execute the schema in your Supabase SQL editor
-- File: /docs/database/email-system-schema.sql
```

### 2. Environment Variables

Ensure these environment variables are set in `.env`:

```env
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=mg.yourdomain.com
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_REPLY_TO_ADDRESS=support@yourdomain.com
MARKETING_SITE_URL=https://yourdomain.com
```

### 3. Seed Default Templates

Seed the database with default email templates:

```bash
# Make a POST request to the seed endpoint (admin only)
curl -X POST https://yourdomain.com/api/email/seed-templates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or use the API in your application:

```typescript
const { $fetch } = useNuxtApp()
await $fetch('/api/email/seed-templates', { method: 'POST' })
```

### 4. Configure Mailgun Webhook

Set up a webhook in your Mailgun dashboard to track email events:

**Webhook URL**: `https://yourdomain.com/api/email/webhook`

**Events to track**:
- Delivered
- Opened
- Clicked
- Failed
- Bounced
- Complained

## Usage

### Sending a Single Email

```typescript
const emailService = useEmailService()

await emailService.sendEmail({
  templateSlug: 'enrollment-confirmation',
  recipientEmail: 'parent@example.com',
  recipientName: 'John Doe',
  recipientType: 'parent',
  recipientId: 'parent-uuid',
  templateData: {
    parent_name: 'John',
    student_name: 'Jane Doe',
    class_name: 'Ballet Basics',
    class_day: 'Monday',
    class_time: '4:00 PM',
    teacher_name: 'Ms. Smith',
    start_date: 'September 1, 2024',
  },
  metadata: {
    enrollment_id: 'enrollment-uuid',
  },
})
```

### Sending Batch Emails

```typescript
const emailService = useEmailService()

await emailService.sendBatchEmails({
  batchName: 'Monthly Newsletter',
  description: 'November 2024 Newsletter',
  templateId: 'template-uuid',
  recipients: [
    {
      email: 'parent1@example.com',
      name: 'Parent One',
      type: 'parent',
      templateData: {
        parent_name: 'Parent One',
        student_name: 'Student One',
      },
    },
    {
      email: 'parent2@example.com',
      name: 'Parent Two',
      type: 'parent',
      templateData: {
        parent_name: 'Parent Two',
        student_name: 'Student Two',
      },
    },
  ],
  scheduledFor: '2024-11-01T09:00:00Z', // Optional: schedule for future
})
```

### Scheduling an Email

```typescript
await emailService.sendEmail({
  templateSlug: 'class-reminder',
  recipientEmail: 'parent@example.com',
  recipientName: 'John Doe',
  templateData: {
    parent_name: 'John',
    student_name: 'Jane',
    class_name: 'Ballet',
    class_date: 'Tomorrow',
    class_time: '4:00 PM',
  },
  scheduledFor: '2024-11-05T08:00:00Z', // Send at 8 AM tomorrow
})
```

### Creating a Custom Template

```typescript
const emailService = useEmailService()

await emailService.createTemplate({
  name: 'Welcome Email',
  slug: 'welcome-email',
  category: 'system',
  subject: 'Welcome to {{studio_name}}!',
  description: 'Sent when a new parent registers',
  mjml_content: `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px">
          Welcome {{parent_name}}!
        </mj-text>
        <mj-text>
          We're excited to have you join {{studio_name}}.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `,
  template_variables: ['parent_name', 'studio_name'],
  use_studio_branding: true,
  is_active: true,
})
```

### Previewing a Template

```typescript
const preview = await emailService.previewTemplate('template-uuid', {
  parent_name: 'John Doe',
  student_name: 'Jane Doe',
  class_name: 'Ballet',
})

// preview.html contains the rendered HTML
// preview.text contains the plain text version
// preview.subject contains the rendered subject line
```

### Fetching Email Logs

```typescript
const logs = await emailService.fetchLogs({
  recipient_email: 'parent@example.com',
  status: 'delivered',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  limit: 50,
  offset: 0,
})

// logs.logs contains the email log entries
// logs.total contains the total count
```

### Email Analytics

```typescript
const logs = await emailService.fetchLogs({
  template_id: 'template-uuid',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
})

const analytics = emailService.formatAnalytics(logs.logs)

// analytics contains:
// - total: total emails sent
// - delivered: successfully delivered
// - failed: failed deliveries
// - opened: unique opens
// - clicked: unique clicks
// - delivery_rate: percentage delivered
// - open_rate: percentage opened
// - click_rate: percentage clicked
```

## Template Variables

### Common Variables

These variables are available in all templates:

- `{{studio_name}}` - Studio name
- `{{studio_logo_url}}` - Studio logo URL
- `{{studio_email}}` - Studio contact email
- `{{studio_phone}}` - Studio phone number
- `{{studio_website}}` - Studio website URL
- `{{recipient_name}}` - Recipient's name
- `{{unsubscribe_url}}` - Unsubscribe link (auto-generated)

### Template-Specific Variables

Each template can define its own variables. Common examples:

**Enrollment Emails**:
- `{{parent_name}}`, `{{student_name}}`, `{{class_name}}`, `{{class_day}}`, `{{class_time}}`, `{{teacher_name}}`, `{{start_date}}`

**Payment Emails**:
- `{{amount}}`, `{{payment_date}}`, `{{payment_method}}`, `{{invoice_number}}`, `{{description}}`

**Recital Emails**:
- `{{recital_name}}`, `{{recital_date}}`, `{{recital_time}}`, `{{recital_location}}`, `{{important_info}}`

## Email Categories

The system supports 6 email categories:

1. **enrollment**: Class enrollment and registration
2. **payment**: Billing, receipts, and payment reminders
3. **recital**: Recital information and updates
4. **announcement**: General studio announcements
5. **reminder**: Class and event reminders
6. **system**: System notifications (password reset, etc.)

Users can unsubscribe from individual categories while staying subscribed to others.

## MJML Templates

MJML is a markup language that makes responsive email design easy. Example:

```xml
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px">
          {{subject_title}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px">
      <mj-column>
        <mj-text>Hello {{recipient_name}},</mj-text>
        <mj-text>{{email_content}}</mj-text>
        <mj-button background-color="#8b5cf6" href="{{action_url}}">
          {{button_text}}
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

MJML resources:
- [MJML Documentation](https://documentation.mjml.io/)
- [MJML Try It Live](https://mjml.io/try-it-live)

## Unsubscribe System

### Legal Compliance

The system is designed to comply with the CAN-SPAM Act and GDPR:

1. ✅ Every email includes an unsubscribe link
2. ✅ Unsubscribe requests are processed immediately
3. ✅ Users can manage preferences without authentication
4. ✅ Unsubscribe links are valid indefinitely
5. ✅ Physical mailing address included in footer (via studio profile)

### Unsubscribe URL

Unsubscribe links follow this format:

```
https://yourdomain.com/unsubscribe?token=UNIQUE_TOKEN
```

The token is automatically generated for each email address and stored in `email_preferences`.

### Preference Management

Users can:
- Unsubscribe from all emails
- Unsubscribe from specific categories
- Resubscribe if they change their mind
- View their current preferences without logging in

## Queue Processing

### Manual Processing

Process the email queue manually:

```typescript
await $fetch('/api/email/queue/process', {
  method: 'POST',
  body: { limit: 100 }, // Process up to 100 emails
})
```

### Automated Processing (Recommended)

Set up a cron job to process the queue automatically:

**Using GitHub Actions** (example):

```yaml
name: Process Email Queue
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  process-queue:
    runs-on: ubuntu-latest
    steps:
      - name: Process Email Queue
        run: |
          curl -X POST https://yourdomain.com/api/email/queue/process \
            -H "Content-Type: application/json" \
            -d '{"limit": 100}'
```

**Using Vercel Cron** (if deployed to Vercel):

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

## Webhook Event Handling

Mailgun sends webhook events for email tracking. The system handles these events automatically:

- **delivered**: Email successfully delivered
- **opened**: Email opened by recipient
- **clicked**: Link clicked in email
- **failed**: Delivery failed (temporary)
- **bounced**: Email bounced (permanent failure)
- **complained**: Recipient marked as spam

Events update the `email_logs` table and trigger unsubscribe for spam complaints.

## API Endpoints

### Email Templates

- `GET /api/email/templates` - List templates
- `GET /api/email/templates/:id` - Get template
- `POST /api/email/templates` - Create template
- `PUT /api/email/templates/:id` - Update template
- `DELETE /api/email/templates/:id` - Delete template
- `POST /api/email/templates/preview` - Preview template

### Email Sending

- `POST /api/email/send` - Send single email
- `POST /api/email/send-batch` - Send batch emails

### Email Logs

- `GET /api/email/logs` - Get email logs

### Email Queue

- `GET /api/email/queue` - Get queued emails
- `POST /api/email/queue/process` - Process queue

### Email Preferences

- `GET /api/email/preferences` - Get preferences
- `PUT /api/email/preferences` - Update preferences
- `POST /api/email/unsubscribe` - Unsubscribe

### Webhooks

- `POST /api/email/webhook` - Mailgun webhook handler

### Admin

- `POST /api/email/seed-templates` - Seed default templates

## Best Practices

### 1. Use Templates

Always use templates instead of hardcoding email content. This allows:
- Consistent branding
- Easy updates
- Reusability
- A/B testing potential

### 2. Test Before Sending

Always preview emails before sending to large batches:

```typescript
const preview = await emailService.previewTemplate(templateId, sampleData)
// Review preview.html before proceeding
```

### 3. Handle Errors Gracefully

```typescript
try {
  await emailService.sendEmail(emailRequest)
} catch (error) {
  console.error('Email send failed:', error)
  // Log error, notify admin, or retry later
}
```

### 4. Respect Unsubscribe Preferences

The API automatically checks unsubscribe status before sending. Never bypass this check.

### 5. Monitor Email Analytics

Regularly review email performance:

```typescript
const logs = await emailService.fetchLogs({
  template_id: templateId,
  start_date: startOfMonth,
  end_date: endOfMonth,
})

const analytics = emailService.formatAnalytics(logs.logs)

if (analytics.open_rate < 10) {
  // Consider improving subject line or content
}
```

### 6. Use Scheduling for Better Delivery

Send emails at optimal times:

```typescript
// Schedule for 9 AM tomorrow
const tomorrow9AM = new Date()
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1)
tomorrow9AM.setHours(9, 0, 0, 0)

await emailService.sendEmail({
  // ... email data
  scheduledFor: tomorrow9AM.toISOString(),
})
```

## Troubleshooting

### Emails Not Sending

1. Check Mailgun credentials in `.env`
2. Verify Mailgun domain is verified
3. Check email queue for failed items
4. Review `email_logs` for error messages

### Emails Going to Spam

1. Verify Mailgun DNS records (SPF, DKIM, DMARC)
2. Avoid spam trigger words in subject/content
3. Include physical address in footer
4. Monitor complaint rate via webhooks

### Webhooks Not Working

1. Verify webhook URL is publicly accessible
2. Check webhook signature verification
3. Review Mailgun webhook logs
4. Ensure HTTPS is enabled

### Template Variables Not Replacing

1. Verify variable names match exactly (case-sensitive)
2. Check that data is passed to `templateData`
3. Use double curly braces: `{{variable_name}}`

## Support

For issues or questions:

1. Check this documentation
2. Review code comments in `/server/utils/emailService.ts`
3. Check Mailgun logs for delivery issues
4. Review database logs in `email_logs` table

## Future Enhancements

Potential future features:

- [ ] Email template editor UI
- [ ] A/B testing for subject lines
- [ ] SMS notifications integration
- [ ] Email campaign analytics dashboard
- [ ] Advanced segmentation
- [ ] Drip campaigns
- [ ] Email automation workflows
- [ ] Rich text email composer
- [ ] Email template gallery
- [ ] Multi-language support
