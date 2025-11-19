# Blog Newsletter Integration Guide

**PR:** #15 - Public Studio Website
**Branch:** `claude/public-studio-website-011CUqj1YzsedhZK68Z4eJsg`
**Status:** Updated to use unified email campaign system

---

## Changes Made

### ❌ Removed (Use Unified Email System Instead)

1. **`newsletter_subscribers` table** → Use `email_campaign_unsubscribes` with category tracking

### ✅ Kept (Blog-Specific Tables)

These are already in `20251116_008_newsletter_integration.sql`:
- `blog_posts` - Blog posts with auto-newsletter trigger
- Theme colors on `studio_profile` - Website theme customization

### ✅ Use These Functions

All functions are in `20251116_008_newsletter_integration.sql`:

1. **`subscribe_to_blog_newsletter(email, name, source)`** - Subscribe to newsletter
2. **`unsubscribe_from_blog_newsletter(email, unsubscribe_all)`** - Unsubscribe
3. **`get_blog_newsletter_subscribers()`** - Get active subscriber list
4. **`auto_send_blog_newsletter()`** - Auto-trigger when blog post published

---

## Migration File

### Required

✅ `20251116_008_newsletter_integration.sql` - Newsletter integration with email campaigns

### Deprecated (DO NOT USE)

❌ `supabase/migrations/add_blog_tables.sql` - Has separate newsletter_subscribers table

---

## Code Migration Examples

### Subscribe to Newsletter

**OLD WAY (separate table):**
```typescript
// Don't create separate newsletter_subscribers
const { data } = await supabase
  .from('newsletter_subscribers')
  .insert({
    email: email,
    name: name,
    status: 'active',
    subscribed_at: new Date()
  })
```

**NEW WAY (use function):**
```typescript
// Use subscribe function
const { data, error } = await supabase
  .rpc('subscribe_to_blog_newsletter', {
    p_email: email,
    p_name: name,
    p_source: 'website_form' // or 'blog_footer', 'admin_import'
  })

// Returns:
// {
//   success: true,
//   message: 'Successfully subscribed to blog newsletter',
//   email: 'user@example.com'
// }
```

### Unsubscribe from Newsletter

**OLD WAY:**
```typescript
// Don't update separate table
const { data } = await supabase
  .from('newsletter_subscribers')
  .update({ status: 'unsubscribed' })
  .eq('email', email)
```

**NEW WAY (use function):**
```typescript
// Unsubscribe from blog only
const { data } = await supabase
  .rpc('unsubscribe_from_blog_newsletter', {
    p_email: email,
    p_unsubscribe_all: false  // false = blog only, true = all emails
  })

// Returns:
// {
//   success: true,
//   message: 'Successfully unsubscribed from blog newsletter'
// }
```

### Get Newsletter Subscribers

**OLD WAY:**
```typescript
// Don't query separate table
const { data } = await supabase
  .from('newsletter_subscribers')
  .select('*')
  .eq('status', 'active')
```

**NEW WAY (use function):**
```typescript
// Get all active blog subscribers
const { data: subscribers, error } = await supabase
  .rpc('get_blog_newsletter_subscribers')

// Returns array of:
// {
//   email: 'user@example.com',
//   first_name: 'John',
//   last_name: 'Doe',
//   subscribed_since: '2025-01-15T10:30:00Z'
// }
```

### Alternative: Query Email Campaign Unsubscribes Directly

```typescript
// Get subscribers with more details
const { data: subscribers } = await supabase
  .from('email_campaign_unsubscribes')
  .select('email, blog_subscriber_since, blog_subscription_source, unsubscribe_categories')
  .not('blog_subscriber_since', 'is', null)
  .is('unsubscribed_at', null)
  .not('unsubscribe_categories', 'cs', '{blog_newsletter}')  // cs = contains
  .not('unsubscribe_categories', 'cs', '{all}')

// More flexible filtering
```

### Create Blog Post with Newsletter

**NEW:**
```typescript
// Create blog post
const { data: post, error } = await supabase
  .from('blog_posts')
  .insert({
    title: 'New Ballet Classes Starting in Spring',
    slug: 'spring-ballet-classes-2025',
    excerpt: 'Exciting new ballet classes for all ages...',
    content: fullContent,
    category: 'Classes',
    tags: ['ballet', 'spring', 'registration'],
    featured_image_url: imageUrl,
    author_id: authorId,
    status: 'draft',  // Start as draft
    send_newsletter: true  // Mark to send newsletter when published
  })
  .select()
  .single()

// Later, when ready to publish
const { data: published } = await supabase
  .from('blog_posts')
  .update({ status: 'published' })
  .eq('id', post.id)
  .select()
  .single()

// Trigger automatically creates an email campaign!
// Campaign will be in 'draft' status for staff review
```

### Send the Newsletter Campaign

```typescript
// After blog post is published, get the campaign
const { data: post } = await supabase
  .from('blog_posts')
  .select('newsletter_campaign_id')
  .eq('id', postId)
  .single()

// Review and send the campaign
const { data: campaign } = await supabase
  .from('email_campaigns')
  .select('*')
  .eq('id', post.newsletter_campaign_id)
  .single()

// When ready to send (staff action)
await supabase
  .from('email_campaigns')
  .update({
    status: 'sending',
    scheduled_send_time: new Date()
  })
  .eq('id', campaign.id)

// Backend job picks up campaigns with status='sending' and sends them
```

### Check Subscription Preferences

```typescript
// Check if user is subscribed to blog newsletter
const { data: prefs } = await supabase
  .from('email_campaign_unsubscribes')
  .select('*')
  .eq('email', userEmail)
  .single()

const isSubscribed =
  prefs &&
  prefs.blog_subscriber_since !== null &&
  prefs.unsubscribed_at === null &&
  !prefs.unsubscribe_categories?.includes('blog_newsletter') &&
  !prefs.unsubscribe_categories?.includes('all')
```

---

## API Endpoint Examples

### Newsletter Subscribe Endpoint

**File:** `server/api/public/newsletter/subscribe.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getSupabaseClient()

  // Validate email
  if (!body.email || !isValidEmail(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Valid email address is required'
    })
  }

  // Subscribe using function
  const { data, error } = await client
    .rpc('subscribe_to_blog_newsletter', {
      p_email: body.email,
      p_name: body.name || null,
      p_source: 'website_form'
    })

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to subscribe'
    })
  }

  // Optional: Send confirmation email
  if (data.success) {
    await sendWelcomeEmail(body.email, body.name)
  }

  return data
})
```

### Newsletter Unsubscribe Endpoint

**File:** `server/api/public/newsletter/unsubscribe.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getSupabaseClient()

  const { data, error } = await client
    .rpc('unsubscribe_from_blog_newsletter', {
      p_email: body.email,
      p_unsubscribe_all: body.unsubscribeAll || false
    })

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to unsubscribe'
    })
  }

  return data
})
```

### Get Subscriber Count

**File:** `server/api/admin/newsletter/stats.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // Use the stats view
  const { data: stats } = await client
    .from('newsletter_subscriber_stats')
    .select('*')
    .single()

  // Returns:
  // {
  //   active_subscribers: 1250,
  //   unsubscribed: 45,
  //   blog_only_unsubscribed: 12,
  //   new_subscribers_30d: 78,
  //   new_subscribers_7d: 15
  // }

  return { stats }
})
```

---

## Frontend Component Examples

### Newsletter Signup Form

```vue
<script setup lang="ts">
const email = ref('')
const name = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

const subscribe = async () => {
  loading.value = true
  error.value = ''

  try {
    const { data } = await $fetch('/api/public/newsletter/subscribe', {
      method: 'POST',
      body: {
        email: email.value,
        name: name.value
      }
    })

    if (data.success) {
      success.value = true
      email.value = ''
      name.value = ''
    }
  } catch (e) {
    error.value = 'Failed to subscribe. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="newsletter-signup">
    <h3>Subscribe to Our Newsletter</h3>
    <p>Get the latest updates from our studio delivered to your inbox.</p>

    <Message v-if="success" severity="success">
      Successfully subscribed! Check your email for confirmation.
    </Message>

    <Message v-if="error" severity="error">
      {{ error }}
    </Message>

    <form @submit.prevent="subscribe" class="flex gap-2">
      <InputText
        v-model="email"
        type="email"
        placeholder="Your email"
        required
        :disabled="loading"
      />
      <InputText
        v-model="name"
        placeholder="Your name (optional)"
        :disabled="loading"
      />
      <Button
        type="submit"
        :loading="loading"
        label="Subscribe"
      />
    </form>
  </div>
</template>
```

### Unsubscribe Page

```vue
<script setup lang="ts">
const route = useRoute()
const email = ref(route.query.email as string || '')
const unsubscribeAll = ref(false)
const loading = ref(false)
const success = ref(false)

const unsubscribe = async () => {
  loading.value = true

  try {
    const { data } = await $fetch('/api/public/newsletter/unsubscribe', {
      method: 'POST',
      body: {
        email: email.value,
        unsubscribeAll: unsubscribeAll.value
      }
    })

    if (data.success) {
      success.value = true
    }
  } catch (e) {
    console.error('Unsubscribe failed:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="unsubscribe-page">
    <h1>Unsubscribe from Newsletter</h1>

    <div v-if="success">
      <Message severity="success">
        You have been unsubscribed successfully.
      </Message>
      <p>
        You will no longer receive
        {{ unsubscribeAll ? 'any emails' : 'blog newsletter emails' }}
        from us.
      </p>
    </div>

    <form v-else @submit.prevent="unsubscribe">
      <div class="form-field">
        <label>Email Address</label>
        <InputText v-model="email" type="email" required />
      </div>

      <div class="form-field">
        <Checkbox v-model="unsubscribeAll" binary inputId="unsubscribe-all" />
        <label for="unsubscribe-all">
          Unsubscribe from all studio emails (not just blog newsletter)
        </label>
      </div>

      <Button type="submit" :loading="loading">
        Unsubscribe
      </Button>
    </form>
  </div>
</template>
```

### Admin Newsletter Dashboard

```vue
<script setup lang="ts">
const { data: stats } = await useFetch('/api/admin/newsletter/stats')
const { data: subscribers } = await useFetch('/api/admin/newsletter/subscribers')
</script>

<template>
  <div class="newsletter-dashboard">
    <h2>Newsletter Management</h2>

    <div class="stats-grid">
      <Card>
        <template #header>Active Subscribers</template>
        <div class="stat-value">{{ stats?.active_subscribers }}</div>
      </Card>

      <Card>
        <template #header>New (Last 30 Days)</template>
        <div class="stat-value">{{ stats?.new_subscribers_30d }}</div>
      </Card>

      <Card>
        <template #header>Unsubscribed</template>
        <div class="stat-value">{{ stats?.unsubscribed }}</div>
      </Card>
    </div>

    <Card>
      <template #header>Recent Subscribers</template>
      <DataTable :value="subscribers" paginator :rows="25">
        <Column field="email" header="Email" sortable />
        <Column field="first_name" header="First Name" />
        <Column field="last_name" header="Last Name" />
        <Column field="subscribed_since" header="Subscribed" sortable>
          <template #body="{ data }">
            {{ formatDate(data.subscribed_since) }}
          </template>
        </Column>
      </DataTable>
    </Card>
  </div>
</template>
```

---

## Benefits of Integration

✅ **Single unsubscribe system** - One place for all email preferences
✅ **Category-based preferences** - Users can choose which emails to receive
✅ **Better compliance** - Easier to comply with CAN-SPAM, GDPR
✅ **Unified delivery tracking** - Track opens, clicks for blog newsletters too
✅ **No duplicate subscribers** - Parent email stored once
✅ **Automatic campaign creation** - Blog posts auto-create campaigns
✅ **Staff review** - Campaigns start as draft for approval
✅ **Consistent user experience** - One preferences page for all emails

---

## Testing Checklist

- [ ] Subscribe to blog newsletter
- [ ] Receive confirmation email
- [ ] Unsubscribe from blog only
- [ ] Unsubscribe from all emails
- [ ] Publish blog post with send_newsletter=true
- [ ] Verify campaign is created in draft status
- [ ] Staff reviews and sends campaign
- [ ] Subscribers receive newsletter email
- [ ] Newsletter includes blog post content
- [ ] Unsubscribe link in email works
- [ ] Admin can view subscriber stats
- [ ] Admin can export subscriber list

---

## Questions?

See:
- [UNIFIED-PAYMENT-SYSTEM-PLAN.md](./UNIFIED-PAYMENT-SYSTEM-PLAN.md)
- [SCHEMA-FIX-SUMMARY.md](./SCHEMA-FIX-SUMMARY.md)
- Migration file: `supabase/migrations/20251116_008_newsletter_integration.sql`
