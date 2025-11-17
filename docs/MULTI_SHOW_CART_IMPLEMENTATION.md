# Multi-Show Shopping Cart Implementation Guide

**Feature:** Allow customers to purchase tickets to multiple shows in a single transaction
**Business Value:** Increase average order value, reduce credit card fees, improve customer convenience
**Priority:** HIGH - Core revenue feature
**Estimated Effort:** 3-5 days

---

## Table of Contents

1. [Business Requirements](#business-requirements)
2. [User Experience Flow](#user-experience-flow)
3. [Database Schema Changes](#database-schema-changes)
4. [API Endpoints](#api-endpoints)
5. [Composables](#composables)
6. [Components](#components)
7. [Pages](#pages)
8. [State Management](#state-management)
9. [Technical Considerations](#technical-considerations)
10. [Testing Checklist](#testing-checklist)

---

## Business Requirements

### Core Features
- ✅ Add tickets from multiple shows to a single cart
- ✅ View all cart items with show details
- ✅ Remove individual items or entire shows from cart
- ✅ Update quantities for each show
- ✅ Single payment for all shows
- ✅ Single order confirmation email with all tickets
- ✅ Persistent cart (survives page refresh)
- ✅ Cart expiration (7 days or after purchase)

### Business Rules
1. **Seat Reservations:** Each show's seats are reserved independently (10-minute timer per show)
2. **Minimum Timer:** Cart-wide timer is the minimum of all show timers (if any show expires, prompt to refresh)
3. **Pricing:** Calculate total across all shows
4. **Discounts:** Support cart-level discounts (optional: "Buy tickets to 3+ shows, get 10% off")
5. **Inventory:** Real-time seat availability for all shows in cart
6. **Limits:** Max 10 tickets per show, no limit on number of shows

---

## User Experience Flow

### Scenario: Parent buying tickets to Friday and Saturday shows

```
1. Browse Shows
   └─> Shows list page shows all recitals
   └─> Each show card has "Select Seats" button

2. Select Seats for Show 1 (Friday)
   └─> Choose 4 seats
   └─> Click "Add to Cart" (NOT "Checkout")
   └─> Toast: "4 tickets to Friday Show added to cart"
   └─> Cart badge shows: (4)

3. Continue Shopping
   └─> Return to shows list (cart persists)
   └─> Select Show 2 (Saturday)

4. Select Seats for Show 2 (Saturday)
   └─> Choose 4 seats
   └─> Click "Add to Cart"
   └─> Toast: "4 tickets to Saturday Show added to cart"
   └─> Cart badge shows: (8)

5. Review Cart
   └─> Click cart icon in header
   └─> See both shows with seat details
   └─> See total: $80 (4 tickets × $10 × 2 shows)

6. Checkout
   └─> Click "Proceed to Checkout"
   └─> Reserve all seats atomically
   └─> Single payment for $80
   └─> Get 8 tickets in one order

7. Confirmation
   └─> Order confirmation shows both shows
   └─> Email contains 8 PDF tickets (4 for Friday, 4 for Saturday)
   └─> QR codes unique per ticket
```

---

## Database Schema Changes

### Option 1: Extend Existing Tables (Recommended)

The existing schema can support multi-show carts with minimal changes:

```sql
-- ============================================
-- MODIFY: ticket_orders table
-- ============================================
-- ALREADY SUPPORTS MULTI-SHOW!
-- The ticket_orders table doesn't have a show_id,
-- so it can already contain tickets from multiple shows.

-- ticket_order_items already links to show_seats
-- show_seats already links to recital_shows
-- Therefore: One order can contain items from multiple shows

-- NO DATABASE CHANGES NEEDED!
```

### Current Schema (Already Multi-Show Ready)

```sql
-- ticket_orders
-- (id, order_number, customer_name, customer_email, total_amount_in_cents, status, payment_intent_id, ...)

-- ticket_order_items (join table)
-- (id, order_id, show_seat_id, ticket_id, price_in_cents, ...)
--      ↓
-- show_seats
-- (id, recital_show_id, seat_id, status, ...)
--      ↓
-- recital_shows
-- (id, name, date, start_time, ...)
```

**Key Insight:** The existing schema already supports multi-show orders because:
1. `ticket_orders` has no `show_id` column (not tied to single show)
2. `ticket_order_items` links to `show_seats`, which links to `recital_shows`
3. One order can have multiple items from different shows

### Optional Enhancement: Shopping Cart Persistence Table

For persistent carts (optional, can use localStorage first):

```sql
-- ============================================
-- NEW TABLE: shopping_carts (Optional)
-- ============================================
CREATE TABLE shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User tracking
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- If logged in
  session_id TEXT, -- If anonymous

  -- Cart state
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_carts_user ON shopping_carts(user_id);
CREATE INDEX idx_shopping_carts_session ON shopping_carts(session_id);
CREATE INDEX idx_shopping_carts_expires ON shopping_carts(expires_at);

-- ============================================
-- NEW TABLE: shopping_cart_items (Optional)
-- ============================================
CREATE TABLE shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,

  -- What they're buying
  recital_show_id UUID NOT NULL REFERENCES recital_shows(id) ON DELETE CASCADE,
  seat_ids UUID[] NOT NULL, -- Array of seat IDs selected

  -- Reservation tracking
  reservation_token TEXT, -- If seats are reserved
  reserved_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_cart_items_cart ON shopping_cart_items(cart_id);
CREATE INDEX idx_shopping_cart_items_show ON shopping_cart_items(recital_show_id);

COMMENT ON TABLE shopping_carts IS 'Persistent shopping carts for multi-show ticket purchases';
COMMENT ON TABLE shopping_cart_items IS 'Individual show items in a shopping cart';
```

**Decision:** Start with localStorage-based cart, add database persistence later if needed.

---

## API Endpoints

### 1. Cart Management (Client-side for V1)

For V1, we'll use a **localStorage-based cart** managed client-side. No new API endpoints needed for cart operations.

```typescript
// localStorage structure:
{
  "shopping_cart": {
    "items": [
      {
        "show_id": "uuid-1",
        "show_name": "Friday Evening Performance",
        "show_date": "2025-12-20",
        "show_time": "19:00",
        "seats": [
          { "id": "seat-1", "section": "Orchestra", "row": "E", "number": "12", "price": 1000 }
        ],
        "reservation_token": null,
        "added_at": "2025-11-17T10:30:00Z"
      },
      {
        "show_id": "uuid-2",
        "show_name": "Saturday Matinee Performance",
        "show_date": "2025-12-21",
        "show_time": "14:00",
        "seats": [
          { "id": "seat-5", "section": "Orchestra", "row": "F", "number": "8", "price": 1000 }
        ],
        "reservation_token": null,
        "added_at": "2025-11-17T10:35:00Z"
      }
    ],
    "expires_at": "2025-11-24T10:30:00Z"
  }
}
```

### 2. Modified Checkout API

**Endpoint:** `POST /api/ticket-orders/create-multi-show`

Create an order from multiple shows in cart:

```typescript
// Request
{
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "customer_phone": "555-1234",
  "items": [
    {
      "show_id": "uuid-1",
      "seat_ids": ["seat-1", "seat-2"]
    },
    {
      "show_id": "uuid-2",
      "seat_ids": ["seat-5", "seat-6"]
    }
  ]
}

// Response
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "order_number": "ORD-2025-001234",
    "total_amount_in_cents": 4000,
    "items": [
      {
        "show_id": "uuid-1",
        "show_name": "Friday Performance",
        "seats": [...],
        "subtotal_in_cents": 2000
      },
      {
        "show_id": "uuid-2",
        "show_name": "Saturday Performance",
        "seats": [...],
        "subtotal_in_cents": 2000
      }
    ]
  },
  "reservation_tokens": {
    "uuid-1": "token-1",
    "uuid-2": "token-2"
  }
}
```

**Implementation:**

```typescript
// server/api/ticket-orders/create-multi-show.post.ts
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)

  const { customer_name, customer_email, customer_phone, items } = body

  // Validate input
  if (!items || items.length === 0) {
    throw createError({ statusCode: 400, message: 'Cart is empty' })
  }

  if (items.length > 10) {
    throw createError({ statusCode: 400, message: 'Maximum 10 shows per order' })
  }

  // Start transaction
  const { data: order, error: orderError } = await client
    .from('ticket_orders')
    .insert({
      customer_name,
      customer_email,
      customer_phone,
      total_amount_in_cents: 0, // Will calculate below
      status: 'pending',
      order_number: null // Will be generated by DB function
    })
    .select()
    .single()

  if (orderError) {
    throw createError({ statusCode: 500, message: 'Failed to create order' })
  }

  let totalAmount = 0
  const orderItems = []
  const reservationTokens = {}

  // Process each show
  for (const item of items) {
    const { show_id, seat_ids } = item

    // Reserve seats for this show
    const reserveResponse = await $fetch(`/api/recital-shows/${show_id}/seats/reserve`, {
      method: 'POST',
      body: { seat_ids, email: customer_email }
    })

    if (!reserveResponse.success) {
      // Rollback: release all previously reserved seats
      // TODO: Add cleanup logic
      throw createError({
        statusCode: 400,
        message: `Failed to reserve seats for show ${show_id}`
      })
    }

    reservationTokens[show_id] = reserveResponse.reservation.token

    // Get seat details
    const { data: showSeats } = await client
      .from('show_seats')
      .select('id, seat:seats(section, row_name, seat_number), price_in_cents')
      .in('id', seat_ids)

    // Create order items
    for (const showSeat of showSeats) {
      const { data: ticket } = await client
        .from('tickets')
        .insert({
          order_id: order.id,
          show_seat_id: showSeat.id,
          ticket_number: null, // Generated by DB
          qr_code: null // Generated by DB
        })
        .select()
        .single()

      await client
        .from('ticket_order_items')
        .insert({
          order_id: order.id,
          show_seat_id: showSeat.id,
          ticket_id: ticket.id,
          price_in_cents: showSeat.price_in_cents
        })

      totalAmount += showSeat.price_in_cents
      orderItems.push({
        show_id,
        seat: showSeat.seat,
        price: showSeat.price_in_cents
      })
    }
  }

  // Update order total
  await client
    .from('ticket_orders')
    .update({ total_amount_in_cents: totalAmount })
    .eq('id', order.id)

  return {
    success: true,
    order: {
      ...order,
      total_amount_in_cents: totalAmount,
      items: orderItems
    },
    reservation_tokens: reservationTokens
  }
})
```

### 3. Modified Payment Intent API

**Endpoint:** `POST /api/ticket-orders/[orderId]/payment-intent`

No changes needed - works with multi-show orders automatically.

---

## Composables

### 1. `composables/useShoppingCart.ts`

Manages cart state and operations:

```typescript
import { ref, computed } from 'vue'
import type { RecitalShow, ShowSeat } from '~/types'

export interface CartItem {
  show_id: string
  show_name: string
  show_date: string
  show_time: string
  seats: ShowSeat[]
  reservation_token?: string
  reserved_until?: string
  added_at: string
}

export interface ShoppingCart {
  items: CartItem[]
  expires_at: string
}

const CART_STORAGE_KEY = 'studio_shopping_cart'
const CART_EXPIRY_DAYS = 7

export function useShoppingCart() {
  const cart = ref<ShoppingCart>(loadCart())
  const toast = useToast()

  /**
   * Load cart from localStorage
   */
  function loadCart(): ShoppingCart {
    if (process.server) {
      return { items: [], expires_at: getExpiryDate() }
    }

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (!stored) {
        return { items: [], expires_at: getExpiryDate() }
      }

      const parsed = JSON.parse(stored)

      // Check if expired
      if (new Date(parsed.expires_at) < new Date()) {
        localStorage.removeItem(CART_STORAGE_KEY)
        return { items: [], expires_at: getExpiryDate() }
      }

      return parsed
    } catch (error) {
      console.error('Failed to load cart:', error)
      return { items: [], expires_at: getExpiryDate() }
    }
  }

  /**
   * Save cart to localStorage
   */
  function saveCart() {
    if (process.server) return

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.value))
    } catch (error) {
      console.error('Failed to save cart:', error)
    }
  }

  /**
   * Get expiry date (7 days from now)
   */
  function getExpiryDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + CART_EXPIRY_DAYS)
    return date.toISOString()
  }

  /**
   * Add show to cart
   */
  function addToCart(show: RecitalShow, seats: ShowSeat[]) {
    // Check if show already in cart
    const existingIndex = cart.value.items.findIndex(
      item => item.show_id === show.id
    )

    if (existingIndex !== -1) {
      // Replace existing item
      cart.value.items[existingIndex] = {
        show_id: show.id,
        show_name: show.name,
        show_date: show.date,
        show_time: show.start_time,
        seats: seats,
        added_at: new Date().toISOString()
      }

      toast.add({
        severity: 'info',
        summary: 'Cart Updated',
        detail: `Updated tickets for ${show.name}`,
        life: 3000
      })
    } else {
      // Add new item
      cart.value.items.push({
        show_id: show.id,
        show_name: show.name,
        show_date: show.date,
        show_time: show.start_time,
        seats: seats,
        added_at: new Date().toISOString()
      })

      toast.add({
        severity: 'success',
        summary: 'Added to Cart',
        detail: `${seats.length} tickets for ${show.name}`,
        life: 3000
      })
    }

    saveCart()
  }

  /**
   * Remove show from cart
   */
  function removeFromCart(showId: string) {
    const item = cart.value.items.find(i => i.show_id === showId)

    cart.value.items = cart.value.items.filter(
      item => item.show_id !== showId
    )

    saveCart()

    if (item) {
      toast.add({
        severity: 'info',
        summary: 'Removed from Cart',
        detail: `Removed ${item.show_name}`,
        life: 3000
      })
    }
  }

  /**
   * Update seats for a show in cart
   */
  function updateCartItem(showId: string, seats: ShowSeat[]) {
    const index = cart.value.items.findIndex(i => i.show_id === showId)

    if (index !== -1) {
      cart.value.items[index].seats = seats
      saveCart()
    }
  }

  /**
   * Clear entire cart
   */
  function clearCart() {
    cart.value = { items: [], expires_at: getExpiryDate() }
    saveCart()

    toast.add({
      severity: 'info',
      summary: 'Cart Cleared',
      detail: 'All items removed',
      life: 3000
    })
  }

  /**
   * Get cart item count
   */
  const itemCount = computed(() => {
    return cart.value.items.reduce((sum, item) => sum + item.seats.length, 0)
  })

  /**
   * Get cart total
   */
  const totalAmount = computed(() => {
    return cart.value.items.reduce((sum, item) => {
      const itemTotal = item.seats.reduce((seatSum, seat) => {
        return seatSum + (seat.price_in_cents || 0)
      }, 0)
      return sum + itemTotal
    }, 0)
  })

  /**
   * Get show count
   */
  const showCount = computed(() => cart.value.items.length)

  /**
   * Check if cart is empty
   */
  const isEmpty = computed(() => cart.value.items.length === 0)

  /**
   * Check if show is in cart
   */
  function isShowInCart(showId: string): boolean {
    return cart.value.items.some(item => item.show_id === showId)
  }

  /**
   * Get cart item for show
   */
  function getCartItem(showId: string): CartItem | undefined {
    return cart.value.items.find(item => item.show_id === showId)
  }

  return {
    // State
    cart: computed(() => cart.value),

    // Computed
    itemCount,
    totalAmount,
    showCount,
    isEmpty,

    // Methods
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    isShowInCart,
    getCartItem
  }
}
```

---

## Components

### 1. `components/cart/CartBadge.vue`

Cart icon with item count badge in header:

```vue
<script setup lang="ts">
const { itemCount, showCount } = useShoppingCart()
const router = useRouter()

const goToCart = () => {
  router.push('/cart')
}
</script>

<template>
  <button
    @click="goToCart"
    class="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
    :aria-label="`Shopping cart with ${itemCount} items`"
  >
    <i class="pi pi-shopping-cart text-xl"></i>

    <!-- Badge -->
    <span
      v-if="itemCount > 0"
      class="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
    >
      {{ itemCount > 99 ? '99+' : itemCount }}
    </span>
  </button>
</template>
```

### 2. `components/cart/CartSummary.vue`

Cart items summary (sidebar or page):

```vue
<script setup lang="ts">
import type { CartItem } from '~/composables/useShoppingCart'

const { cart, removeFromCart, totalAmount, showCount } = useShoppingCart()
const router = useRouter()

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

const goToCheckout = () => {
  router.push('/cart/checkout')
}

const editShow = (showId: string) => {
  router.push(`/public/recitals/${showId}/seating`)
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Shopping Cart</h2>
        <Badge :value="showCount" severity="info" />
      </div>
    </template>

    <template #content>
      <!-- Empty State -->
      <div v-if="cart.items.length === 0" class="text-center py-8">
        <i class="pi pi-shopping-cart text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">Your cart is empty</p>
        <Button
          label="Browse Shows"
          icon="pi pi-search"
          class="mt-4"
          outlined
          @click="router.push('/public/recitals')"
        />
      </div>

      <!-- Cart Items -->
      <div v-else class="space-y-4">
        <div
          v-for="item in cart.items"
          :key="item.show_id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <!-- Show Header -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ item.show_name }}</h3>
              <p class="text-sm text-gray-600">
                {{ formatDate(item.show_date) }} at {{ formatTime(item.show_time) }}
              </p>
            </div>
            <Button
              icon="pi pi-times"
              text
              severity="danger"
              size="small"
              @click="removeFromCart(item.show_id)"
              aria-label="Remove from cart"
            />
          </div>

          <!-- Seats -->
          <div class="space-y-2 mb-3">
            <div
              v-for="seat in item.seats"
              :key="seat.id"
              class="flex justify-between items-center text-sm"
            >
              <span class="text-gray-700">
                {{ seat.section }} - Row {{ seat.row_name }}, Seat {{ seat.seat_number }}
              </span>
              <span class="font-medium">
                ${{ formatPrice(seat.price_in_cents || 0) }}
              </span>
            </div>
          </div>

          <!-- Subtotal & Actions -->
          <div class="flex justify-between items-center pt-3 border-t border-gray-200">
            <Button
              label="Edit Seats"
              icon="pi pi-pencil"
              text
              size="small"
              @click="editShow(item.show_id)"
            />
            <span class="font-semibold">
              Subtotal: ${{ formatPrice(item.seats.reduce((sum, s) => sum + (s.price_in_cents || 0), 0)) }}
            </span>
          </div>
        </div>

        <!-- Cart Total -->
        <div class="border-t-2 border-gray-300 pt-4">
          <div class="flex justify-between items-center text-lg font-bold">
            <span>Total ({{ showCount }} shows)</span>
            <span>${{ formatPrice(totalAmount) }}</span>
          </div>

          <div class="text-sm text-gray-600 mt-2">
            {{ itemCount }} tickets total
          </div>
        </div>

        <!-- Checkout Button -->
        <Button
          label="Proceed to Checkout"
          icon="pi pi-arrow-right"
          iconPos="right"
          class="w-full"
          size="large"
          @click="goToCheckout"
        />

        <!-- Continue Shopping -->
        <Button
          label="Continue Shopping"
          icon="pi pi-search"
          outlined
          class="w-full"
          @click="router.push('/public/recitals')"
        />
      </div>
    </template>
  </Card>
</template>
```

### 3. `components/seating/AddToCartButton.vue`

Button to add selected seats to cart (vs immediate checkout):

```vue
<script setup lang="ts">
import type { RecitalShow, ShowSeat } from '~/types'

interface Props {
  show: RecitalShow
  selectedSeats: ShowSeat[]
  disabled?: boolean
}

const props = defineProps<Props>()
const { addToCart, isShowInCart } = useShoppingCart()
const router = useRouter()

const handleAddToCart = () => {
  addToCart(props.show, props.selectedSeats)

  // Navigate back to shows list
  router.push('/public/recitals')
}

const handleUpdateCart = () => {
  addToCart(props.show, props.selectedSeats)
  router.push('/cart')
}
</script>

<template>
  <div class="flex gap-2">
    <!-- Add to Cart (New) -->
    <Button
      v-if="!isShowInCart(show.id)"
      label="Add to Cart"
      icon="pi pi-shopping-cart"
      :disabled="disabled || selectedSeats.length === 0"
      @click="handleAddToCart"
      outlined
      class="flex-1"
    />

    <!-- Update Cart (Existing) -->
    <Button
      v-else
      label="Update Cart"
      icon="pi pi-refresh"
      :disabled="disabled || selectedSeats.length === 0"
      @click="handleUpdateCart"
      outlined
      severity="info"
      class="flex-1"
    />

    <!-- Checkout Immediately -->
    <Button
      label="Checkout Now"
      icon="pi pi-arrow-right"
      iconPos="right"
      :disabled="disabled || selectedSeats.length === 0"
      @click="$emit('checkout')"
      class="flex-1"
    />
  </div>
</template>
```

---

## Pages

### 1. `pages/cart/index.vue`

Shopping cart page:

```vue
<script setup lang="ts">
const { cart, isEmpty } = useShoppingCart()
const router = useRouter()

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p class="text-gray-600 mt-1">Review your ticket selections</p>
      </div>

      <!-- Cart Summary Component -->
      <CartSummary />
    </div>
  </div>
</template>
```

### 2. `pages/cart/checkout.vue`

Multi-show checkout page:

```vue
<script setup lang="ts">
import type { CustomerInfo } from '~/types/ticketing'

const { cart, clearCart } = useShoppingCart()
const router = useRouter()
const toast = useToast()

const currentStep = ref<'customer' | 'payment'>('customer')
const customerInfo = ref<CustomerInfo>({
  name: '',
  email: '',
  phone: ''
})
const orderId = ref<string | null>(null)
const clientSecret = ref<string | null>(null)
const publishableKey = ref<string | null>(null)
const processing = ref(false)

// Redirect if cart is empty
onMounted(() => {
  if (cart.value.items.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Cart Empty',
      detail: 'Your cart is empty',
      life: 3000
    })
    router.push('/public/recitals')
  }
})

const handleCustomerInfoSubmit = async (info: CustomerInfo) => {
  customerInfo.value = info
  await createOrder()
}

const createOrder = async () => {
  processing.value = true

  try {
    // Format cart items for API
    const items = cart.value.items.map(item => ({
      show_id: item.show_id,
      seat_ids: item.seats.map(s => s.id)
    }))

    // Create multi-show order
    const orderResponse = await $fetch('/api/ticket-orders/create-multi-show', {
      method: 'POST',
      body: {
        customer_name: customerInfo.value.name,
        customer_email: customerInfo.value.email,
        customer_phone: customerInfo.value.phone,
        items
      }
    })

    if (!orderResponse.success) {
      throw new Error('Failed to create order')
    }

    orderId.value = orderResponse.order.id

    // Create payment intent
    const paymentResponse = await $fetch(
      `/api/ticket-orders/${orderId.value}/payment-intent`,
      { method: 'POST' }
    )

    clientSecret.value = paymentResponse.client_secret
    publishableKey.value = paymentResponse.publishable_key

    // Move to payment step
    currentStep.value = 'payment'
  } catch (error: any) {
    console.error('Error creating order:', error)
    toast.add({
      severity: 'error',
      summary: 'Order Failed',
      detail: error.message || 'Failed to create order',
      life: 5000
    })
  } finally {
    processing.value = false
  }
}

const handlePaymentSuccess = async (paymentIntentId: string) => {
  if (!orderId.value) return

  try {
    // Confirm payment
    await $fetch(`/api/ticket-orders/${orderId.value}/confirm`, {
      method: 'POST',
      body: { payment_intent_id: paymentIntentId }
    })

    // Clear cart
    clearCart()

    toast.add({
      severity: 'success',
      summary: 'Success!',
      detail: 'Your tickets have been purchased',
      life: 3000
    })

    // Navigate to confirmation
    router.push(`/cart/confirmation/${orderId.value}`)
  } catch (error: any) {
    console.error('Payment confirmation error:', error)
    toast.add({
      severity: 'error',
      summary: 'Payment Failed',
      detail: error.message,
      life: 5000
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Step Indicator -->
      <div class="mb-8">
        <StepIndicator
          :current-step="currentStep === 'customer' ? 1 : 2"
          :steps="['Customer Info', 'Payment']"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2">
          <!-- Customer Info -->
          <div v-show="currentStep === 'customer'">
            <CustomerInfoForm
              :initial-values="customerInfo"
              @submit="handleCustomerInfoSubmit"
              :disabled="processing"
            />
          </div>

          <!-- Payment -->
          <div v-show="currentStep === 'payment'">
            <PaymentForm
              v-if="clientSecret && publishableKey"
              :client-secret="clientSecret"
              :publishable-key="publishableKey"
              :amount="cart.items.reduce((sum, i) => sum + i.seats.reduce((s, seat) => s + (seat.price_in_cents || 0), 0), 0)"
              @success="handlePaymentSuccess"
              @error="(e) => toast.add({ severity: 'error', summary: 'Error', detail: e, life: 5000 })"
            />
          </div>
        </div>

        <!-- Order Summary Sidebar -->
        <div class="lg:col-span-1">
          <MultiShowOrderSummary :cart="cart" />
        </div>
      </div>
    </div>
  </div>
</template>
```

---

## State Management

### Pinia Store (Optional)

For more complex state management, create a Pinia store:

```typescript
// stores/cartStore.ts
import { defineStore } from 'pinia'
import type { CartItem, ShoppingCart } from '~/composables/useShoppingCart'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    expiresAt: null as string | null
  }),

  getters: {
    itemCount: (state) => {
      return state.items.reduce((sum, item) => sum + item.seats.length, 0)
    },

    totalAmount: (state) => {
      return state.items.reduce((sum, item) => {
        return sum + item.seats.reduce((s, seat) => s + (seat.price_in_cents || 0), 0)
      }, 0)
    },

    showCount: (state) => state.items.length,

    isEmpty: (state) => state.items.length === 0
  },

  actions: {
    // Same methods as composable
  }
})
```

---

## Technical Considerations

### 1. **Reservation Timing**

**Challenge:** How long to reserve seats when adding to cart?

**Options:**
- **Option A (Recommended):** Don't reserve seats when adding to cart. Only reserve at checkout.
  - Pros: Simple, no premature locking of inventory
  - Cons: Seats might be taken between cart add and checkout

- **Option B:** Reserve seats when adding to cart (10-minute timer per show)
  - Pros: Guarantees availability
  - Cons: Complex timer management, inventory locked too early

**Recommendation:** Option A. Reserve all seats atomically when user clicks "Proceed to Checkout" from cart.

### 2. **Cart Persistence**

**localStorage vs Database:**

| Feature | localStorage | Database |
|---------|-------------|----------|
| Setup | Immediate | Requires tables |
| Anonymous users | ✅ Yes | Requires session tracking |
| Cross-device | ❌ No | ✅ Yes |
| Expiration | Manual | Automatic (TTL) |
| Reliability | Browser-dependent | Server-managed |

**Recommendation:** Start with localStorage, add database persistence in Phase 2.

### 3. **Cart Expiration**

```typescript
// Auto-cleanup expired cart
onMounted(() => {
  const { cart, clearCart } = useShoppingCart()

  if (new Date(cart.value.expires_at) < new Date()) {
    clearCart()
    useToast().add({
      severity: 'info',
      summary: 'Cart Expired',
      detail: 'Your cart has expired. Please add items again.',
      life: 5000
    })
  }
})
```

### 4. **Concurrency Handling**

When reserving seats for multiple shows at checkout:

```typescript
// Reserve all shows in parallel
const reservationPromises = items.map(item =>
  $fetch(`/api/recital-shows/${item.show_id}/seats/reserve`, {
    method: 'POST',
    body: { seat_ids: item.seat_ids }
  })
)

try {
  const reservations = await Promise.all(reservationPromises)
  // All successful - proceed to payment
} catch (error) {
  // Any failed - release all and show error
  await releaseAllReservations(reservations)
  throw error
}
```

### 5. **Multi-Show Discounts**

Add discount logic at checkout:

```typescript
// Apply discount if buying 3+ shows
function calculateDiscount(items: CartItem[]): number {
  if (items.length >= 3) {
    const subtotal = items.reduce((sum, item) => /* calculate */)
    return Math.floor(subtotal * 0.10) // 10% off
  }
  return 0
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Cart composable: Add/remove/update items
- [ ] Cart composable: Calculate totals correctly
- [ ] Cart composable: Handle localStorage failures gracefully
- [ ] Cart composable: Expiration logic

### Integration Tests
- [ ] Add show to cart → persists in localStorage
- [ ] Remove show from cart → updates count
- [ ] Navigate between pages → cart persists
- [ ] Cart expiry → clears after 7 days
- [ ] Multi-show checkout → creates single order
- [ ] Multi-show checkout → reserves all seats
- [ ] Payment → charges correct total
- [ ] Payment success → clears cart

### E2E Tests
1. **Happy Path:**
   - Browse shows
   - Add Show A to cart (4 tickets)
   - Return to shows list
   - Add Show B to cart (2 tickets)
   - View cart (shows 2 shows, 6 tickets, correct total)
   - Proceed to checkout
   - Enter customer info
   - Complete payment
   - Receive confirmation with all 6 tickets

2. **Error Cases:**
   - Add show to cart → seats become unavailable → checkout fails gracefully
   - Add show to cart → cart expires → shows message
   - Start checkout → abandon → seats released after 10 minutes
   - Payment fails → can retry without re-selecting seats

### Browser Testing
- [ ] Chrome (localStorage)
- [ ] Firefox (localStorage)
- [ ] Safari (localStorage limits)
- [ ] Mobile browsers (storage quotas)
- [ ] Incognito mode (no persistence)

---

## Implementation Phases

### Phase 1: Basic Cart (2 days)
1. ✅ Create `useShoppingCart` composable
2. ✅ Add `CartBadge` to header
3. ✅ Create cart page with `CartSummary`
4. ✅ Update seat selection page: Add "Add to Cart" button
5. ✅ Test localStorage persistence

### Phase 2: Multi-Show Checkout (2 days)
1. ✅ Create `/api/ticket-orders/create-multi-show` endpoint
2. ✅ Create cart checkout page
3. ✅ Handle multi-show seat reservation
4. ✅ Handle payment for combined total
5. ✅ Clear cart on successful purchase

### Phase 3: Polish & Enhancements (1 day)
1. ✅ Add cart expiration warnings
2. ✅ Add "Edit seats" functionality
3. ✅ Add multi-show discount logic (optional)
4. ✅ Improve error handling
5. ✅ Add analytics tracking

---

## Success Metrics

After implementation, track:
- **Average order value:** Should increase by 30-50%
- **Shows per order:** Target 1.5+ shows per order
- **Cart abandonment rate:** Target <30%
- **Checkout completion:** Target >70%
- **Customer satisfaction:** Survey feedback on multi-show purchase experience

---

## Future Enhancements

### Phase 4: Advanced Features
1. **Save cart for later** - Email cart link to finish later
2. **Shared carts** - Family members can add to same cart
3. **Wishlist** - Save shows to buy later
4. **Gift purchases** - Buy tickets for someone else
5. **Season passes** - Bundle all shows in series
6. **Subscription model** - Monthly pass for all shows

---

**End of Multi-Show Cart Implementation Guide**

Next: See [UPSELL_PRODUCTS_IMPLEMENTATION.md](./UPSELL_PRODUCTS_IMPLEMENTATION.md) for DVD, digital download, and merchandise features.
