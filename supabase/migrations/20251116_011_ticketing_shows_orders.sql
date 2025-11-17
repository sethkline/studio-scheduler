-- Migration: Ticketing Show Seats & Orders
-- Created: 2025-11-16
-- Description: Links venues to shows, creates show-specific seat inventory, orders, and tickets

-- ============================================
-- LINK VENUES TO RECITAL SHOWS
-- ============================================

-- Add venue_id to recital_shows table
ALTER TABLE recital_shows
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

CREATE INDEX idx_recital_shows_venue ON recital_shows(venue_id);

COMMENT ON COLUMN recital_shows.venue_id IS 'Venue where this show will be performed';

-- ============================================
-- SHOW SEATS TABLE (Per-show seat availability)
-- ============================================
CREATE TABLE show_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES recital_shows(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,

  -- Seat status
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'sold', 'held')),

  -- Price snapshot from price_zone at show creation time
  price_in_cents INTEGER NOT NULL,

  -- Reservation fields
  reserved_by TEXT, -- session UUID for tracking reservations
  reserved_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT show_seats_unique_per_show UNIQUE(show_id, seat_id)
);

COMMENT ON TABLE show_seats IS 'Per-show seat inventory tracking availability and reservations';
COMMENT ON COLUMN show_seats.status IS 'Seat status: available, reserved (temp hold), sold, held (admin hold)';
COMMENT ON COLUMN show_seats.price_in_cents IS 'Price snapshot from price zone when show seats were generated';
COMMENT ON COLUMN show_seats.reserved_by IS 'Session UUID for temporary seat reservations during checkout';
COMMENT ON COLUMN show_seats.reserved_until IS 'Expiration time for temporary reservations';

-- ============================================
-- TICKET ORDERS TABLE
-- ============================================
CREATE TABLE ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES recital_shows(id),

  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Payment information
  stripe_payment_intent_id TEXT,
  total_amount_in_cents INTEGER NOT NULL,

  -- Order status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

  -- Metadata
  order_number TEXT UNIQUE NOT NULL, -- human-readable order number (e.g., ORD-20251116-ABC123)
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ticket_orders IS 'Customer ticket orders with payment and status tracking';
COMMENT ON COLUMN ticket_orders.order_number IS 'Human-readable unique order identifier';
COMMENT ON COLUMN ticket_orders.status IS 'Order status: pending (awaiting payment), paid, failed, refunded, cancelled';

-- ============================================
-- TICKETS TABLE (Individual seat tickets)
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  show_seat_id UUID NOT NULL REFERENCES show_seats(id),

  -- Ticket identifiers
  qr_code TEXT UNIQUE NOT NULL, -- unique token for validation/scanning
  ticket_number TEXT UNIQUE NOT NULL, -- human-readable ticket number

  -- PDF generation
  pdf_url TEXT, -- Supabase Storage URL to generated PDF
  pdf_generated_at TIMESTAMPTZ,

  -- Validation/scanning
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT tickets_unique_per_order UNIQUE(ticket_order_id, show_seat_id)
);

COMMENT ON TABLE tickets IS 'Individual tickets with QR codes for entry validation';
COMMENT ON COLUMN tickets.qr_code IS 'Unique QR code token for ticket scanning/validation';
COMMENT ON COLUMN tickets.ticket_number IS 'Human-readable ticket identifier';
COMMENT ON COLUMN tickets.scanned_at IS 'Timestamp when ticket was scanned at venue entrance';
COMMENT ON COLUMN tickets.scanned_by IS 'Staff member who scanned the ticket';

-- ============================================
-- ORDER ITEMS TABLE (For upsells and line items)
-- ============================================
CREATE TABLE ticket_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,

  -- Item details
  item_type TEXT NOT NULL
    CHECK (item_type IN ('ticket', 'digital_download', 'dvd', 'merchandise')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_in_cents INTEGER NOT NULL,

  -- References (depending on item type)
  ticket_id UUID REFERENCES tickets(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT price_non_negative CHECK (price_in_cents >= 0)
);

COMMENT ON TABLE ticket_order_items IS 'Line items for orders including tickets and upsell products';
COMMENT ON COLUMN ticket_order_items.item_type IS 'Type of item: ticket, digital_download, dvd, merchandise';

-- ============================================
-- INDEXES
-- ============================================

-- Show seats indexes
CREATE INDEX idx_show_seats_show ON show_seats(show_id);
CREATE INDEX idx_show_seats_seat ON show_seats(seat_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
CREATE INDEX idx_show_seats_reservation ON show_seats(reserved_until)
  WHERE status = 'reserved';

-- Ticket orders indexes
CREATE INDEX idx_ticket_orders_show ON ticket_orders(show_id);
CREATE INDEX idx_ticket_orders_email ON ticket_orders(customer_email);
CREATE INDEX idx_ticket_orders_status ON ticket_orders(status);
CREATE INDEX idx_ticket_orders_created ON ticket_orders(created_at DESC);

-- Tickets indexes
CREATE INDEX idx_tickets_order ON tickets(ticket_order_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_show_seat ON tickets(show_seat_id);

-- Order items indexes
CREATE INDEX idx_ticket_order_items_order ON ticket_order_items(ticket_order_id);
CREATE INDEX idx_ticket_order_items_ticket ON ticket_order_items(ticket_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_show_seats_updated_at
  BEFORE UPDATE ON show_seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_orders_updated_at
  BEFORE UPDATE ON ticket_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE show_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_order_items ENABLE ROW LEVEL SECURITY;

-- Show seats policies
CREATE POLICY "Anyone can view show seats"
  ON show_seats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and staff can insert show seats"
  ON show_seats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update show seats"
  ON show_seats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can delete show seats"
  ON show_seats FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Ticket orders policies
CREATE POLICY "Customers can view their own orders"
  ON ticket_orders FOR SELECT
  TO authenticated
  USING (
    customer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can view all orders"
  ON ticket_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can insert orders"
  ON ticket_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update orders"
  ON ticket_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can delete orders"
  ON ticket_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Tickets policies
CREATE POLICY "Customers can view their own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = tickets.ticket_order_id
      AND ticket_orders.customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can insert tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Order items policies
CREATE POLICY "Customers can view their own order items"
  ON ticket_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = ticket_order_items.ticket_order_id
      AND ticket_orders.customer_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can insert order items"
  ON ticket_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can update order items"
  ON ticket_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can delete order items"
  ON ticket_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );
