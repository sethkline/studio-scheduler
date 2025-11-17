-- Migration: Add session tracking to ticket orders for public purchases
-- Created: 2025-11-17
-- Description: Adds session_id and user_id to ticket_orders to support both authenticated and anonymous purchases

-- Add session tracking fields to ticket_orders
ALTER TABLE ticket_orders
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_ticket_orders_session ON ticket_orders(session_id);
CREATE INDEX idx_ticket_orders_user ON ticket_orders(user_id);

COMMENT ON COLUMN ticket_orders.session_id IS 'Session ID for anonymous purchases (from reservation_session cookie)';
COMMENT ON COLUMN ticket_orders.user_id IS 'User ID for authenticated purchases';

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admin and staff can insert orders" ON ticket_orders;

-- Create new INSERT policy that allows public purchases
CREATE POLICY "Anyone can insert their own orders"
  ON ticket_orders FOR INSERT
  TO public
  WITH CHECK (
    -- Either authenticated user matches
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    -- Or it's an anonymous purchase (session_id will be validated by application)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Update SELECT policy to include session-based access
DROP POLICY IF EXISTS "Customers can view their own orders" ON ticket_orders;
CREATE POLICY "Customers can view their own orders"
  ON ticket_orders FOR SELECT
  TO public
  USING (
    -- Match by user_id for authenticated users
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    -- Match by email for authenticated users
    OR (auth.uid() IS NOT NULL AND customer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
    -- Admin/staff can see all
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Update tickets policies to support session-based orders
DROP POLICY IF EXISTS "Admin and staff can insert tickets" ON tickets;
CREATE POLICY "Anyone can insert tickets for their own orders"
  ON tickets FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = tickets.ticket_order_id
      AND (
        (auth.uid() IS NOT NULL AND ticket_orders.user_id = auth.uid())
        OR (auth.uid() IS NULL AND ticket_orders.session_id IS NOT NULL)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.user_role IN ('admin', 'staff')
        )
      )
    )
  );

-- Update order items policies similarly
DROP POLICY IF EXISTS "Admin and staff can insert order items" ON ticket_order_items;
CREATE POLICY "Anyone can insert order items for their own orders"
  ON ticket_order_items FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = ticket_order_items.ticket_order_id
      AND (
        (auth.uid() IS NOT NULL AND ticket_orders.user_id = auth.uid())
        OR (auth.uid() IS NULL AND ticket_orders.session_id IS NOT NULL)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.user_role IN ('admin', 'staff')
        )
      )
    )
  );
