-- Migration: Unified Payment System
-- Description: Extends Tier 1 payment infrastructure to support all payment types (recital, tuition, merchandise)
-- Date: 2025-11-16
-- Dependencies: Requires tier1_recital_fees migration

-- ============================================================================
-- PHASE 1: RENAME AND EXTEND EXISTING TABLES
-- ============================================================================

-- 1.1 Rename recital_payment_transactions to payment_transactions
ALTER TABLE recital_payment_transactions RENAME TO payment_transactions;

-- 1.2 Add universal payment columns
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'recital_fee'
    CHECK (order_type IN ('recital_fee', 'tuition', 'ticket', 'merchandise', 'other')),
  ADD COLUMN IF NOT EXISTS ticket_order_id UUID REFERENCES ticket_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchandise_order_id UUID REFERENCES merchandise_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records to have correct order_type
UPDATE payment_transactions
SET order_type = 'recital_fee'
WHERE order_type IS NULL;

-- Create index on order_type
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_type ON payment_transactions(order_type);

-- Update constraint on student_fee_id to be nullable (not all payments are recital fees)
ALTER TABLE payment_transactions ALTER COLUMN student_fee_id DROP NOT NULL;

-- Add constraint: must have at least one reference
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transaction_reference_check
  CHECK (
    student_fee_id IS NOT NULL OR
    ticket_order_id IS NOT NULL OR
    merchandise_order_id IS NOT NULL
  );

-- ============================================================================
-- 1.3 Rename recital_payment_plans to payment_plans
-- ============================================================================

ALTER TABLE recital_payment_plans RENAME TO payment_plans;

-- Add plan_type column
ALTER TABLE payment_plans
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'recital'
    CHECK (plan_type IN ('recital', 'tuition', 'general'));

-- Make recital_id nullable (not all plans are recital-specific)
ALTER TABLE payment_plans ALTER COLUMN recital_id DROP NOT NULL;

-- Add enrollment_id for tuition plans
ALTER TABLE payment_plans
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE;

-- Add constraint: must have either recital_id OR enrollment_id
ALTER TABLE payment_plans
  ADD CONSTRAINT payment_plan_reference_check
  CHECK (
    (recital_id IS NOT NULL AND enrollment_id IS NULL AND plan_type = 'recital') OR
    (recital_id IS NULL AND enrollment_id IS NOT NULL AND plan_type = 'tuition') OR
    (recital_id IS NULL AND enrollment_id IS NULL AND plan_type = 'general')
  );

-- Update existing records
UPDATE payment_plans
SET plan_type = 'recital'
WHERE plan_type IS NULL;

-- Create index on plan_type and enrollment_id
CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_type ON payment_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_payment_plans_enrollment ON payment_plans(enrollment_id);

-- ============================================================================
-- PHASE 2: CREATE NEW SUPPORTING TABLES
-- ============================================================================

-- 2.1 Create payment_methods table (Stripe integration)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,

  -- Payment method details (from Stripe)
  payment_method_type VARCHAR(50) NOT NULL DEFAULT 'card',
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_autopay_enabled BOOLEAN DEFAULT false,
  nickname VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON payment_methods(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- ============================================================================
-- 2.2 Extend payment_plan_installments for auto-pay
-- ============================================================================

ALTER TABLE payment_plan_installments
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_pay_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_pay_failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Index for auto-pay processing
CREATE INDEX IF NOT EXISTS idx_installments_autopay ON payment_plan_installments(due_date, auto_pay_enabled)
  WHERE auto_pay_enabled = true AND status = 'scheduled';

-- ============================================================================
-- 2.3 Create refunds table (universal for all payment types)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,

  -- Refund details
  refund_amount_in_cents INTEGER NOT NULL CHECK (refund_amount_in_cents > 0),
  refund_type VARCHAR(50) NOT NULL CHECK (refund_type IN ('full', 'partial', 'pro_rated', 'studio_credit')),
  refund_status VARCHAR(50) DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),

  -- Stripe integration
  stripe_refund_id VARCHAR(255) UNIQUE,

  -- Approval workflow
  reason TEXT NOT NULL,
  internal_notes TEXT,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Processing
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Studio credit
  is_studio_credit BOOLEAN DEFAULT false,
  studio_credit_id UUID REFERENCES studio_credits(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refunds_payment_transaction ON refunds(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(refund_status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_by ON refunds(requested_by);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

-- ============================================================================
-- 2.4 Create studio_credits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS studio_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  total_credit_in_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_credit_in_cents >= 0),
  used_credit_in_cents INTEGER DEFAULT 0 CHECK (used_credit_in_cents >= 0),
  available_credit_in_cents INTEGER GENERATED ALWAYS AS (total_credit_in_cents - used_credit_in_cents) STORED,

  expires_at DATE,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id) -- One credit account per user
);

-- Index
CREATE INDEX IF NOT EXISTS idx_studio_credits_user ON studio_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_credits_active ON studio_credits(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 2.5 Create studio_credit_transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS studio_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_credit_id UUID NOT NULL REFERENCES studio_credits(id) ON DELETE CASCADE,

  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit_added', 'credit_used', 'credit_expired', 'credit_adjusted')),
  amount_in_cents INTEGER NOT NULL,
  description TEXT,

  -- References
  refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,

  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_credit ON studio_credit_transactions(studio_credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_refund ON studio_credit_transactions(refund_id) WHERE refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment ON studio_credit_transactions(payment_transaction_id) WHERE payment_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON studio_credit_transactions(created_at DESC);

-- ============================================================================
-- PHASE 3: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- 3.1 Update updated_at triggers for new tables
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

CREATE TRIGGER update_studio_credits_updated_at
  BEFORE UPDATE ON studio_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

-- 3.2 Function to automatically create studio credit from refund
CREATE OR REPLACE FUNCTION create_studio_credit_from_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed refunds that are marked as studio credit
  IF NEW.refund_status = 'completed' AND NEW.is_studio_credit = true AND OLD.refund_status != 'completed' THEN
    -- Get payment transaction to find user_id
    DECLARE
      v_user_id UUID;
      v_student_id UUID;
      v_credit_id UUID;
    BEGIN
      -- Get student_id from payment transaction
      SELECT student_id INTO v_student_id
      FROM payment_transactions
      WHERE id = NEW.payment_transaction_id;

      -- Get user_id from student's guardian
      SELECT g.user_id INTO v_user_id
      FROM students s
      JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE s.id = v_student_id
      LIMIT 1;

      IF v_user_id IS NOT NULL THEN
        -- Get or create studio credit account
        INSERT INTO studio_credits (user_id, total_credit_in_cents)
        VALUES (v_user_id, 0)
        ON CONFLICT (user_id)
        DO NOTHING
        RETURNING id INTO v_credit_id;

        -- Get credit_id if it already existed
        IF v_credit_id IS NULL THEN
          SELECT id INTO v_credit_id
          FROM studio_credits
          WHERE user_id = v_user_id;
        END IF;

        -- Add credit transaction
        INSERT INTO studio_credit_transactions (
          studio_credit_id,
          transaction_type,
          amount_in_cents,
          description,
          refund_id
        ) VALUES (
          v_credit_id,
          'credit_added',
          NEW.refund_amount_in_cents,
          'Refund converted to studio credit: ' || NEW.reason,
          NEW.id
        );

        -- Update studio credit balance
        UPDATE studio_credits
        SET total_credit_in_cents = total_credit_in_cents + NEW.refund_amount_in_cents
        WHERE id = v_credit_id;

        -- Link refund to credit account
        NEW.studio_credit_id = v_credit_id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_studio_credit_from_refund_trigger ON refunds;
CREATE TRIGGER create_studio_credit_from_refund_trigger
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION create_studio_credit_from_refund();

-- ============================================================================
-- PHASE 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Payment Methods Policies
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own payment methods"
  ON payment_methods FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all payment methods"
  ON payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Refunds Policies
CREATE POLICY "Staff can manage refunds"
  ON refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can view their refunds"
  ON refunds FOR SELECT
  USING (
    requested_by = auth.uid() OR
    payment_transaction_id IN (
      SELECT pt.id FROM payment_transactions pt
      JOIN students s ON pt.student_id = s.id
      JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
    )
  );

-- Studio Credits Policies
CREATE POLICY "Users can view their own credits"
  ON studio_credits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all credits"
  ON studio_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can manage credits"
  ON studio_credits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Studio Credit Transactions Policies
CREATE POLICY "Users can view their own credit transactions"
  ON studio_credit_transactions FOR SELECT
  USING (
    studio_credit_id IN (
      SELECT id FROM studio_credits WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all credit transactions"
  ON studio_credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "System can insert credit transactions"
  ON studio_credit_transactions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- PHASE 5: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON payment_methods TO authenticated;
GRANT SELECT ON refunds TO authenticated;
GRANT INSERT ON refunds TO authenticated;
GRANT SELECT ON studio_credits TO authenticated;
GRANT SELECT ON studio_credit_transactions TO authenticated;

-- ============================================================================
-- PHASE 6: COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_transactions IS 'Universal payment transaction table for all payment types (recital fees, tuition, tickets, merchandise)';
COMMENT ON TABLE payment_plans IS 'Universal payment plan table supporting recital fees, tuition, and other payment plans';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for auto-pay and quick checkout';
COMMENT ON TABLE refunds IS 'Refund tracking for all payment types with approval workflow';
COMMENT ON TABLE studio_credits IS 'Studio credit balance tracking per user';
COMMENT ON TABLE studio_credit_transactions IS 'Detailed transaction history for studio credits';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
