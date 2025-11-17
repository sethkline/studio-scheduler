# Ticketing System Implementation Roadmap

**Created:** 2025-11-16
**Status:** 🚧 In Progress - Phase 1 (Database Foundation)
**Estimated Effort:** 8-10 weeks
**Priority:** CRITICAL (Tier 1)
**Last Updated:** 2025-11-16

---

## Implementation Progress

### ✅ Completed (2025-11-16)

**Phase 1: Database Foundation - Week 1 & 2**

All database migrations have been created and are ready for deployment:

1. **Migration 1: Venues & Seating Infrastructure** ✅
   - File: `supabase/migrations/20251116_010_ticketing_venues_seats.sql`
   - Created 4 tables: `venues`, `venue_sections`, `price_zones`, `seats`
   - Added indexes for performance optimization
   - Implemented RLS policies for admin/staff/public access
   - Added `updated_at` triggers

2. **Migration 2: Show Seats & Ticketing** ✅
   - File: `supabase/migrations/20251116_011_ticketing_shows_orders.sql`
   - Created 4 tables: `show_seats`, `ticket_orders`, `tickets`, `ticket_order_items`
   - Linked `venue_id` to existing `recital_shows` table
   - Added indexes for seat availability queries
   - Implemented customer/admin RLS policies
   - Added reservation tracking fields

3. **Migration 3: Upsells & Digital Products** ✅
   - File: `supabase/migrations/20251116_012_ticketing_upsells.sql`
   - Created 4 tables: `upsell_items`, `media_items`, `media_access_codes`, `media_access_grants`
   - Linked to `recital_series` for series-specific upsells
   - Added download tracking for digital media
   - Implemented access control via unique codes

4. **Migration 4: Helper Functions** ✅
   - File: `supabase/migrations/20251116_013_ticketing_functions.sql`
   - Created 9 PostgreSQL functions:
     - `generate_show_seats()` - Auto-generate show seats from venue template
     - `cleanup_expired_reservations()` - Release expired seat holds
     - `generate_order_number()` - Create unique order IDs
     - `generate_ticket_number()` - Create unique ticket IDs
     - `generate_qr_code()` - Create unique QR codes
     - `generate_access_code()` - Create media access codes
     - `reserve_seats()` - Temporarily reserve seats during checkout
     - `release_seats()` - Release reserved seats
     - `mark_seats_sold()` - Finalize seat purchases
     - `get_seat_availability_stats()` - Get availability statistics

5. **Migration 5: Payment Integration** ✅
   - File: `supabase/migrations/20251116_014_payment_ticket_orders_fk.sql`
   - Added FK constraint from `payment_transactions` to `ticket_orders`
   - Integrated ticketing with existing unified payment system

**Database Summary:**
- **Tables Created:** 12 new tables
- **Functions Created:** 9 PostgreSQL functions
- **Migrations:** 5 migration files
- **Status:** Ready for deployment to database

### 🔄 Next Steps

**Phase 2: Admin Seat Map Builder (Week 3-4)**
- Create venue management pages
- Build visual seat map editor
- Implement CSV import for bulk seat creation

---

## Executive Summary

This roadmap outlines the phased implementation of a complete recital ticketing system with online seat selection. The system will integrate with the existing dance studio management platform and leverage current infrastructure where possible (Stripe payments, Supabase database, email system).

**What We Have:**
- ~20% UI components (seating, reservation timer)
- TypeScript types defined
- Existing payment and email infrastructure
- Recital shows already in database

**What We Need:**
- Database schema for ticketing (~12 tables)
- API endpoints (~20 endpoints)
- Admin seat map builder
- Public ticket purchase flow
- Order management system

---

## Phase 1: Database Foundation (Week 1-2)

**Goal:** Create all database tables, relationships, and RLS policies

### Week 1: Core Tables

#### Migration 1: Venues & Seating Infrastructure
**File:** `20251116_010_ticketing_venues_seats.sql`

**Tables to Create:**
```sql
-- Venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  capacity INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venue Sections (e.g., Orchestra, Balcony, etc.)
CREATE TABLE venue_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Zones
CREATE TABLE price_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_in_cents INTEGER NOT NULL,
  color TEXT, -- hex color for visual display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seats (base template for venue)
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES venue_sections(id) ON DELETE CASCADE,
  row_name TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'regular' CHECK (seat_type IN ('regular', 'ada', 'house', 'blocked')),
  price_zone_id UUID REFERENCES price_zones(id),
  is_sellable BOOLEAN DEFAULT true,
  x_position INTEGER, -- for visual editor
  y_position INTEGER, -- for visual editor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, section_id, row_name, seat_number)
);
```

**Indexes:**
```sql
CREATE INDEX idx_seats_venue ON seats(venue_id);
CREATE INDEX idx_seats_section ON seats(section_id);
CREATE INDEX idx_seats_price_zone ON seats(price_zone_id);
CREATE INDEX idx_venue_sections_venue ON venue_sections(venue_id);
```

**RLS Policies:**
- Admin/staff can manage all venues
- Public can view venues (for show listings)

---

#### Migration 2: Show Seats & Ticketing
**File:** `20251116_011_ticketing_shows_orders.sql`

**Tables to Create:**
```sql
-- Link venues to recital shows
ALTER TABLE recital_shows
  ADD COLUMN venue_id UUID REFERENCES venues(id);

CREATE INDEX idx_recital_shows_venue ON recital_shows(venue_id);

-- Show Seats (per-show availability)
CREATE TABLE show_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES recital_shows(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'sold', 'held')),
  price_in_cents INTEGER NOT NULL, -- snapshot from price_zone at show creation

  -- Reservation fields
  reserved_by TEXT, -- session UUID
  reserved_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, seat_id)
);

-- Ticket Orders
CREATE TABLE ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES recital_shows(id),

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Payment
  stripe_payment_intent_id TEXT,
  total_amount_in_cents INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

  -- Metadata
  order_number TEXT UNIQUE, -- human-readable order number
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets (individual seat tickets)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  show_seat_id UUID NOT NULL REFERENCES show_seats(id),

  -- Ticket details
  qr_code TEXT UNIQUE NOT NULL, -- unique token for validation
  ticket_number TEXT UNIQUE, -- human-readable ticket number

  -- PDF generation
  pdf_url TEXT, -- Supabase Storage URL
  pdf_generated_at TIMESTAMPTZ,

  -- Validation
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_order_id, show_seat_id)
);

-- Order Items (for upsells)
CREATE TABLE ticket_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL CHECK (item_type IN ('ticket', 'digital_download', 'dvd', 'merchandise')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_in_cents INTEGER NOT NULL,

  -- References (depending on type)
  ticket_id UUID REFERENCES tickets(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_show_seats_show ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
CREATE INDEX idx_show_seats_reservation ON show_seats(reserved_until) WHERE status = 'reserved';

CREATE INDEX idx_ticket_orders_show ON ticket_orders(show_id);
CREATE INDEX idx_ticket_orders_email ON ticket_orders(customer_email);
CREATE INDEX idx_ticket_orders_status ON ticket_orders(status);

CREATE INDEX idx_tickets_order ON tickets(ticket_order_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
```

**RLS Policies:**
- Anyone can view available show_seats
- Only system can update show_seats (via API)
- Customers can view their own orders
- Admin/staff can view all orders

---

### Week 2: Upsells & Functions

#### Migration 3: Upsells & Digital Products
**File:** `20251116_012_ticketing_upsells.sql`

```sql
-- Upsell Items
CREATE TABLE upsell_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_series_id UUID REFERENCES recital_series(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('digital_download', 'dvd', 'merchandise', 'bundle')),
  price_in_cents INTEGER NOT NULL,

  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital Media Items
CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_series_id UUID NOT NULL REFERENCES recital_series(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT, -- Supabase Storage URL
  duration_seconds INTEGER,
  file_size_mb NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital Access Codes
CREATE TABLE media_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,

  access_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link access codes to media
CREATE TABLE media_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID NOT NULL REFERENCES media_access_codes(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

  accessed_at TIMESTAMPTZ, -- track when first accessed
  download_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### Migration 4: Helper Functions
**File:** `20251116_013_ticketing_functions.sql`

```sql
-- Function to generate show_seats from venue seats
CREATE OR REPLACE FUNCTION generate_show_seats(p_show_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_venue_id UUID;
  v_inserted_count INTEGER;
BEGIN
  -- Get venue for this show
  SELECT venue_id INTO v_venue_id
  FROM recital_shows
  WHERE id = p_show_id;

  -- Insert show_seats based on venue seats
  WITH inserted AS (
    INSERT INTO show_seats (show_id, seat_id, price_in_cents)
    SELECT
      p_show_id,
      s.id,
      COALESCE(pz.price_in_cents, 0)
    FROM seats s
    LEFT JOIN price_zones pz ON s.price_zone_id = pz.id
    WHERE s.venue_id = v_venue_id
      AND s.is_sellable = true
    ON CONFLICT (show_id, seat_id) DO NOTHING
    RETURNING *
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE show_seats
  SET
    status = 'available',
    reserved_by = NULL,
    reserved_until = NULL
  WHERE status = 'reserved'
    AND reserved_until < NOW()
  RETURNING *;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;
```

---

#### Update Payment Transactions
Since we already have `payment_transactions` table with `ticket_order_id` column (from unified payment migration), we just need to ensure the FK constraint is created:

```sql
-- This column already exists but FK was not created (table didn't exist)
-- Now we can add the constraint
ALTER TABLE payment_transactions
  ADD CONSTRAINT fk_payment_ticket_order
  FOREIGN KEY (ticket_order_id) REFERENCES ticket_orders(id) ON DELETE SET NULL;
```

---

## Phase 2: Admin Seat Map Builder (Week 3-4)

**Goal:** Build admin UI for creating and managing venue seat maps

### Week 3: Venue Management

**Components to Create:**
1. `/pages/admin/ticketing/venues/index.vue` - Venue list page
2. `/pages/admin/ticketing/venues/create.vue` - Create new venue
3. `/pages/admin/ticketing/venues/[id]/edit.vue` - Edit venue details
4. `/pages/admin/ticketing/venues/[id]/seat-map.vue` - Seat map builder

**Composables:**
```typescript
// composables/useVenues.ts
export function useVenues() {
  const listVenues = async () => { /* ... */ }
  const getVenue = async (id: string) => { /* ... */ }
  const createVenue = async (data: CreateVenueInput) => { /* ... */ }
  const updateVenue = async (id: string, data: UpdateVenueInput) => { /* ... */ }
  const deleteVenue = async (id: string) => { /* ... */ }

  return {
    listVenues,
    getVenue,
    createVenue,
    updateVenue,
    deleteVenue
  }
}
```

**API Endpoints:**
- `GET /api/venues` - List all venues
- `POST /api/venues` - Create venue
- `GET /api/venues/[id]` - Get venue details
- `PUT /api/venues/[id]` - Update venue
- `DELETE /api/venues/[id]` - Delete venue

---

### Week 4: Seat Map Builder

**Visual Editor Requirements:**
- Canvas with zoom/pan
- Drag-and-drop sections
- Add rows with auto-numbering
- Add individual seats
- Assign price zones visually
- Mark ADA/blocked seats
- CSV import
- Preview mode

**Components:**
```
/components/seat-map-builder/
├── SeatMapBuilder.vue (main canvas)
├── BuilderToolbar.vue (tools)
├── BuilderCanvas.vue (drawing area)
├── SeatNode.vue (individual seat)
├── SectionNode.vue (section container)
├── PriceZonePanel.vue (price zone manager)
└── ImportCSV.vue (CSV importer)
```

**Store:**
```typescript
// stores/seatMapBuilder.ts
export const useSeatMapBuilderStore = defineStore('seatMapBuilder', {
  state: () => ({
    venue: null,
    sections: [],
    seats: [],
    priceZones: [],
    selectedNode: null,
    history: [], // for undo/redo
    historyIndex: -1
  }),

  actions: {
    addSection() { /* ... */ },
    addRow() { /* ... */ },
    addSeat() { /* ... */ },
    updateSeat() { /* ... */ },
    deleteSeat() { /* ... */ },
    undo() { /* ... */ },
    redo() { /* ... */ },
    save() { /* ... */ }
  }
})
```

**API Endpoints:**
- `GET /api/venues/[id]/seat-map` - Get seat map data
- `POST /api/venues/[id]/seat-map` - Save seat map
- `POST /api/venues/[id]/seat-map/import-csv` - Import CSV

---

## Phase 3: Show Configuration & Seat Generation (Week 5)

**Goal:** Link venues to shows and generate show_seats

### Extend Recital Show Management

**Update:**
- `/pages/recitals/series/[seriesId]/shows/[id]/edit.vue`

**Add Fields:**
- Venue selector
- Ticket price (if different from price zones)
- Ticket sale dates
- Generate seats button

**API Endpoints:**
- `POST /api/shows/[id]/generate-seats` - Generate show_seats from venue
- `GET /api/shows/[id]/seat-availability` - Get seat statistics

**Composables:**
```typescript
// composables/useShowSeats.ts
export function useShowSeats() {
  const generateSeats = async (showId: string) => {
    return await $fetch(`/api/shows/${showId}/generate-seats`, {
      method: 'POST'
    })
  }

  const getSeatAvailability = async (showId: string) => {
    return await $fetch(`/api/shows/${showId}/seat-availability`)
  }

  return { generateSeats, getSeatAvailability }
}
```

---

## Phase 4: Public Ticket Purchase Flow (Week 6-7)

**Goal:** Build customer-facing seat selection and checkout

### Week 6: Seat Selection UI

**Public Pages:**
1. `/pages/public/recitals/[seriesId]/tickets.vue` - Show selection
2. `/pages/public/recitals/shows/[showId]/seats.vue` - Seat selection

**Update Existing Components:**
- Connect `/components/seating/SeatingChart.vue` to backend
- Connect `/components/ticket/ReservationTimer.vue` to API

**Composables:**
```typescript
// composables/useSeatSelection.ts
export function useSeatSelection() {
  const selectedSeats = ref([])
  const reservationTimer = ref(null)

  const selectSeat = async (seat: Seat) => { /* ... */ }
  const reserveSeats = async (seatIds: string[]) => {
    return await $fetch('/api/seat-reservations/reserve', {
      method: 'POST',
      body: {
        showId: /* ... */,
        seatIds,
        sessionId: /* ... */
      }
    })
  }

  const releaseSeats = async () => { /* ... */ }

  return {
    selectedSeats,
    selectSeat,
    reserveSeats,
    releaseSeats,
    reservationTimer
  }
}
```

**API Endpoints:**
- `GET /api/shows/[id]/available-seats` - Get available seats
- `POST /api/seat-reservations/reserve` - Reserve seats
- `POST /api/seat-reservations/release` - Release reservation
- `GET /api/seat-reservations/check` - Check reservation status

**Real-time Updates:**
- Supabase subscription to `show_seats` table
- Update UI when seats become available/unavailable

---

### Week 7: Checkout Flow

**Pages:**
1. `/pages/public/checkout/tickets/[showId].vue` - Ticket checkout
2. `/pages/public/checkout/tickets/confirmation/[orderId].vue` - Confirmation

**Composables:**
```typescript
// composables/useTicketCheckout.ts
export function useTicketCheckout() {
  const createOrder = async (orderData) => {
    return await $fetch('/api/ticket-orders/create', {
      method: 'POST',
      body: orderData
    })
  }

  const createPaymentIntent = async (orderId) => {
    return await $fetch('/api/ticket-orders/payment-intent', {
      method: 'POST',
      body: { orderId }
    })
  }

  const confirmPayment = async (orderId, paymentIntentId) => {
    return await $fetch('/api/ticket-orders/confirm', {
      method: 'POST',
      body: { orderId, paymentIntentId }
    })
  }

  return {
    createOrder,
    createPaymentIntent,
    confirmPayment
  }
}
```

**API Endpoints:**
- `POST /api/ticket-orders/create` - Create order (pending payment)
- `POST /api/ticket-orders/payment-intent` - Create Stripe payment intent
- `POST /api/ticket-orders/confirm` - Confirm payment and finalize order
- `GET /api/ticket-orders/[id]` - Get order details

**Integration:**
- Use existing Stripe service (`composables/useStripeService.ts`)
- Use existing email service for confirmations

---

## Phase 5: Ticket Generation & Delivery (Week 8)

**Goal:** Generate PDF tickets with QR codes and email to customers

### QR Code & PDF Generation

**Libraries:**
```bash
npm install qrcode
npm install @pdfme/generator  # or continue with jsPDF
```

**API Endpoints:**
- `POST /api/tickets/generate-pdf` - Generate ticket PDF
- `GET /api/tickets/[id]/download` - Download ticket PDF
- `POST /api/tickets/resend` - Resend tickets via email

**Email Templates:**
Create email template for ticket confirmation with:
- Order summary
- Show details
- Attached ticket PDFs
- Link to view/download tickets

**Server Utils:**
```typescript
// server/utils/ticketPdf.ts
export async function generateTicketPDF(ticket: Ticket) {
  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(ticket.qr_code)

  // Create PDF with ticket info + QR code
  // ...

  // Upload to Supabase Storage
  const pdfUrl = await uploadTicketPDF(pdfBlob, ticket.id)

  return pdfUrl
}
```

**Ticket Lookup:**
- `/pages/public/tickets/lookup.vue` - Look up tickets by email
- Shows all orders for an email
- Download ticket PDFs

---

## Phase 6: Admin Order Management (Week 9)

**Goal:** Build admin dashboard for managing ticket orders

### Admin Pages

**Pages:**
1. `/pages/admin/ticketing/dashboard.vue` - Sales overview
2. `/pages/admin/ticketing/orders/index.vue` - Order list
3. `/pages/admin/ticketing/orders/[id].vue` - Order details

**Dashboard Widgets:**
- Total tickets sold (by show)
- Revenue metrics
- Seat sales heat map
- Recent orders
- Upcoming shows

**Order Management:**
- Search/filter orders
- View order details
- Resend confirmation emails
- Issue refunds
- Mark as cancelled

**API Endpoints:**
- `GET /api/admin/ticketing/dashboard` - Dashboard stats
- `GET /api/admin/ticketing/orders` - List orders (with filters)
- `GET /api/admin/ticketing/orders/[id]` - Order details
- `POST /api/admin/ticketing/orders/[id]/resend` - Resend email
- `POST /api/admin/ticketing/orders/[id]/refund` - Issue refund
- `GET /api/admin/ticketing/reports/sales` - Sales report export

---

## Phase 7: Polish & Testing (Week 10)

**Goal:** Testing, bug fixes, and performance optimization

### Testing Checklist

**Database:**
- [ ] All migrations run cleanly
- [ ] RLS policies work correctly
- [ ] Indexes improve query performance
- [ ] Functions work as expected
- [ ] Cleanup job removes expired reservations

**Seat Map Builder:**
- [ ] Can create venues
- [ ] Can add sections, rows, seats
- [ ] Can assign price zones
- [ ] CSV import works
- [ ] Seat map saves correctly
- [ ] Can generate show_seats

**Public Ticket Purchase:**
- [ ] Can view available seats
- [ ] Can select seats
- [ ] Reservation timer works
- [ ] Cannot select sold/reserved seats
- [ ] Consecutive seat detection works
- [ ] Real-time updates work

**Checkout:**
- [ ] Order creation works
- [ ] Stripe payment processes
- [ ] Seats marked as sold
- [ ] Tickets generated
- [ ] Emails sent
- [ ] PDF downloads work

**Admin:**
- [ ] Dashboard shows accurate data
- [ ] Can view all orders
- [ ] Can resend emails
- [ ] Can issue refunds
- [ ] Reports export correctly

### Performance Optimization
- Database query optimization
- Image/asset optimization
- Lazy loading
- Caching strategies

### Security Audit
- RLS policy review
- API endpoint authorization
- Input validation
- SQL injection prevention
- XSS prevention

---

## Implementation Dependencies

**Infrastructure Ready:**
- ✅ Supabase database
- ✅ Stripe payment processing
- ✅ Mailgun email service
- ✅ Supabase Storage
- ✅ Authentication system

**Needs Setup:**
- QR code generation library
- PDF generation templates
- Scheduled job for reservation cleanup (cron or Supabase Edge Functions)

---

## Success Metrics

**Phase 1 Complete:**
- All database tables created
- All migrations run successfully
- RLS policies in place

**Phase 2 Complete:**
- Can create venues in admin
- Can build seat maps
- Can save seat maps to database

**Phase 3 Complete:**
- Shows linked to venues
- Can generate show_seats
- Seat availability tracking works

**Phase 4 Complete:**
- Public can view seat maps
- Can select and reserve seats
- Can complete checkout
- Payments process successfully

**Phase 5 Complete:**
- Tickets generated with QR codes
- PDFs created and stored
- Confirmation emails sent

**Phase 6 Complete:**
- Admin dashboard shows sales data
- Can manage orders
- Can issue refunds

**Phase 7 Complete:**
- All tests pass
- Performance is acceptable
- Security audit passed
- Ready for production

---

## Risk Mitigation

**Technical Risks:**
1. **Real-time seat availability** - Complex with multiple concurrent users
   - Mitigation: Database-level locking, optimistic concurrency

2. **PDF generation performance** - Could be slow for large orders
   - Mitigation: Background job processing, pre-generated templates

3. **Reservation cleanup** - Need reliable scheduled job
   - Mitigation: Supabase Edge Functions with cron trigger

**Business Risks:**
1. **Overselling seats** - Critical to prevent
   - Mitigation: Database constraints, transaction isolation

2. **Payment failures** - Need to handle gracefully
   - Mitigation: Proper error handling, webhook processing, retry logic

---

## Post-Launch Enhancements

**Priority 2 Features:**
- SSO integration with parent portal (Story 1.4.10)
- Waitlist for sold-out shows
- Group booking discounts
- Season ticket packages
- Mobile check-in app for QR scanning

**Analytics & Reporting:**
- Sales by time period
- Popular seat sections
- Revenue projections
- Conversion funnel analysis

---

## Development Resources

**Estimated Team:**
- 1 Full-stack developer (primary)
- 1 Database specialist (database design & optimization)
- 1 QA tester (testing phase)

**Tools & Libraries:**
- Nuxt 3
- Supabase (PostgreSQL + Realtime)
- Stripe
- QRCode library
- PDF generation library
- Chart.js (for admin dashboard)

---

**Next Steps:**
1. Review and approve this roadmap
2. Set up project tracking (GitHub Issues/Projects)
3. Begin Phase 1: Database Foundation
