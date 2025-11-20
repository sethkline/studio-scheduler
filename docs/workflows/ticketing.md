# Ticketing Workflow

## Overview

The ticketing system allows customers to purchase tickets for recital shows with interactive seat selection, Stripe payment processing, and digital ticket delivery via email with QR codes.

## User Flow

```mermaid
flowchart TD
    A[Customer visits public ticket page] --> B[View show details and seating chart]
    B --> C{Seats available?}
    C -->|No| D[Show "Sold Out" message]
    C -->|Yes| E[Select seats on interactive chart]
    E --> F[Review seat selection and pricing]
    F --> G[Enter customer information]
    G --> H[Click "Checkout"]
    H --> I[Redirect to Stripe Checkout]
    I --> J{Payment successful?}
    J -->|No| K[Return to seat selection]
    J -->|Yes| L[Create order and tickets]
    L --> M[Send confirmation email with QR codes]
    M --> N[Display success page with tickets]
```

## Step-by-Step Process

### 1. Browse Available Shows

**Page**: `/public/recital-tickets/[recital_id]`

**What happens**:
- Customer navigates to public ticket page
- System loads recital details from database
- Shows list of available shows in the recital series
- Displays show dates, times, and availability status

**Code flow**:
```typescript
// pages/public/recital-tickets/[id].vue
const { data: recital } = await useAsyncData('recital', () =>
  $fetch(`/api/recitals/${route.params.id}`)
)

const { data: shows } = await useAsyncData('shows', () =>
  $fetch(`/api/recital-shows/list`, {
    query: { recital_id: route.params.id }
  })
)
```

### 2. Select Show and View Seating Chart

**Component**: `SeatingChart.vue`

**What happens**:
- Customer clicks on a show
- Interactive seating chart loads
- Shows available (green), reserved (yellow), and sold (red) seats
- Real-time updates via Supabase Realtime

**Code flow**:
```typescript
// composables/useTicketingService.ts
const { data: seatingChart } = await useFetch(`/api/seating-charts/${showId}`)

// Subscribe to real-time seat updates
const channel = supabase
  .channel('seats-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'seats',
    filter: `seating_chart_id=eq.${seatingChart.value.id}`
  }, handleSeatUpdate)
  .subscribe()
```

### 3. Select Seats

**Component**: `SeatingChart.vue`

**What happens**:
- Customer clicks seats to select/deselect
- System checks seat availability before allowing selection
- Consecutive seat detection highlights adjacent seats
- Running total updates in sidebar

**Code flow**:
```typescript
// components/seating/SeatingChart.vue
const selectSeat = (seat) => {
  if (seat.status !== 'available') return

  if (selectedSeats.value.includes(seat.id)) {
    // Deselect
    selectedSeats.value = selectedSeats.value.filter(s => s !== seat.id)
  } else {
    // Select
    selectedSeats.value.push(seat.id)
  }

  updateTotal()
}
```

### 4. Review and Enter Information

**Component**: `TicketCheckout.vue`

**What happens**:
- Customer reviews selected seats
- Enters name, email, phone (optional)
- Reviews pricing breakdown (tickets + fees)
- Agrees to terms and conditions

**Validation**:
```typescript
const schema = yup.object({
  email: yup.string().email().required('Email is required'),
  name: yup.string().required('Name is required'),
  phone: yup.string().optional()
})
```

### 5. Create Stripe Checkout Session

**API Endpoint**: `/api/stripe/create-checkout-session.post.ts`

**What happens**:
- System creates temporary seat reservations (15 minutes)
- Creates Stripe checkout session
- Returns session URL for redirect

**Code flow**:
```typescript
// server/api/stripe/create-checkout-session.post.ts
export default defineEventHandler(async (event) => {
  const { seats, showId, customerInfo } = await readBody(event)

  // 1. Reserve seats temporarily
  await reserveSeats(seats, 15) // 15 minute reservation

  // 2. Create Stripe session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: seats.map(seat => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `Seat ${seat.number}` },
        unit_amount: seat.price * 100
      },
      quantity: 1
    })),
    success_url: `${baseUrl}/public/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/public/recital-tickets/${showId}`,
    customer_email: customerInfo.email,
    metadata: {
      show_id: showId,
      seat_ids: seats.map(s => s.id).join(',')
    }
  })

  return { url: session.url }
})
```

### 6. Stripe Checkout

**What happens**:
- Customer redirected to Stripe-hosted checkout page
- Enters payment information (credit card)
- Stripe processes payment securely
- Customer redirected back based on payment result

**Security**:
- No credit card data touches our servers (PCI compliance)
- Stripe handles all sensitive data
- Webhook verifies payment authenticity

### 7. Payment Webhook Processing

**API Endpoint**: `/api/stripe/webhook.post.ts`

**What happens** (on successful payment):
- Stripe sends webhook event: `checkout.session.completed`
- System verifies webhook signature
- Creates order record
- Creates ticket records
- Confirms seat reservations (makes permanent)
- Generates QR codes for tickets
- Triggers email notification

**Code flow**:
```typescript
// server/api/stripe/webhook.post.ts
export default defineEventHandler(async (event) => {
  const sig = getHeader(event, 'stripe-signature')
  const body = await readRawBody(event)

  // Verify webhook signature
  const stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret)

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object

    // 1. Create order
    const order = await createOrder({
      email: session.customer_email,
      total: session.amount_total / 100,
      stripe_session_id: session.id,
      show_id: session.metadata.show_id
    })

    // 2. Create tickets and confirm seats
    const seatIds = session.metadata.seat_ids.split(',')
    const tickets = await createTickets(order.id, seatIds)

    // 3. Generate QR codes
    for (const ticket of tickets) {
      ticket.qr_code = await generateQRCode(ticket.id)
    }

    // 4. Send confirmation email
    await sendTicketConfirmationEmail(order, tickets)
  }

  return { received: true }
})
```

### 8. Email Confirmation

**What happens**:
- System sends email using Mailgun
- Email includes order details
- Each ticket attached as PDF with QR code
- QR code encodes ticket validation data

**Email template** (MJML):
```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-text>Thank you for your ticket purchase!</mj-text>
      <mj-text>Order #{{order.id}}</mj-text>

      <mj-text font-weight="bold">Your Tickets:</mj-text>
      {{#each tickets}}
        <mj-text>Seat {{seat_number}} - ${{price}}</mj-text>
        <mj-image src="{{qr_code_url}}" width="200px" />
      {{/each}}
    </mj-section>
  </mj-body>
</mjml>
```

### 9. Success Page

**Page**: `/public/tickets/success`

**What happens**:
- Customer redirected from Stripe
- System fetches order details
- Displays confirmation message
- Shows tickets with QR codes
- Provides print and download options

**Code flow**:
```typescript
// pages/public/tickets/success.vue
const { data: order } = await useAsyncData('order', () =>
  $fetch('/api/orders/lookup', {
    query: { session_id: route.query.session_id }
  })
)
```

## Seat Reservation System

### Temporary Reservations

When customer proceeds to checkout:
- Seats marked as "reserved" for 15 minutes
- Other customers cannot select these seats
- If payment not completed, reservation expires
- Seats automatically released back to available pool

### Permanent Reservations

After successful payment:
- Seats marked as "sold"
- Linked to order and ticket records
- Cannot be released or refunded (per business rules)

## Real-time Seat Updates

Multiple customers can browse the same show simultaneously:

```typescript
// Real-time subscription
const channel = supabase
  .channel('seats-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'seats',
    filter: `seating_chart_id=eq.${chartId}`
  }, (payload) => {
    const updatedSeat = payload.new
    updateSeatInUI(updatedSeat)
  })
  .subscribe()
```

## QR Code Generation

Each ticket gets a unique QR code:

```typescript
import QRCode from 'qrcode'

const generateQRCode = async (ticketId: string) => {
  const data = JSON.stringify({
    ticket_id: ticketId,
    validation_code: generateValidationCode(),
    timestamp: Date.now()
  })

  const qrCode = await QRCode.toDataURL(data)
  return qrCode
}
```

## Ticket Validation

At venue entrance, staff scan QR codes:

**Page**: `/admin/ticket-scanner`

**Process**:
1. Scan QR code with device camera
2. Decode ticket data
3. Validate ticket ID and code
4. Check if already scanned
5. Mark as "checked in"
6. Display seat assignment

## Error Handling

### Common Scenarios

**Seats become unavailable during checkout**:
- Show error message
- Release other selected seats
- Return to seat selection

**Payment fails**:
- Stripe redirects to cancel URL
- Seat reservations remain (until timeout)
- Customer can retry

**Webhook not received**:
- Seats remain reserved
- Customer sees pending status
- Admin can manually resolve

**Email delivery fails**:
- Order still created successfully
- Tickets viewable on success page
- Retry email sending from admin panel

## Admin Features

### Order Management

**Page**: `/admin/orders`

- View all orders
- Search by email or order ID
- Filter by show
- Refund orders (releases seats)
- Resend confirmation emails

### Ticket Scanning

**Page**: `/admin/ticket-scanner`

- Scan QR codes for check-in
- Manual ticket lookup
- View attendance statistics

### Reporting

- Ticket sales by show
- Revenue reports
- Attendance tracking
- Popular seating sections

## Related Documentation

- [Payment Workflow](/docs/workflows/payments.md)
- [Architecture Guide](/docs/architecture.md)
- [TICKETING_SYSTEM_REVIEW.md](/docs/TICKETING_SYSTEM_REVIEW.md)
- [Stripe Integration Guide](https://stripe.com/docs/checkout)
