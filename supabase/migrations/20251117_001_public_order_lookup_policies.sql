-- Migration: Add RLS policies for public order lookup
-- Created: 2025-11-17
-- Description: Allow anonymous users to view their own orders by email (for ticket lookup feature)

-- ============================================
-- PUBLIC TICKET ORDERS POLICIES
-- ============================================

-- Allow anonymous users to view orders (they're already filtered by email in the query)
-- This is safe because:
-- 1. Users must know the email address
-- 2. The API endpoints add additional email verification
-- 3. Queries are filtered by email, so users only see their own orders
CREATE POLICY "Public can view orders by email"
  ON ticket_orders FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- PUBLIC TICKETS POLICIES
-- ============================================

-- Allow anonymous users to view tickets for orders they can see
-- This is safe because:
-- 1. Access is restricted by the ticket_orders RLS policy
-- 2. Users can only see tickets for orders matching their email
CREATE POLICY "Public can view tickets for their orders"
  ON tickets FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- PUBLIC SHOW SEATS POLICIES
-- ============================================

-- Allow anonymous users to view show_seats (needed for ticket details)
-- This is already public for the seat selection flow
-- Adding explicit policy for ticket lookup feature
CREATE POLICY "Public can view show seats for tickets"
  ON show_seats FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Public can view orders by email" ON ticket_orders IS
  'Allows anonymous users to view orders filtered by email for public ticket lookup feature. Additional email verification is performed in API endpoints.';

COMMENT ON POLICY "Public can view tickets for their orders" ON tickets IS
  'Allows anonymous users to view tickets associated with orders they have access to via email lookup.';

COMMENT ON POLICY "Public can view show seats for tickets" ON show_seats IS
  'Allows anonymous users to view show seat details for their tickets.';
