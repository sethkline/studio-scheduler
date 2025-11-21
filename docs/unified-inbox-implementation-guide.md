# Unified Inbox - Implementation Guide

## Overview

The Unified Inbox is a centralized communication hub for managing all studio communications including emails, internal messages, parent-teacher communications, system notifications, and contact form submissions.

## Implementation Status

### ✅ Phase 1: Database & Core Infrastructure (COMPLETE)
- Database schema with 7 tables
- Row-level security policies
- Type definitions (40+ interfaces)
- Service composable with 40+ methods
- CRUD API endpoints

### ✅ Phase 2: Email Integration (COMPLETE)
- Mailgun webhook handler for inbound emails
- Email sending with threading support
- Reply and forward functionality
- Attachment upload/download/delete
- Email threading logic (Message-ID, In-Reply-To, References)

### 🚧 Phase 3: UI Components (IN PROGRESS)
- ✅ Inbox layout page created
- ⏳ Components need to be built (see below)

## Architecture

```
/pages/inbox/
  index.vue                 # Main inbox page (✅ COMPLETE)

/components/inbox/
  InboxSidebar.vue          # Filter sidebar (TODO)
  InboxFilters.vue          # Filter bar (TODO)
  InboxMessageList.vue      # Message list (TODO)
  InboxMessageDetail.vue    # Message detail panel (TODO)
  InboxComposeDialog.vue    # Compose/Reply dialog (TODO)

/composables/
  useInboxService.ts        # Service layer (✅ COMPLETE)

/server/api/inbox/
  messages.get.ts           # List messages (✅ COMPLETE)
  messages.post.ts          # Create message (✅ COMPLETE)
  messages/[id].get.ts      # Get message (✅ COMPLETE)
  messages/[id].patch.ts    # Update message (✅ COMPLETE)
  messages/[id].delete.ts   # Delete message (✅ COMPLETE)
  send.post.ts              # Send email (✅ COMPLETE)
  reply.post.ts             # Reply to message (✅ COMPLETE)
  forward.post.ts           # Forward message (✅ COMPLETE)
  bulk-action.post.ts       # Bulk operations (✅ COMPLETE)
  stats.get.ts              # Inbox statistics (✅ COMPLETE)
  mailgun-webhook.post.ts   # Inbound email (✅ COMPLETE)
  attachments.post.ts       # Upload attachment (✅ COMPLETE)
  attachments/[id].get.ts   # Download attachment (✅ COMPLETE)
  attachments/[id].delete.ts # Delete attachment (✅ COMPLETE)
```

## Remaining UI Components

### 1. InboxSidebar.vue

**Purpose**: Filter navigation sidebar

**Props**:
- `filters` (InboxFilters) - Current filters
- `stats` (InboxStats) - Inbox statistics

**Features**:
- Folder navigation (Inbox, Sent, Drafts, Archived)
- Quick filters (Unread, Starred, Assigned to Me, Requires Action)
- Label/tag management
- Message counts per folder

**Example Structure**:
```vue
<template>
  <div class="sidebar">
    <nav>
      <button @click="setFilter('all')">
        <i class="pi pi-inbox"></i>
        Inbox
        <Badge :value="stats.total_messages" />
      </button>
      <button @click="setFilter('unread')">
        <i class="pi pi-envelope"></i>
        Unread
        <Badge :value="stats.unread_count" />
      </button>
      <!-- More filters -->
    </nav>
  </div>
</template>
```

### 2. InboxFilters.vue

**Purpose**: Top filter bar with search and quick filters

**Props**:
- `modelValue` (InboxFilters) - Current filters

**Emits**:
- `update:modelValue` - Filter changes

**Features**:
- Search input with debounce
- Message type dropdown (Email, Internal, etc.)
- Status dropdown (New, Read, In Progress, Resolved)
- Date range picker
- Clear filters button

**Example Structure**:
```vue
<template>
  <div class="filters-bar flex gap-2">
    <InputText
      v-model="search"
      placeholder="Search messages..."
      @input="debouncedSearch"
    />
    <Dropdown
      v-model="filters.message_type"
      :options="messageTypes"
      placeholder="Type"
    />
    <Dropdown
      v-model="filters.status"
      :options="statuses"
      placeholder="Status"
    />
  </div>
</template>
```

### 3. InboxMessageList.vue

**Purpose**: List of messages with multi-select

**Props**:
- `messages` (MessageWithThread[]) - Messages to display
- `loading` (boolean) - Loading state
- `selectedId` (string|null) - Selected message ID

**Emits**:
- `select` - Message selected
- `refresh` - Refresh requested

**Features**:
- Virtual scrolling for performance
- Message preview (sender, subject, preview, timestamp)
- Unread indicator
- Star/flag icons
- Priority indicators
- Attachment indicator
- Multi-select for bulk actions
- Keyboard navigation (j/k to navigate)

**Example Structure**:
```vue
<template>
  <div class="message-list">
    <div
      v-for="message in messages"
      :key="message.id"
      class="message-item"
      :class="{ 'unread': !message.is_read }"
      @click="$emit('select', message.id)"
    >
      <Checkbox v-model="selected" :value="message.id" />
      <i class="pi" :class="getTypeIcon(message.message_type)"></i>
      <div class="message-content">
        <div class="message-header">
          <span class="from">{{ message.from_name || message.from_address }}</span>
          <span class="time">{{ formatRelativeTime(message.created_at) }}</span>
        </div>
        <div class="subject">{{ message.subject }}</div>
        <div class="preview">{{ message.preview }}</div>
      </div>
      <i v-if="message.attachment_count" class="pi pi-paperclip"></i>
      <i v-if="message.is_starred" class="pi pi-star-fill"></i>
    </div>
  </div>
</template>
```

### 4. InboxMessageDetail.vue

**Purpose**: Display full message details with actions

**Props**:
- `message` (MessageDetail) - Message to display
- `loading` (boolean) - Loading state

**Emits**:
- `close` - Close detail panel
- `reply` - Reply clicked
- `reply-all` - Reply All clicked
- `forward` - Forward clicked
- `refresh` - Refresh requested

**Features**:
- Message header (from, to, cc, date, subject)
- Message body (HTML or plain text)
- Attachments list with download
- Thread view (show conversation)
- Action buttons (Reply, Reply All, Forward, Archive, Delete)
- Status and priority badges
- Assignment dropdown
- Tags/labels

**Example Structure**:
```vue
<template>
  <div class="message-detail">
    <div class="detail-header">
      <Button icon="pi pi-times" @click="$emit('close')" />
      <div class="actions">
        <Button label="Reply" @click="$emit('reply')" />
        <Button label="Reply All" @click="$emit('reply-all')" />
        <Button label="Forward" @click="$emit('forward')" />
      </div>
    </div>

    <div class="message-info">
      <h2>{{ message.subject }}</h2>
      <div class="participants">
        <div><strong>From:</strong> {{ message.from_name }}</div>
        <div><strong>To:</strong> {{ message.to_addresses.join(', ') }}</div>
        <div><strong>Date:</strong> {{ formatDate(message.created_at) }}</div>
      </div>
    </div>

    <div class="message-body" v-html="message.body_html || message.body"></div>

    <div v-if="message.attachments.length" class="attachments">
      <h3>Attachments</h3>
      <div v-for="att in message.attachments" :key="att.id">
        <Button @click="downloadAttachment(att.id)">
          <i class="pi pi-download"></i>
          {{ att.original_filename }}
        </Button>
      </div>
    </div>
  </div>
</template>
```

### 5. InboxComposeDialog.vue

**Purpose**: Compose new message or reply/forward

**Props**:
- `visible` (boolean) - Dialog visibility
- `replyTo` (Message|null) - Message being replied to
- `forwardMessage` (Message|null) - Message being forwarded

**Emits**:
- `update:visible` - Visibility changed
- `sent` - Message sent successfully

**Features**:
- To/CC/BCC fields with autocomplete
- Subject field
- Rich text editor (TipTap)
- Attachment upload (drag & drop)
- Template selector
- Priority selector
- Send and Save Draft buttons
- Keyboard shortcuts (Ctrl+Enter to send)

**Example Structure**:
```vue
<template>
  <Dialog
    v-model:visible="visible"
    header="Compose Message"
    modal
    :style="{ width: '50vw' }"
  >
    <form @submit.prevent="handleSend">
      <div class="field">
        <label>To</label>
        <Chips v-model="to" placeholder="Add recipients" />
      </div>

      <div class="field">
        <label>Subject</label>
        <InputText v-model="subject" class="w-full" />
      </div>

      <div class="field">
        <label>Message</label>
        <TipTapEditor v-model="body" />
      </div>

      <div class="field">
        <FileUpload
          mode="advanced"
          :multiple="true"
          @select="handleAttachments"
        />
      </div>

      <div class="flex gap-2">
        <Button label="Send" type="submit" />
        <Button label="Save Draft" severity="secondary" @click="saveDraft" />
      </div>
    </form>
  </Dialog>
</template>
```

## Database Schema Reference

### Tables

#### `message_threads`
Groups related messages into conversations.

**Key Fields**:
- `subject`: Thread subject
- `thread_type`: email | internal | parent_communication | contact_inquiry | support
- `participants`: Array of user IDs or email addresses
- `status`: active | resolved | archived | deleted
- `message_count`, `unread_count`: Auto-updated by triggers

#### `messages`
Primary message storage.

**Key Fields**:
- `message_type`: email | internal | parent_communication | system_notification | contact_form | sms
- `source`: email_inbound | email_outbound | system | user | external
- `subject`, `body`, `body_html`: Message content
- `from_address`, `to_addresses`, `cc_addresses`, `bcc_addresses`: Participants
- `thread_id`, `parent_message_id`: Threading
- `email_message_id`, `in_reply_to`: Email threading
- `status`: new | read | in_progress | resolved | archived | deleted
- `priority`: low | normal | high | urgent

#### `message_attachments`
File attachments stored in Supabase Storage.

**Key Fields**:
- `filename`, `original_filename`: File names
- `storage_path`, `storage_bucket`: Storage location
- `mime_type`, `file_size`: File metadata
- `is_inline`, `content_id`: For HTML email inline images

## API Usage Examples

### Fetch Messages
```typescript
const { fetchMessages } = useInboxService()

const response = await fetchMessages({
  message_type: 'email',
  status: 'new',
  is_read: false,
  page: 1,
  limit: 50,
  search: 'invoice',
})

console.log(response.messages) // MessageWithThread[]
console.log(response.pagination) // { page, limit, total, total_pages }
```

### Send Email
```typescript
const { sendEmail } = useInboxService()

const message = await sendEmail({
  message_type: 'email',
  to_addresses: ['parent@example.com'],
  subject: 'Class Schedule Update',
  body: 'Your child\'s class has been rescheduled...',
  body_html: '<p>Your child\'s class has been rescheduled...</p>',
  priority: 'normal',
  tags: ['schedule', 'important'],
})
```

### Reply to Message
```typescript
const { replyToMessage } = useInboxService()

const reply = await replyToMessage({
  message_id: 'uuid-of-original-message',
  body: 'Thank you for your inquiry...',
  reply_all: false,
})
```

### Upload Attachment
```typescript
const { uploadAttachment } = useInboxService()

const result = await uploadAttachment({
  message_id: 'uuid',
  file: fileObject, // File from input
  is_inline: false,
})

console.log(result.attachment) // MessageAttachment
console.log(result.upload_url) // Public URL
```

## Real-time Subscriptions

Messages are updated in real-time using Supabase Realtime:

```typescript
const supabase = useSupabaseClient()

const channel = supabase
  .channel('inbox-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
  }, (payload) => {
    // New message received
    console.log('New message:', payload.new)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
  }, (payload) => {
    // Message updated
    console.log('Message updated:', payload.new)
  })
  .subscribe()

// Cleanup on unmount
onUnmounted(() => {
  supabase.removeChannel(channel)
})
```

## Security & Permissions

### Role-Based Access
- **Admin/Staff**: Full access to all messages
- **Teacher**: Can send emails, view assigned messages
- **Parent**: Can view messages they sent or received

### RLS Policies
All tables have Row-Level Security enabled with policies that:
- Enforce studio isolation (users only see their studio's data)
- Check user roles for appropriate permissions
- Verify message ownership or participation for access

## Mailgun Configuration

### Inbound Email Route
1. Go to Mailgun Dashboard → Routes
2. Create new route:
   - **Filter Expression**: `match_recipient("inbox@yourdomain.com")`
   - **Actions**: `forward("https://yourapp.com/api/inbox/mailgun-webhook")`
   - **Priority**: 0
3. Set webhook signing key in environment: `MAILGUN_WEBHOOK_SIGNING_KEY`

### Webhook Events
The app handles these Mailgun webhook events:
- Inbound email (via route)
- Delivered (via existing email webhook)
- Opened (via existing email webhook)
- Clicked (via existing email webhook)
- Failed/Bounced (via existing email webhook)

## Performance Considerations

### Database
- Comprehensive indexes on frequently queried columns
- Full-text search index on messages
- Pagination with cursor-based approach
- Soft delete for audit trail

### Frontend
- Virtual scrolling for long message lists (use PrimeVue VirtualScroller)
- Debounced search (300ms)
- Optimistic UI updates
- Real-time updates throttled

### Storage
- 25MB attachment size limit
- Files stored in Supabase Storage
- Automatic filename sanitization
- Content-Type validation

## Testing

### Unit Tests
```bash
npm run test
```

Test files should cover:
- Service methods (composables/useInboxService.test.ts)
- API endpoints (server/api/inbox/*.test.ts)
- Components (components/inbox/*.test.ts)

### E2E Tests
```bash
npm run test:e2e
```

Test scenarios:
- Compose and send email
- Reply to message
- Forward message
- Upload attachment
- Search messages
- Filter messages
- Mark as read/unread
- Archive message

## Deployment Checklist

1. **Environment Variables**:
   - ✅ `MAILGUN_API_KEY`
   - ✅ `MAILGUN_DOMAIN`
   - ⚠️ `MAILGUN_WEBHOOK_SIGNING_KEY` (ADD THIS)
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_KEY`

2. **Database Migrations**:
   ```bash
   # Run migrations
   supabase db push
   ```

3. **Supabase Storage**:
   - Create bucket: `message-attachments`
   - Set public access for downloads
   - Configure RLS policies

4. **Mailgun Configuration**:
   - Set up inbound route
   - Configure webhook signing key
   - Test with test email

5. **Testing**:
   - Send test email to inbox@yourdomain.com
   - Verify webhook receives and processes
   - Send test email from app
   - Test attachment upload/download

## Troubleshooting

### Inbound Emails Not Appearing
- Check Mailgun route is configured correctly
- Verify webhook endpoint is accessible
- Check webhook signature is valid
- Review server logs for errors

### Attachments Not Uploading
- Verify Supabase Storage bucket exists
- Check file size is under 25MB
- Verify RLS policies allow uploads
- Check storage path permissions

### Real-time Not Working
- Enable Realtime in Supabase dashboard
- Check WebSocket connection in browser console
- Verify table has `REPLICA IDENTITY FULL`

## Next Steps

1. **Complete UI Components** (Priority: High)
   - Implement the 5 core components listed above
   - Add TipTap rich text editor integration
   - Implement keyboard shortcuts

2. **Advanced Features** (Priority: Medium)
   - Email templates management UI
   - Labels/tags management
   - Advanced search with filters
   - Bulk actions UI
   - Analytics dashboard

3. **Polish** (Priority: Low)
   - Mobile responsive design
   - Dark mode support
   - Keyboard shortcuts help modal
   - Onboarding tour

## Resources

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [PrimeVue Components](https://primevue.org/datatable/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Mailgun API](https://documentation.mailgun.com/en/latest/api-intro.html)
- [TipTap Editor](https://tiptap.dev/)

## Support

For questions or issues:
1. Check this documentation
2. Review implementation guide in `/docs/unified-inbox-implementation-guide.md`
3. Check GitHub issues
4. Contact development team
