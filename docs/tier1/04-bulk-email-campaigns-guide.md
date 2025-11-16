# Bulk Email Campaign System - Implementation Guide

## Overview

The Bulk Email Campaign System allows studio administrators to send targeted, professional emails to specific groups of parents, students, and staff. This includes recital announcements, reminders, updates, and emergency notifications with template management, scheduling, and tracking.

**Priority:** Tier 1 - Critical for Next Recital

---

## Business Requirements

### User Stories

**As an Admin/Staff member, I want to:**
- Send emails to all recital parents at once
- Target specific groups (by class, age, show, etc.)
- Use pre-built templates for common messages
- Schedule emails to send later
- Track who opened and clicked emails
- See delivery status and bounce rate
- Send urgent notifications immediately
- Attach files to bulk emails
- Preview emails before sending
- Save drafts for later

**As a Parent, I want to:**
- Receive important recital updates via email
- Have emails personalized with my child's name
- See clear subject lines
- Have the option to opt-out of non-essential emails
- Receive urgent notifications quickly

---

## Database Schema

### Tables to Create

#### 1. `email_campaigns`
Master campaign record.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals (nullable for studio-wide) |
| campaign_name | varchar(255) | Internal name |
| subject_line | varchar(255) | Email subject |
| from_name | varchar(255) | Sender name |
| from_email | varchar(255) | Sender email |
| reply_to_email | varchar(255) | Reply-to email |
| email_body_html | text | HTML email content |
| email_body_text | text | Plain text fallback |
| template_id | uuid | FK to email_templates (nullable) |
| target_audience | varchar(50) | 'all_parents', 'all_staff', 'specific_class', 'specific_students', 'custom_filter' |
| filter_criteria | jsonb | Filter configuration |
| status | varchar(50) | 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled' |
| schedule_send_at | timestamptz | When to send (null = send now) |
| sent_at | timestamptz | When actually sent |
| total_recipients | integer | Calculated total |
| sent_count | integer | Successfully sent |
| delivered_count | integer | Delivered (not bounced) |
| opened_count | integer | Opened (unique) |
| clicked_count | integer | Clicked link (unique) |
| bounced_count | integer | Hard bounces |
| failed_count | integer | Failed to send |
| unsubscribed_count | integer | Unsubscribed after |
| has_attachments | boolean | Has file attachments |
| is_urgent | boolean | Urgent notification |
| created_by | uuid | FK to profiles |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |
| sent_by | uuid | FK to profiles (who sent) |

**Indexes:**
- recital_id
- status
- schedule_send_at
- created_by

---

#### 2. `email_campaign_recipients`
Individual recipient records for tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | FK to email_campaigns |
| recipient_type | varchar(50) | 'parent', 'student', 'staff', 'teacher' |
| profile_id | uuid | FK to profiles |
| guardian_id | uuid | FK to guardians |
| email_address | varchar(255) | Email sent to |
| recipient_name | varchar(255) | Recipient's name |
| personalization_data | jsonb | Data for merge tags |
| status | varchar(50) | 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed' |
| email_provider_id | varchar(255) | Mailgun message ID |
| sent_at | timestamptz | When sent |
| delivered_at | timestamptz | When delivered |
| opened_at | timestamptz | First open |
| clicked_at | timestamptz | First click |
| bounced_at | timestamptz | When bounced |
| bounce_reason | text | Bounce error |
| failed_at | timestamptz | When failed |
| failure_reason | text | Failure error |
| open_count | integer | Total opens |
| click_count | integer | Total clicks |
| unsubscribed_at | timestamptz | When unsubscribed |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Unique Constraint:** (campaign_id, email_address)

**Indexes:**
- campaign_id
- email_address
- status
- profile_id
- guardian_id

---

#### 3. `email_templates`
Reusable email templates.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| template_name | varchar(255) | Template name |
| template_category | varchar(100) | 'recital_announcement', 'reminder', 'update', 'emergency', 'general' |
| subject_line | varchar(255) | Default subject |
| body_html | text | HTML template |
| body_text | text | Plain text template |
| available_merge_tags | jsonb | List of merge tags |
| preview_text | varchar(255) | Email preview snippet |
| is_system_template | boolean | Built-in template |
| is_active | boolean | Currently available |
| thumbnail_url | text | Template preview image |
| created_by | uuid | FK to profiles |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Merge Tags Example:**
```json
[
  "{{parent_name}}",
  "{{student_name}}",
  "{{recital_name}}",
  "{{recital_date}}",
  "{{show_time}}",
  "{{confirmation_link}}"
]
```

**Indexes:**
- template_category
- is_active

---

#### 4. `email_campaign_attachments`
File attachments for campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | FK to email_campaigns |
| file_name | varchar(255) | Original filename |
| file_path | varchar(500) | Supabase storage path |
| file_size | integer | Size in bytes |
| file_type | varchar(100) | MIME type |
| uploaded_by | uuid | FK to profiles |
| uploaded_at | timestamptz | Upload time |

**Indexes:**
- campaign_id

---

#### 5. `email_unsubscribes`
Unsubscribe tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email_address | varchar(255) | Email that unsubscribed |
| profile_id | uuid | FK to profiles |
| guardian_id | uuid | FK to guardians |
| unsubscribed_from | varchar(50) | 'all', 'recital_updates', 'marketing' |
| unsubscribe_reason | text | Why they unsubscribed |
| unsubscribed_at | timestamptz | When unsubscribed |
| ip_address | varchar(45) | IP for audit |

**Unique Constraint:** (email_address, unsubscribed_from)

**Indexes:**
- email_address

---

## API Endpoints

### Admin/Staff Endpoints

#### `POST /api/email-campaigns`
Create a new email campaign.

**Request:**
```json
{
  "recital_id": "uuid",
  "campaign_name": "Dress Rehearsal Reminder",
  "subject_line": "Important: Dress Rehearsal Tomorrow!",
  "from_name": "Dance Studio",
  "from_email": "info@dancestudio.com",
  "reply_to_email": "admin@dancestudio.com",
  "email_body_html": "<h1>Reminder</h1><p>Dear {{parent_name}},...</p>",
  "email_body_text": "Reminder: Dear {{parent_name}}...",
  "target_audience": "all_parents",
  "filter_criteria": {},
  "schedule_send_at": null,
  "is_urgent": false
}
```

---

#### `POST /api/email-campaigns/from-template`
Create campaign from template.

**Request:**
```json
{
  "template_id": "uuid",
  "recital_id": "uuid",
  "subject_line_override": null,
  "target_audience": "all_parents",
  "merge_tag_data": {
    "recital_name": "Spring Recital 2025",
    "recital_date": "May 17, 2025"
  }
}
```

---

#### `GET /api/email-campaigns`
List all campaigns.

**Query Params:**
- `recital_id` - Filter by recital
- `status` - Filter by status
- `created_by` - Filter by creator

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "campaign_name": "Dress Rehearsal Reminder",
      "subject_line": "Important: Dress Rehearsal Tomorrow!",
      "status": "sent",
      "sent_at": "2025-05-14T08:00:00Z",
      "total_recipients": 125,
      "sent_count": 125,
      "delivered_count": 123,
      "opened_count": 95,
      "clicked_count": 45,
      "open_rate": 77.2,
      "click_rate": 36.6
    }
  ]
}
```

---

#### `GET /api/email-campaigns/[id]`
Get campaign details.

---

#### `PUT /api/email-campaigns/[id]`
Update campaign (only if draft).

---

#### `DELETE /api/email-campaigns/[id]`
Delete campaign (only if draft).

---

#### `POST /api/email-campaigns/[id]/preview-recipients`
Preview who will receive the email.

**Response:**
```json
{
  "total_recipients": 125,
  "recipients_preview": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "recipient_type": "parent",
      "students": ["Emma Smith", "Sophia Smith"]
    }
  ],
  "breakdown": {
    "parents": 125,
    "staff": 0,
    "teachers": 0
  }
}
```

---

#### `POST /api/email-campaigns/[id]/send`
Send or schedule campaign.

**Request:**
```json
{
  "send_now": true,
  "schedule_for": null
}
```

**Response:**
```json
{
  "campaign_id": "uuid",
  "status": "sending",
  "total_recipients": 125,
  "message": "Campaign is being sent to 125 recipients"
}
```

---

#### `POST /api/email-campaigns/[id]/send-test`
Send test email to yourself.

**Request:**
```json
{
  "test_email": "admin@dancestudio.com",
  "personalization_sample": {
    "parent_name": "Test Parent",
    "student_name": "Test Student"
  }
}
```

---

#### `GET /api/email-campaigns/[id]/analytics`
Get detailed analytics.

**Response:**
```json
{
  "summary": {
    "total_recipients": 125,
    "sent_count": 125,
    "delivered_count": 123,
    "bounced_count": 2,
    "opened_count": 95,
    "clicked_count": 45,
    "open_rate": 77.2,
    "click_rate": 36.6,
    "delivery_rate": 98.4
  },
  "timeline": [
    {
      "hour": "2025-05-14T08:00:00Z",
      "opened": 35,
      "clicked": 12
    }
  ],
  "top_clickers": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "clicks": 3
    }
  ],
  "bounced_emails": [
    {
      "email": "invalid@example.com",
      "bounce_reason": "Invalid recipient"
    }
  ]
}
```

---

#### `POST /api/email-templates`
Create email template.

---

#### `GET /api/email-templates`
List templates.

---

#### `GET /api/email-templates/[id]`
Get template.

---

## UI Components & Pages

### Admin Pages

#### `/email-campaigns`
Main campaigns list page.

**Features:**
- Table of all campaigns
- Quick stats cards:
  - Total campaigns: 45
  - Active campaigns: 2
  - Total sent: 5,430
  - Avg open rate: 72%
- Create Campaign button
- Filter by status, date, recital
- Search by name

**Components:**
- `EmailCampaignsList.vue`
- `EmailCampaignsStats.vue`

---

#### `/email-campaigns/create`
Campaign creation wizard.

**Steps:**

**Step 1: Choose Source**
- Start from scratch
- Use template (with template gallery)

**Step 2: Campaign Details**
- Campaign name (internal)
- Subject line
- From name / email
- Reply-to email

**Step 3: Compose Email**
- Rich text editor for HTML
- Plain text version (auto-generated or custom)
- Merge tag picker
- Preview pane

**Step 4: Select Recipients**
- Target audience dropdown:
  - All recital parents
  - Specific classes
  - Specific students
  - Custom filter
- Show recipient count in real-time
- Preview recipients button

**Step 5: Attachments (Optional)**
- Upload files
- File list with remove option
- Size limit warning

**Step 6: Send Options**
- Send now
- Schedule for later (date/time picker)
- Mark as urgent
- Send test email first

**Step 7: Review & Send**
- Preview full email
- Recipient count
- Send time
- Confirm and send button

**Component:**
- `CreateEmailCampaignWizard.vue`

---

#### `/email-campaigns/[id]`
Campaign detail and analytics page.

**Sections:**

**Header:**
- Campaign name
- Status badge
- Subject line
- Sent date/time

**Stats Cards:**
- Sent: 125
- Delivered: 123 (98.4%)
- Opened: 95 (77.2%)
- Clicked: 45 (36.6%)

**Charts:**
- Opens/clicks over time (line chart)
- Recipient status breakdown (pie chart)

**Recipients Table:**
- Name, email, status, opened, clicked
- Filter and search
- Export to CSV

**Email Preview:**
- Show rendered email
- Download HTML

**Actions:**
- Send Again (create duplicate)
- Export Recipients
- Download Report

**Component:**
- `EmailCampaignDetailPage.vue`

---

#### `/email-templates`
Template library.

**Features:**
- Grid view of templates
- Template categories
- Create Template button
- Edit/delete actions
- Preview template

**Components:**
- `EmailTemplatesLibrary.vue`
- `EmailTemplateCard.vue`

---

#### Template Editor

**Features:**
- Rich text editor
- HTML/text toggle
- Merge tag picker
- Preview with sample data
- Save as draft
- Publish

**Component:**
- `EmailTemplateEditor.vue`

---

## Email Composer Component

**Features:**
- Rich text WYSIWYG editor (TipTap)
- Merge tag insertion via dropdown
- Image upload
- Link insertion
- Formatting toolbar
- HTML source view
- Mobile preview
- Send test email

**Component:**
- `EmailComposer.vue` (reusable)

---

## User Flows

### Flow 1: Admin Sends Dress Rehearsal Reminder

1. Admin goes to `/email-campaigns`
2. Clicks "Create Campaign"
3. Wizard Step 1: Clicks "Use Template"
4. Selects "Rehearsal Reminder" template
5. Step 2: Campaign Details
   - Name: "Dress Rehearsal Reminder - May 14"
   - Subject: "Tomorrow: Dress Rehearsal Info"
   - From: Dance Studio <info@studio.com>
6. Step 3: Compose
   - Template loads with default content
   - Admin edits: "Dress rehearsal is tomorrow, May 14, at 3:00 PM"
   - Inserts merge tag: {{student_name}}
   - Previews: Looks good
7. Step 4: Recipients
   - Selects: "All recital parents"
   - System shows: 125 recipients
   - Clicks "Preview Recipients"
   - Reviews list
8. Step 5: Attachments
   - Uploads "Parking_Map.pdf" (245 KB)
9. Step 6: Send Options
   - Selects "Send now"
   - Checks "Send test email first"
   - Enters admin email
10. Clicks "Send Test"
11. Receives test email, reviews
12. Clicks "Send to All Recipients"
13. Confirms: "Send to 125 recipients now?"
14. System:
    - Creates campaign record
    - Creates 125 recipient records
    - Queues emails via Mailgun
    - Starts sending
15. Success message: "Campaign sending to 125 recipients"
16. Redirected to campaign detail page
17. Watches real-time stats update
18. After 10 minutes:
    - Sent: 125/125
    - Delivered: 123
    - Opened: 35 (and growing)

---

### Flow 2: Parent Receives and Opens Email

1. Parent receives email: "Tomorrow: Dress Rehearsal Info"
2. Sees sender: Dance Studio
3. Opens email
4. Sees personalized greeting: "Hi Jane,"
5. Sees child's name: "Emma has dress rehearsal tomorrow..."
6. Reads details
7. Clicks link: "View Full Schedule"
8. Redirected to parent portal
9. System tracks:
   - Delivery
   - Open (pixel loaded)
   - Click (link clicked)
10. Admin sees stats update in real-time

---

### Flow 3: Admin Creates Reusable Template

1. Admin goes to `/email-templates`
2. Clicks "Create Template"
3. Fills in:
   - Name: "Payment Reminder"
   - Category: Reminder
   - Subject: "Payment Reminder - {{recital_name}}"
4. Composes email:
   - "Hi {{parent_name}},"
   - "This is a reminder about the outstanding balance for {{student_name}}'s participation in {{recital_name}}."
   - "Amount due: {{balance_amount}}"
   - "Due date: {{due_date}}"
   - "Pay now: {{payment_link}}"
5. Adds available merge tags:
   - parent_name
   - student_name
   - recital_name
   - balance_amount
   - due_date
   - payment_link
6. Saves template
7. Template now available for future campaigns

---

## Mailgun Integration

### Setup

**Use existing Mailgun configuration:**
- API key: `process.env.MAILGUN_API_KEY`
- Domain: `process.env.MAILGUN_DOMAIN`

### Sending Process

1. **Create Campaign** → Database record created
2. **Send Campaign** → Queue recipients
3. **For each recipient:**
   - Render email with personalization
   - Send via Mailgun API
   - Store Mailgun message ID
   - Update recipient status

4. **Mailgun Webhooks:**
   - Delivered → Update recipient.delivered_at
   - Opened → Update recipient.opened_at, increment open_count
   - Clicked → Update recipient.clicked_at, increment click_count
   - Bounced → Update recipient.bounced_at, bounce_reason
   - Unsubscribed → Create unsubscribe record

### Webhook Endpoint

`POST /api/webhooks/mailgun`

**Handles:**
- delivered
- opened
- clicked
- bounced
- complained
- unsubscribed

---

## Personalization & Merge Tags

### Available Merge Tags

**Parent/Guardian:**
- `{{parent_name}}` - Parent's full name
- `{{parent_first_name}}` - First name
- `{{parent_email}}` - Email address

**Student:**
- `{{student_name}}` - Student's full name
- `{{student_first_name}}` - First name

**Recital:**
- `{{recital_name}}` - Recital name
- `{{recital_date}}` - Show date
- `{{show_time}}` - Show time
- `{{venue_name}}` - Location

**Custom:**
- `{{confirmation_link}}` - Link to confirm
- `{{payment_link}}` - Link to pay
- `{{portal_link}}` - Link to parent portal

### Rendering Process

```javascript
function renderEmail(template, recipientData) {
  let html = template.email_body_html;
  let text = template.email_body_text;

  // Replace merge tags
  Object.keys(recipientData).forEach(key => {
    const tag = `{{${key}}}`;
    html = html.replace(new RegExp(tag, 'g'), recipientData[key]);
    text = text.replace(new RegExp(tag, 'g'), recipientData[key]);
  });

  return { html, text };
}
```

---

## Built-in Templates

### 1. Recital Announcement
**Subject:** Exciting News: {{recital_name}} on {{recital_date}}!

### 2. Confirmation Request
**Subject:** Action Required: Confirm {{student_name}}'s Performances

### 3. Payment Reminder
**Subject:** Reminder: Payment Due for {{recital_name}}

### 4. Rehearsal Reminder
**Subject:** Reminder: {{rehearsal_type}} Rehearsal {{rehearsal_date}}

### 5. Costume Pickup Reminder
**Subject:** Pick Up {{student_name}}'s Costume by {{due_date}}

### 6. Dress Rehearsal Info
**Subject:** Important Info: Dress Rehearsal {{date}}

### 7. Show Day Details
**Subject:** Tomorrow: {{recital_name}} - Important Details

### 8. Thank You After Show
**Subject:** Thank You! {{recital_name}} Memories

### 9. Emergency Update
**Subject:** URGENT: {{recital_name}} Update

### 10. Schedule Change
**Subject:** Schedule Change for {{recital_name}}

---

## Implementation Steps

### Phase 1: Database & Core API (Week 1)

1. Create database migration (5 tables)
2. Create TypeScript types
3. Build campaign CRUD endpoints
4. Build template CRUD endpoints
5. Build recipient management
6. Test with Postman

---

### Phase 2: Mailgun Integration (Week 2)

1. Build email sending service
2. Build merge tag rendering
3. Build webhook endpoint
4. Handle delivery tracking
5. Handle open/click tracking
6. Test with real emails

---

### Phase 3: Admin UI (Week 3)

1. Build campaigns list page
2. Build campaign creation wizard
3. Build email composer component
4. Build recipient selection
5. Build template library
6. Build template editor

---

### Phase 4: Analytics & Reporting (Week 4)

1. Build campaign detail page
2. Build analytics charts
3. Build recipient tracking table
4. Build export functionality
5. Build unsubscribe page
6. Build scheduled sends

---

## Testing Checklist

### Database
- [ ] Campaign records created
- [ ] Recipients tracked correctly
- [ ] Templates saved and loaded
- [ ] Unsubscribes respected

### API
- [ ] Create campaign works
- [ ] Send campaign queues emails
- [ ] Webhooks update status
- [ ] Analytics calculates correctly
- [ ] Test email sends

### Mailgun
- [ ] Emails send successfully
- [ ] Tracking pixels work
- [ ] Webhooks received
- [ ] Bounce handling works
- [ ] Unsubscribe works

### UI
- [ ] Wizard validates inputs
- [ ] Email composer works
- [ ] Template picker loads
- [ ] Recipient preview accurate
- [ ] Analytics display correctly

### Personalization
- [ ] Merge tags render correctly
- [ ] No {{tag}} left unrendered
- [ ] Links work
- [ ] Images display

---

## Success Metrics

- **Delivery Rate:** 98%+ emails delivered
- **Open Rate:** 60%+ average
- **Click Rate:** 20%+ average
- **Bounce Rate:** <2%
- **Admin Efficiency:** 90% time savings vs manual emails
- **Parent Satisfaction:** 85%+ find emails helpful

---

## Future Enhancements

1. **A/B Testing**
   - Test subject lines
   - Test send times
   - Compare results

2. **Advanced Segmentation**
   - Behavioral targeting
   - Engagement scoring
   - Custom audience builder

3. **Automation Triggers**
   - Send when event occurs
   - Drip campaigns
   - Workflows

4. **SMS Integration**
   - Send SMS campaigns
   - Unified messaging

5. **Analytics Dashboard**
   - Campaign comparison
   - Trend analysis
   - Engagement metrics

6. **Email Builder**
   - Drag-and-drop blocks
   - Pre-designed layouts
   - Image library

---

## Estimated Effort

- **Database & Core API:** 20 hours
- **Mailgun Integration:** 20 hours
- **Admin UI:** 36 hours
- **Analytics:** 16 hours
- **Testing:** 16 hours
- **Documentation:** 8 hours

**Total:** ~116 hours (~14-15 days for one developer)

---

## Dependencies

- Mailgun account (existing)
- Email sending limits (check Mailgun plan)
- Supabase storage (for attachments)
- Rich text editor (TipTap - already in project)

---

## Related Features

- **Performer Confirmation** - Sends confirmation requests
- **Payment Tracking** - Sends payment reminders
- **Rehearsal Management** - Sends rehearsal reminders
- **Parent Portal** - Links in emails
