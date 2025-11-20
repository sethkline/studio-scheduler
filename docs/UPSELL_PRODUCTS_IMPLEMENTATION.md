# Upsell Products Implementation Guide

**Feature:** DVD, Digital Downloads, Live Streaming, Flowers, and Merchandise
**Business Value:** Increase average order value by $15-30 per transaction
**Priority:** HIGH - Significant revenue opportunity
**Estimated Effort:** 5-7 days

---

## Table of Contents

1. [Business Requirements](#business-requirements)
2. [Product Categories](#product-categories)
3. [Database Schema](#database-schema)
4. [User Experience Flow](#user-experience-flow)
5. [API Endpoints](#api-endpoints)
6. [Admin Management](#admin-management)
7. [Customer Purchase Flow](#customer-purchase-flow)
8. [Digital Delivery System](#digital-delivery-system)
9. [Testing & QA](#testing--qa)
10. [Analytics & Reporting](#analytics--reporting)

---

## Business Requirements

### Revenue Opportunity Analysis

Based on typical dance studio recitals:

| Product | Typical Price | Attach Rate | Revenue per 100 Orders |
|---------|--------------|-------------|------------------------|
| DVD | $25-35 | 40% | $1,200 |
| Digital Download | $15-20 | 30% | $525 |
| Live Stream | $20-30 | 15% | $375 |
| Flowers/Bouquet | $30-50 | 25% | $1,000 |
| T-Shirt | $20-25 | 20% | $450 |
| **Total** | | | **$3,550** |

**Bottom Line:** Adding upsells can generate an **additional $35 per order** on average.

### Core Features

✅ **Product Management (Admin)**
- Create/edit/delete products
- Set pricing and availability
- Upload product images
- Manage inventory (for physical items)
- Enable/disable products per show

✅ **Customer Purchase Flow**
- Display products during checkout
- Add products to cart
- Bundle pricing (e.g., "Tickets + DVD = 10% off")
- Product previews and descriptions

✅ **Digital Delivery**
- Automatic email delivery for digital products
- Download links with expiration (30 days)
- Access codes for streaming
- Video player integration

✅ **Physical Fulfillment**
- Flower delivery at venue (show date/time)
- T-shirt size selection
- Pickup instructions
- Delivery tracking (optional)

---

## Product Categories

### 1. **Professional DVD Recording**

**Description:** High-quality DVD of the full recital

**Features:**
- Professional multi-camera recording
- Individual student performances highlighted
- Studio branding/packaging
- Optional: Personalized with student's name
- Shipping or pickup at studio

**Pricing Strategy:**
- Standard DVD: $25-30
- Personalized DVD: $35-40
- Pre-order discount: $5 off if ordered with tickets

**Technical Requirements:**
- Product type: `physical`
- Fulfillment: Ship or pickup
- Lead time: 2-3 weeks after show
- Inventory: Pre-order quantity (estimate production run)

---

### 2. **Digital Download**

**Description:** Downloadable MP4 file of the recital

**Features:**
- High-definition video (1080p)
- Download link valid for 30 days
- Can re-download during window
- DRM-free (family can keep forever)
- Instant delivery

**Pricing Strategy:**
- Full show download: $15-20
- Individual performance clip: $5-10
- Bundle: DVD + Download = $35 (save $5)

**Technical Requirements:**
- Product type: `digital_download`
- Delivery: Email with download link
- Storage: AWS S3 or Supabase Storage
- File size: 2-5 GB (need CDN)
- Access code generation and expiration

---

### 3. **Live Stream Access**

**Description:** Watch the recital live from home

**Features:**
- HD live stream during performance
- Watch from any device
- Optional: Recording available for 48 hours after
- Multiple viewers per access code
- Chat feature (optional)

**Pricing Strategy:**
- Live stream access: $20-30
- Extended replay (7 days): $25-35
- Family sharing (3 households): $40-50

**Technical Requirements:**
- Product type: `digital_streaming`
- Platform: YouTube Live (private), Vimeo Live, or custom
- Access code generation
- Concurrent viewer limits
- Recording storage (if replay included)

**Use Cases:**
- Grandparents who can't travel
- Family members out of state
- International relatives
- Sick family members

---

### 4. **Flower Delivery**

**Description:** Fresh bouquet delivered to student at venue

**Features:**
- Professional bouquet (roses, mixed)
- Delivered during show intermission or after
- Personalized card included
- Pre-arranged pickup location
- Multiple bouquet sizes

**Pricing Strategy:**
- Small bouquet: $30-35
- Large bouquet: $50-60
- Premium bouquet: $75-100

**Technical Requirements:**
- Product type: `physical_fulfillment`
- Variants: Small, Medium, Large, Premium
- Delivery details: Student name, show date/time
- Partner: Local florist or studio arranges
- Lead time: Order deadline 48 hours before show

**Workflow:**
1. Customer orders during ticket purchase
2. Admin receives notification
3. Admin places order with florist (or preps in-house)
4. Flowers delivered to venue before show
5. Studio staff delivers to student during intermission

---

### 5. **Recital T-Shirts & Merchandise**

**Description:** Commemorative show t-shirt or merch

**Features:**
- Custom design with show name/date
- Multiple sizes (Youth XS - Adult XXL)
- Color options
- Pickup at venue or ship
- Optional: Student's name on back

**Pricing Strategy:**
- Standard t-shirt: $20-25
- Premium t-shirt: $30-35
- Personalized (w/ name): $35-40
- Other merch (mugs, hoodies): $15-50

**Technical Requirements:**
- Product type: `physical_inventory`
- Variants: Size, color, personalization
- Inventory tracking per variant
- Fulfillment: Pickup or ship
- Lead time: Order deadline 2 weeks before show

**Inventory Management:**
- Pre-order model (orders placed with vendor based on sales)
- Or: Stock inventory (risk of overstock)

---

## Database Schema

### Schema Already Exists!

The database already has upsell tables (from Phase 1 ticketing):

```sql
-- Already exists in: supabase/migrations/20251116_012_ticketing_upsells.sql

CREATE TABLE upsell_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_show_id UUID REFERENCES recital_shows(id),

  -- Product details
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL, -- 'dvd', 'digital_download', 'live_stream', 'merchandise', 'flowers'

  -- Pricing
  price_in_cents INTEGER NOT NULL,

  -- Inventory (for physical items)
  inventory_quantity INTEGER,
  max_quantity_per_order INTEGER DEFAULT 10,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,

  -- Media
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upsell_item_id UUID REFERENCES upsell_items(id),

  -- File details
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT, -- 'video/mp4', 'application/pdf', etc.
  duration_seconds INTEGER,

  -- Access control
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID REFERENCES media_items(id),

  -- Access code
  access_code TEXT UNIQUE NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  max_downloads INTEGER DEFAULT 5,
  download_count INTEGER DEFAULT 0,

  -- Ownership
  order_id UUID REFERENCES ticket_orders(id),
  customer_email TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID REFERENCES media_access_codes(id),

  -- Access log
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
```

### New Tables Needed

#### 1. Product Variants (for sizes, colors, etc.)

```sql
-- ============================================
-- NEW TABLE: upsell_item_variants
-- ============================================
CREATE TABLE upsell_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id) ON DELETE CASCADE,

  -- Variant details
  variant_name TEXT NOT NULL, -- "Small", "Medium", "Large", "Youth XS", "Adult L"
  variant_type TEXT NOT NULL, -- "size", "color", "style"

  -- Pricing (optional override)
  price_override_in_cents INTEGER, -- If NULL, uses parent item price

  -- Inventory
  sku TEXT,
  inventory_quantity INTEGER,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,

  -- Display
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_variants_item ON upsell_item_variants(upsell_item_id);

COMMENT ON TABLE upsell_item_variants IS 'Product variants (sizes, colors, etc.) for upsell items';
```

#### 2. Order Line Items for Upsells

```sql
-- ============================================
-- NEW TABLE: upsell_order_items
-- ============================================
CREATE TABLE upsell_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id),

  -- Variant selection
  variant_id UUID REFERENCES upsell_item_variants(id),

  -- Quantity & pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_in_cents INTEGER NOT NULL,
  total_price_in_cents INTEGER NOT NULL,

  -- Customization
  customization_text TEXT, -- e.g., "Add student name: Emily Smith"

  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'fulfilled', 'cancelled'
  fulfillment_method TEXT, -- 'pickup', 'shipping', 'digital', 'venue_delivery'

  -- Delivery details (for flowers, etc.)
  delivery_recipient_name TEXT,
  delivery_notes TEXT,

  -- Shipping
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  tracking_number TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_order_items_order ON upsell_order_items(order_id);
CREATE INDEX idx_upsell_order_items_item ON upsell_order_items(upsell_item_id);
CREATE INDEX idx_upsell_order_items_status ON upsell_order_items(fulfillment_status);

COMMENT ON TABLE upsell_order_items IS 'Upsell products purchased in an order';
```

#### 3. Streaming Access Sessions

```sql
-- ============================================
-- NEW TABLE: streaming_sessions
-- ============================================
CREATE TABLE streaming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES ticket_orders(id),
  upsell_item_id UUID NOT NULL REFERENCES upsell_items(id),

  -- Access details
  access_code TEXT UNIQUE NOT NULL,
  stream_url TEXT NOT NULL,

  -- Timing
  stream_starts_at TIMESTAMPTZ NOT NULL,
  stream_ends_at TIMESTAMPTZ NOT NULL,
  replay_available_until TIMESTAMPTZ,

  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streaming_sessions_order ON streaming_sessions(order_id);
CREATE INDEX idx_streaming_sessions_code ON streaming_sessions(access_code);

COMMENT ON TABLE streaming_sessions IS 'Live stream access sessions for purchased tickets';
```

---

## User Experience Flow

### Customer Journey: Buying Tickets + DVD + Flowers

```
Step 1: Select Seats
├─> Customer selects 4 seats for Friday show
└─> Clicks "Add to Cart"

Step 2: Browse More Shows (Optional)
├─> Customer adds 4 seats for Saturday show
└─> Cart now has 8 tickets across 2 shows

Step 3: View Cart
├─> Cart shows:
│   ├─> Friday show: 4 tickets ($40)
│   └─> Saturday show: 4 tickets ($40)
├─> Subtotal: $80
└─> "Add Products" section appears

Step 4: Upsell Product Display
├─> Shows recommended products:
│   ├─> ⭐ Professional DVD - $30 (Save $5 when ordered with tickets!)
│   ├─> 📱 Digital Download - $18
│   ├─> 🌹 Flower Bouquet - $35
│   └─> 👕 Recital T-Shirt - $22
│
├─> Customer clicks "Add DVD"
│   └─> Modal: "Which show?" → Selects Friday
│   └─> Added to cart
│
└─> Customer clicks "Add Flowers"
    ├─> Modal: Select bouquet size (Small $35 / Large $55)
    ├─> Input: "Who are these for?" → "Emily Smith"
    ├─> Input: "Delivery time?" → "After show (approx 8:30 PM)"
    └─> Added to cart

Step 5: Review Updated Cart
├─> Cart now shows:
│   ├─> Friday tickets: 4 × $10 = $40
│   ├─> Saturday tickets: 4 × $10 = $40
│   ├─> Friday DVD: $30 $25 (bundle discount!)
│   └─> Flower Bouquet (Large): $55
├─> Total: $160
└─> "Proceed to Checkout"

Step 6: Checkout
├─> Enter customer info (same as before)
├─> Enter payment (Stripe - one charge for $160)
└─> Confirm purchase

Step 7: Confirmation
├─> Order confirmation email:
│   ├─> 8 tickets (4 Friday, 4 Saturday) - PDF attached
│   ├─> DVD confirmation - "Will be ready 3 weeks after show"
│   └─> Flower delivery - "Will be delivered to Emily Smith during Friday show"
│
└─> Customer receives:
    ├─> Tickets: Instant (email + PDF)
    ├─> Flowers: Delivered at venue on Friday
    └─> DVD: Ships in 3 weeks (tracking email sent when shipped)
```

---

## API Endpoints

### 1. Upsell Product Management (Admin)

#### List Products

```typescript
// GET /api/upsell-items?show_id={showId}
// Returns all upsell products for a show

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event)
  const showId = query.show_id as string

  const { data, error } = await client
    .from('upsell_items')
    .select(`
      *,
      upsell_item_variants(*)
    `)
    .eq('recital_show_id', showId)
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return { success: true, products: data }
})
```

#### Create Product

```typescript
// POST /api/upsell-items

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)

  // Validate admin
  await requireAdmin(event)

  const {
    recital_show_id,
    name,
    description,
    product_type,
    price_in_cents,
    inventory_quantity,
    image_url,
    variants
  } = body

  // Create product
  const { data: product, error } = await client
    .from('upsell_items')
    .insert({
      recital_show_id,
      name,
      description,
      product_type,
      price_in_cents,
      inventory_quantity,
      image_url,
      is_available: true
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  // Create variants if provided
  if (variants && variants.length > 0) {
    const variantData = variants.map((v: any) => ({
      upsell_item_id: product.id,
      variant_name: v.name,
      variant_type: v.type,
      price_override_in_cents: v.price_override,
      inventory_quantity: v.inventory,
      display_order: v.display_order || 0
    }))

    await client.from('upsell_item_variants').insert(variantData)
  }

  return { success: true, product }
})
```

### 2. Customer Purchase Flow

#### Add Upsell to Order

```typescript
// POST /api/ticket-orders/[orderId]/add-upsell

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const orderId = event.context.params?.orderId
  const body = await readBody(event)

  const {
    upsell_item_id,
    variant_id,
    quantity,
    customization_text,
    delivery_recipient_name,
    delivery_notes,
    shipping_address
  } = body

  // Get upsell item details
  const { data: upsellItem, error: itemError } = await client
    .from('upsell_items')
    .select('*, upsell_item_variants(*)')
    .eq('id', upsell_item_id)
    .single()

  if (itemError || !upsellItem) {
    throw createError({ statusCode: 404, message: 'Product not found' })
  }

  // Check availability
  if (!upsellItem.is_available) {
    throw createError({ statusCode: 400, message: 'Product not available' })
  }

  // Check inventory
  if (upsellItem.inventory_quantity !== null &&
      upsellItem.inventory_quantity < quantity) {
    throw createError({ statusCode: 400, message: 'Insufficient inventory' })
  }

  // Calculate price
  let unitPrice = upsellItem.price_in_cents
  if (variant_id) {
    const variant = upsellItem.upsell_item_variants.find(v => v.id === variant_id)
    if (variant?.price_override_in_cents) {
      unitPrice = variant.price_override_in_cents
    }
  }

  const totalPrice = unitPrice * quantity

  // Create order item
  const { data: orderItem, error: orderError } = await client
    .from('upsell_order_items')
    .insert({
      order_id: orderId,
      upsell_item_id,
      variant_id,
      quantity,
      unit_price_in_cents: unitPrice,
      total_price_in_cents: totalPrice,
      customization_text,
      delivery_recipient_name,
      delivery_notes,
      fulfillment_method: upsellItem.product_type === 'digital_download' ? 'digital' : 'pickup',
      ...shipping_address
    })
    .select()
    .single()

  if (orderError) {
    throw createError({ statusCode: 400, message: orderError.message })
  }

  // Update order total
  const { data: order } = await client
    .from('ticket_orders')
    .select('total_amount_in_cents')
    .eq('id', orderId)
    .single()

  await client
    .from('ticket_orders')
    .update({
      total_amount_in_cents: order.total_amount_in_cents + totalPrice
    })
    .eq('id', orderId)

  // Decrement inventory
  if (upsellItem.inventory_quantity !== null) {
    await client
      .from('upsell_items')
      .update({
        inventory_quantity: upsellItem.inventory_quantity - quantity
      })
      .eq('id', upsell_item_id)
  }

  return { success: true, order_item: orderItem }
})
```

### 3. Digital Delivery

#### Generate Download Link

```typescript
// POST /api/media/generate-access-code

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)

  const { order_id, media_item_id, customer_email } = body

  // Generate unique access code
  const accessCode = generateAccessCode() // e.g., "DL-A3F9K2L8M5N1"

  // Set expiration (30 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Create access code
  const { data, error } = await client
    .from('media_access_codes')
    .insert({
      media_item_id,
      access_code: accessCode,
      expires_at: expiresAt,
      max_downloads: 5,
      order_id,
      customer_email
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  // Generate download URL
  const downloadUrl = `${process.env.MARKETING_SITE_URL}/download/${accessCode}`

  // Send email
  await sendDigitalDownloadEmail(customer_email, {
    access_code: accessCode,
    download_url: downloadUrl,
    expires_at: expiresAt
  })

  return { success: true, access_code: accessCode, download_url: downloadUrl }
})

function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(12))
  const code = Array.from(randomBytes)
    .map(byte => chars[byte % chars.length])
    .join('')
  return `DL-${code}`
}
```

#### Download File

```typescript
// GET /api/media/download/[accessCode]

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const accessCode = event.context.params?.accessCode

  // Validate access code
  const { data: access, error } = await client
    .from('media_access_codes')
    .select(`
      *,
      media_item:media_items(*)
    `)
    .eq('access_code', accessCode)
    .single()

  if (error || !access) {
    throw createError({ statusCode: 404, message: 'Invalid access code' })
  }

  // Check expiration
  if (new Date(access.expires_at) < new Date()) {
    throw createError({ statusCode: 403, message: 'Access code expired' })
  }

  // Check download limit
  if (access.download_count >= access.max_downloads) {
    throw createError({ statusCode: 403, message: 'Download limit reached' })
  }

  // Increment download count
  await client
    .from('media_access_codes')
    .update({ download_count: access.download_count + 1 })
    .eq('id', access.id)

  // Log access
  const userAgent = getHeader(event, 'user-agent')
  const ipAddress = getHeader(event, 'x-forwarded-for') ||
                     getHeader(event, 'x-real-ip')

  await client.from('media_access_grants').insert({
    access_code_id: access.id,
    ip_address: ipAddress,
    user_agent: userAgent
  })

  // Generate signed URL for file download
  const { data: signedUrl } = await client.storage
    .from('media')
    .createSignedUrl(access.media_item.file_url, 3600) // 1 hour

  // Redirect to signed URL
  return sendRedirect(event, signedUrl.signedUrl)
})
```

---

## Admin Management

### Admin Pages

#### 1. Product Management Page

`pages/admin/ticketing/upsell-products/index.vue`

```vue
<script setup lang="ts">
const { data: products, refresh } = await useFetch('/api/upsell-items')
const router = useRouter()

const createProduct = () => {
  router.push('/admin/ticketing/upsell-products/create')
}

const editProduct = (id: string) => {
  router.push(`/admin/ticketing/upsell-products/${id}/edit`)
}
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Upsell Products</h1>
      <Button
        label="Create Product"
        icon="pi pi-plus"
        @click="createProduct"
      />
    </div>

    <DataTable :value="products" class="p-datatable-sm">
      <Column field="name" header="Product Name" sortable />
      <Column field="product_type" header="Type" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.product_type"
            :severity="getProductTypeSeverity(data.product_type)"
          />
        </template>
      </Column>
      <Column field="price_in_cents" header="Price">
        <template #body="{ data }">
          ${{ (data.price_in_cents / 100).toFixed(2) }}
        </template>
      </Column>
      <Column field="inventory_quantity" header="Stock" sortable />
      <Column field="is_available" header="Status">
        <template #body="{ data }">
          <Tag
            :value="data.is_available ? 'Available' : 'Unavailable'"
            :severity="data.is_available ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            text
            @click="editProduct(data.id)"
          />
          <Button
            icon="pi pi-trash"
            text
            severity="danger"
            @click="deleteProduct(data.id)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
```

#### 2. Create Product Form

`pages/admin/ticketing/upsell-products/create.vue`

```vue
<script setup lang="ts">
const toast = useToast()
const router = useRouter()

const productTypes = [
  { label: 'DVD', value: 'dvd' },
  { label: 'Digital Download', value: 'digital_download' },
  { label: 'Live Stream', value: 'live_stream' },
  { label: 'Flowers', value: 'flowers' },
  { label: 'Merchandise', value: 'merchandise' }
]

const form = ref({
  name: '',
  description: '',
  product_type: 'dvd',
  price_in_cents: 0,
  inventory_quantity: null,
  image_url: '',
  recital_show_id: null,
  variants: []
})

const hasVariants = computed(() => {
  return ['merchandise', 'flowers'].includes(form.value.product_type)
})

const addVariant = () => {
  form.value.variants.push({
    name: '',
    type: 'size',
    inventory: null,
    price_override: null
  })
}

const removeVariant = (index: number) => {
  form.value.variants.splice(index, 1)
}

const submit = async () => {
  try {
    await $fetch('/api/upsell-items', {
      method: 'POST',
      body: {
        ...form.value,
        price_in_cents: Math.round(form.value.price_in_cents * 100)
      }
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product created',
      life: 3000
    })

    router.push('/admin/ticketing/upsell-products')
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000
    })
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Create Upsell Product</h1>

    <Card>
      <template #content>
        <div class="space-y-4">
          <!-- Product Type -->
          <div>
            <label class="block font-medium mb-2">Product Type</label>
            <Dropdown
              v-model="form.product_type"
              :options="productTypes"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <!-- Name -->
          <div>
            <label class="block font-medium mb-2">Product Name</label>
            <InputText
              v-model="form.name"
              placeholder="e.g., Professional DVD Recording"
              class="w-full"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block font-medium mb-2">Description</label>
            <Textarea
              v-model="form.description"
              rows="4"
              placeholder="Describe the product..."
              class="w-full"
            />
          </div>

          <!-- Price -->
          <div>
            <label class="block font-medium mb-2">Price ($)</label>
            <InputNumber
              v-model="form.price_in_cents"
              mode="currency"
              currency="USD"
              :minFractionDigits="2"
              class="w-full"
            />
          </div>

          <!-- Inventory (if physical) -->
          <div v-if="['dvd', 'merchandise', 'flowers'].includes(form.product_type)">
            <label class="block font-medium mb-2">
              Initial Inventory (leave blank for unlimited)
            </label>
            <InputNumber
              v-model="form.inventory_quantity"
              :min="0"
              class="w-full"
            />
          </div>

          <!-- Image URL -->
          <div>
            <label class="block font-medium mb-2">Image URL</label>
            <InputText
              v-model="form.image_url"
              placeholder="https://..."
              class="w-full"
            />
          </div>

          <!-- Variants -->
          <div v-if="hasVariants">
            <div class="flex justify-between items-center mb-2">
              <label class="block font-medium">Variants (Sizes, Colors, etc.)</label>
              <Button
                label="Add Variant"
                icon="pi pi-plus"
                size="small"
                outlined
                @click="addVariant"
              />
            </div>

            <div
              v-for="(variant, index) in form.variants"
              :key="index"
              class="border border-gray-200 rounded-lg p-4 mb-2"
            >
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm mb-1">Name</label>
                  <InputText
                    v-model="variant.name"
                    placeholder="e.g., Small, Youth M"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm mb-1">Inventory</label>
                  <InputNumber
                    v-model="variant.inventory"
                    :min="0"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm mb-1">Price Override ($)</label>
                  <InputNumber
                    v-model="variant.price_override"
                    mode="currency"
                    currency="USD"
                    class="w-full"
                  />
                </div>
              </div>
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                size="small"
                class="mt-2"
                @click="removeVariant(index)"
              />
            </div>
          </div>

          <!-- Submit -->
          <div class="flex gap-2 justify-end mt-6">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              @click="router.back()"
            />
            <Button
              label="Create Product"
              icon="pi pi-check"
              @click="submit"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
```

#### 3. Fulfillment Dashboard

`pages/admin/ticketing/fulfillment/index.vue`

```vue
<script setup lang="ts">
// Dashboard for managing physical product fulfillment
const { data: orders } = await useFetch('/api/upsell-orders/pending')

const statusOptions = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Fulfilled', value: 'fulfilled' }
]

const selectedStatus = ref(null)

const updateStatus = async (itemId: string, newStatus: string) => {
  await $fetch(`/api/upsell-orders/${itemId}/status`, {
    method: 'PUT',
    body: { status: newStatus }
  })
  refresh()
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">Order Fulfillment</h1>

    <div class="mb-4">
      <Dropdown
        v-model="selectedStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Filter by status"
      />
    </div>

    <DataTable :value="orders">
      <Column field="order_number" header="Order #" />
      <Column field="customer_name" header="Customer" />
      <Column field="product_name" header="Product" />
      <Column field="quantity" header="Qty" />
      <Column field="fulfillment_method" header="Method">
        <template #body="{ data }">
          <Tag :value="data.fulfillment_method" />
        </template>
      </Column>
      <Column field="fulfillment_status" header="Status">
        <template #body="{ data }">
          <Dropdown
            v-model="data.fulfillment_status"
            :options="statusOptions.slice(1)"
            optionLabel="label"
            optionValue="value"
            @change="updateStatus(data.id, data.fulfillment_status)"
          />
        </template>
      </Column>
      <Column header="Details">
        <template #body="{ data }">
          <Button
            icon="pi pi-eye"
            text
            @click="viewDetails(data.id)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
```

---

## Customer Purchase Flow

### Components

#### 1. Upsell Product Card

`components/upsell/ProductCard.vue`

```vue
<script setup lang="ts">
import type { UpsellItem } from '~/types/ticketing'

interface Props {
  product: UpsellItem
  showId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  addToCart: [product: UpsellItem]
}>()

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const getProductIcon = (type: string) => {
  const icons = {
    dvd: 'pi-circle',
    digital_download: 'pi-download',
    live_stream: 'pi-video',
    flowers: 'pi-heart',
    merchandise: 'pi-shopping-bag'
  }
  return icons[type] || 'pi-gift'
}
</script>

<template>
  <Card class="h-full">
    <template #header>
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="w-full h-48 object-cover"
      />
      <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
        <i :class="['pi', getProductIcon(product.product_type), 'text-6xl text-gray-400']"></i>
      </div>
    </template>

    <template #title>
      {{ product.name }}
    </template>

    <template #subtitle>
      <div class="flex items-center gap-2">
        <Tag :value="product.product_type" severity="info" />
        <span class="text-lg font-bold text-primary-600">
          ${{ formatPrice(product.price_in_cents) }}
        </span>
      </div>
    </template>

    <template #content>
      <p class="text-gray-600 text-sm">
        {{ product.description }}
      </p>

      <!-- Stock info -->
      <div v-if="product.inventory_quantity !== null" class="mt-2">
        <Badge
          v-if="product.inventory_quantity > 0"
          :value="`${product.inventory_quantity} available`"
          severity="success"
        />
        <Badge
          v-else
          value="Out of stock"
          severity="danger"
        />
      </div>
    </template>

    <template #footer>
      <Button
        label="Add to Order"
        icon="pi pi-plus"
        class="w-full"
        :disabled="product.inventory_quantity === 0"
        @click="emit('addToCart', product)"
      />
    </template>
  </Card>
</template>
```

#### 2. Upsell Modal

`components/upsell/UpsellModal.vue`

```vue
<script setup lang="ts">
import type { UpsellItem } from '~/types/ticketing'

interface Props {
  visible: boolean
  product: UpsellItem | null
  showId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: any]
}>()

const selectedVariant = ref(null)
const quantity = ref(1)
const customization = ref('')
const recipientName = ref('')
const deliveryNotes = ref('')

const totalPrice = computed(() => {
  const basePrice = props.product?.price_in_cents || 0
  // TODO: Apply variant price override if selected
  return (basePrice * quantity.value) / 100
})

const confirm = () => {
  emit('confirm', {
    product_id: props.product?.id,
    variant_id: selectedVariant.value,
    quantity: quantity.value,
    customization: customization.value,
    recipient_name: recipientName.value,
    delivery_notes: deliveryNotes.value
  })
  close()
}

const close = () => {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Add to Order"
    :modal="true"
    class="w-full max-w-2xl"
  >
    <div v-if="product" class="space-y-4">
      <!-- Product Info -->
      <div class="flex gap-4">
        <img
          v-if="product.image_url"
          :src="product.image_url"
          class="w-24 h-24 object-cover rounded-lg"
        />
        <div>
          <h3 class="font-bold text-lg">{{ product.name }}</h3>
          <p class="text-gray-600 text-sm">{{ product.description }}</p>
          <p class="text-primary-600 font-bold mt-2">
            ${{ (product.price_in_cents / 100).toFixed(2) }}
          </p>
        </div>
      </div>

      <!-- Variants (if applicable) -->
      <div v-if="product.upsell_item_variants?.length > 0">
        <label class="block font-medium mb-2">Select Option</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="variant in product.upsell_item_variants"
            :key="variant.id"
            @click="selectedVariant = variant.id"
            :class="[
              'p-3 border rounded-lg transition-colors',
              selectedVariant === variant.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            {{ variant.variant_name }}
          </button>
        </div>
      </div>

      <!-- Quantity -->
      <div>
        <label class="block font-medium mb-2">Quantity</label>
        <InputNumber
          v-model="quantity"
          :min="1"
          :max="product.max_quantity_per_order"
          showButtons
        />
      </div>

      <!-- Customization (for merchandise) -->
      <div v-if="product.product_type === 'merchandise'">
        <label class="block font-medium mb-2">
          Personalization (optional)
        </label>
        <InputText
          v-model="customization"
          placeholder="e.g., Student's name"
          class="w-full"
        />
      </div>

      <!-- Delivery Info (for flowers) -->
      <div v-if="product.product_type === 'flowers'">
        <label class="block font-medium mb-2">Recipient Name</label>
        <InputText
          v-model="recipientName"
          placeholder="e.g., Emily Smith"
          class="w-full"
        />

        <label class="block font-medium mb-2 mt-4">Delivery Instructions</label>
        <Textarea
          v-model="deliveryNotes"
          rows="3"
          placeholder="e.g., Please deliver during intermission"
          class="w-full"
        />
      </div>

      <!-- Total -->
      <div class="border-t pt-4 mt-4">
        <div class="flex justify-between items-center text-lg font-bold">
          <span>Total:</span>
          <span>${{ totalPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined @click="close" />
        <Button label="Add to Order" icon="pi pi-plus" @click="confirm" />
      </template>
    </template>
  </Dialog>
</template>
```

---

## Digital Delivery System

### Email Templates

#### 1. Digital Download Email

```typescript
// server/utils/email/digitalDownloadTemplate.ts

export function getDigitalDownloadEmailTemplate(data: {
  customer_name: string
  product_name: string
  access_code: string
  download_url: string
  expires_at: Date
  max_downloads: number
}) {
  return {
    subject: `Your ${data.product_name} is Ready to Download`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button {
            display: inline-block;
            background: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .info-box {
            background: white;
            border-left: 4px solid #4F46E5;
            padding: 15px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Download is Ready!</h1>
          </div>

          <div class="content">
            <p>Hi ${data.customer_name},</p>

            <p>Thank you for your purchase! Your <strong>${data.product_name}</strong> is now ready to download.</p>

            <div style="text-align: center;">
              <a href="${data.download_url}" class="button">
                Download Now
              </a>
            </div>

            <div class="info-box">
              <h3>Download Instructions:</h3>
              <ul>
                <li>Click the button above to start your download</li>
                <li>You can download this file up to <strong>${data.max_downloads} times</strong></li>
                <li>This link expires on <strong>${data.expires_at.toLocaleDateString()}</strong></li>
                <li>Download size: Approximately 2-4 GB (HD quality)</li>
              </ul>
            </div>

            <div class="info-box">
              <h3>Your Access Code:</h3>
              <p style="font-size: 18px; font-weight: bold; font-family: monospace;">
                ${data.access_code}
              </p>
              <p style="font-size: 12px; color: #666;">
                Save this code in case you need to access your download later.
              </p>
            </div>

            <p>Need help? Reply to this email or contact us at support@example.com</p>

            <p>Enjoy!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${data.customer_name},

Your ${data.product_name} is ready to download!

Download URL: ${data.download_url}
Access Code: ${data.access_code}

This link expires on ${data.expires_at.toLocaleDateString()}.
You can download up to ${data.max_downloads} times.

Need help? Reply to this email or contact support@example.com
    `
  }
}
```

### Download Page

`pages/download/[accessCode].vue`

```vue
<script setup lang="ts">
const route = useRoute()
const accessCode = route.params.accessCode as string

const { data, error } = await useFetch(`/api/media/access/${accessCode}`)

const downloadFile = async () => {
  window.location.href = `/api/media/download/${accessCode}`
}

const remainingDownloads = computed(() => {
  if (!data.value) return 0
  return data.value.max_downloads - data.value.download_count
})

const isExpired = computed(() => {
  if (!data.value) return true
  return new Date(data.value.expires_at) < new Date()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Error State -->
      <div v-if="error" class="text-center">
        <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
        <h1 class="text-2xl font-bold mb-2">Invalid Access Code</h1>
        <p class="text-gray-600">
          This download link is invalid or has expired.
        </p>
      </div>

      <!-- Expired State -->
      <div v-else-if="isExpired" class="text-center">
        <i class="pi pi-clock text-6xl text-yellow-500 mb-4"></i>
        <h1 class="text-2xl font-bold mb-2">Download Expired</h1>
        <p class="text-gray-600">
          This download link expired on {{ new Date(data.expires_at).toLocaleDateString() }}.
        </p>
        <p class="text-gray-600 mt-4">
          Please contact support if you need a new download link.
        </p>
      </div>

      <!-- Download Ready -->
      <Card v-else>
        <template #title>
          <div class="flex items-center gap-3">
            <i class="pi pi-download text-primary-600"></i>
            <span>Your Download is Ready</span>
          </div>
        </template>

        <template #content>
          <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="font-semibold mb-2">Download Information:</h3>
              <ul class="space-y-1 text-sm">
                <li>• File size: {{ data.media_item.file_size_bytes ? formatFileSize(data.media_item.file_size_bytes) : 'Unknown' }}</li>
                <li>• Format: HD Video (MP4)</li>
                <li>• Remaining downloads: <strong>{{ remainingDownloads }}</strong></li>
                <li>• Expires: <strong>{{ new Date(data.expires_at).toLocaleDateString() }}</strong></li>
              </ul>
            </div>

            <div class="text-center">
              <Button
                label="Download Now"
                icon="pi pi-download"
                size="large"
                class="w-full"
                @click="downloadFile"
              />
            </div>

            <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <h4 class="font-semibold mb-2">Important Notes:</h4>
              <ul class="space-y-1">
                <li>• Make sure you have enough storage space (2-4 GB)</li>
                <li>• Download may take 10-30 minutes depending on your internet speed</li>
                <li>• Save the file to a location you can easily find later</li>
                <li>• You can watch the video with any media player (VLC, Windows Media Player, etc.)</li>
              </ul>
            </div>

            <div class="text-center text-sm text-gray-500">
              Access Code: <span class="font-mono font-bold">{{ accessCode }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
```

---

## Testing & QA

### Test Scenarios

#### 1. DVD Purchase Flow
- [ ] Admin creates DVD product for show
- [ ] Customer adds DVD during ticket checkout
- [ ] Order total includes DVD ($80 tickets + $30 DVD = $110)
- [ ] Payment processes correctly
- [ ] Confirmation email mentions DVD with expected delivery date
- [ ] Admin sees DVD order in fulfillment dashboard
- [ ] Admin marks DVD as shipped
- [ ] Customer receives shipping notification

#### 2. Digital Download Flow
- [ ] Customer purchases digital download
- [ ] Receives email with access code immediately
- [ ] Access code page loads correctly
- [ ] File downloads successfully
- [ ] Download count increments
- [ ] Max downloads enforced (5 downloads)
- [ ] Expiration works (30 days)
- [ ] Access code invalid after expiration

#### 3. Live Stream Flow
- [ ] Customer purchases live stream access
- [ ] Receives email with stream URL and access code
- [ ] Can access stream during show window
- [ ] Stream URL expires after show ends
- [ ] (Optional) Replay available for 48 hours

#### 4. Flower Delivery Flow
- [ ] Customer orders flowers during checkout
- [ ] Selects recipient name
- [ ] Adds delivery instructions
- [ ] Admin receives notification
- [ ] Fulfillment dashboard shows flower order
- [ ] Admin coordinates with florist
- [ ] Flowers delivered during show

#### 5. T-Shirt Purchase Flow
- [ ] Customer selects size
- [ ] (Optional) Adds personalization
- [ ] Chooses pickup or shipping
- [ ] If shipping: enters address
- [ ] Admin receives order
- [ ] Inventory decrements
- [ ] Fulfillment tracked

---

## Analytics & Reporting

### Key Metrics to Track

#### Product Performance
- Units sold per product
- Revenue per product type
- Attach rate (% of ticket orders that include upsells)
- Average order value (with vs without upsells)

#### Customer Behavior
- Most popular upsell products
- Bundle combinations (what products are bought together)
- Cart abandonment with upsells

#### Fulfillment Efficiency
- Time to fulfill physical orders
- Digital delivery success rate
- Customer support tickets related to upsells

### Admin Dashboard Widgets

`components/admin/UpsellAnalytics.vue`

```vue
<script setup lang="ts">
const { data: analytics } = await useFetch('/api/analytics/upsells')

const totalRevenue = computed(() => {
  return analytics.value?.total_revenue_in_cents / 100 || 0
})

const attachRate = computed(() => {
  if (!analytics.value) return 0
  return (analytics.value.orders_with_upsells / analytics.value.total_orders * 100).toFixed(1)
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <!-- Total Upsell Revenue -->
    <Card>
      <template #content>
        <div class="flex items-center gap-3">
          <div class="bg-green-100 p-3 rounded-full">
            <i class="pi pi-dollar text-2xl text-green-600"></i>
          </div>
          <div>
            <p class="text-sm text-gray-600">Upsell Revenue</p>
            <p class="text-2xl font-bold">${{ totalRevenue.toFixed(2) }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Attach Rate -->
    <Card>
      <template #content>
        <div class="flex items-center gap-3">
          <div class="bg-blue-100 p-3 rounded-full">
            <i class="pi pi-percentage text-2xl text-blue-600"></i>
          </div>
          <div>
            <p class="text-sm text-gray-600">Attach Rate</p>
            <p class="text-2xl font-bold">{{ attachRate }}%</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Top Product -->
    <Card>
      <template #content>
        <div class="flex items-center gap-3">
          <div class="bg-purple-100 p-3 rounded-full">
            <i class="pi pi-star text-2xl text-purple-600"></i>
          </div>
          <div>
            <p class="text-sm text-gray-600">Top Product</p>
            <p class="text-lg font-bold">{{ analytics?.top_product }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Pending Fulfillment -->
    <Card>
      <template #content>
        <div class="flex items-center gap-3">
          <div class="bg-orange-100 p-3 rounded-full">
            <i class="pi pi-box text-2xl text-orange-600"></i>
          </div>
          <div>
            <p class="text-sm text-gray-600">Pending Orders</p>
            <p class="text-2xl font-bold">{{ analytics?.pending_count }}</p>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
```

---

## Implementation Phases

### Phase 1: Foundation (2 days)
1. ✅ Database schema (already exists + new variants/order items tables)
2. ✅ Create product management API endpoints
3. ✅ Build admin product creation form
4. ✅ Test CRUD operations

### Phase 2: Customer Purchase Flow (2 days)
1. ✅ Product display components
2. ✅ Upsell modal
3. ✅ Add to cart integration
4. ✅ Update checkout to include upsells
5. ✅ Update order total calculation

### Phase 3: Digital Delivery (1-2 days)
1. ✅ Access code generation
2. ✅ Email delivery system
3. ✅ Download page
4. ✅ File storage setup (S3/Supabase)

### Phase 4: Fulfillment Dashboard (1 day)
1. ✅ Fulfillment tracking UI
2. ✅ Status updates
3. ✅ Order filtering and search

### Phase 5: Analytics & Polish (1 day)
1. ✅ Analytics dashboard
2. ✅ Revenue reporting
3. ✅ Testing and QA
4. ✅ Documentation

---

## Success Metrics

### Revenue Impact
- **Target:** Increase average order value by 30-40%
- **Example:** $40 ticket order → $55 with DVD upsell
- **Annual Impact:** If 1,000 tickets sold/year, +$15,000 revenue from upsells

### Customer Satisfaction
- Convenience of one-click add-ons
- Digital products delivered instantly
- Physical products coordinated seamlessly

### Operational Efficiency
- Reduced manual order taking
- Automated digital delivery
- Centralized fulfillment tracking

---

**End of Upsell Products Implementation Guide**

Ready to implement? Start with Phase 1 and iterate from there. The database foundation already exists, so you're 20% done before you even start coding!
