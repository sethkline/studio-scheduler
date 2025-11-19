-- Migration: Add Foreign Key Constraint from Payment Transactions to Ticket Orders
-- Created: 2025-11-16
-- Description: Adds FK constraint that was missing when unified payment system was created
--              (ticket_orders table didn't exist at that time)

-- ============================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================

-- The ticket_order_id column was already added in the unified payment system migration
-- but the FK constraint couldn't be created because ticket_orders table didn't exist yet.
-- Now that ticket_orders exists, we can add the constraint.

-- First, drop the column if it exists (to handle re-running this migration)
-- and recreate it with the proper FK constraint
ALTER TABLE payment_transactions
  DROP CONSTRAINT IF EXISTS fk_payment_ticket_order;

-- Add the FK constraint
-- Note: The column already exists from the unified payment system migration
-- We're just adding the constraint now that the table exists
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_payment_ticket_order'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE payment_transactions
      ADD CONSTRAINT fk_payment_ticket_order
      FOREIGN KEY (ticket_order_id)
      REFERENCES ticket_orders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure index exists for the FK
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ticket_order
  ON payment_transactions(ticket_order_id)
  WHERE ticket_order_id IS NOT NULL;

COMMENT ON CONSTRAINT fk_payment_ticket_order ON payment_transactions
  IS 'Links payment transactions to ticket orders for ticketing purchases';
