-- Migration: Tuition & Billing System Extensions
-- Description: Adds tuition-specific tables that integrate with unified payment system
-- Date: 2025-11-16
-- Dependencies: Requires 20251116_006_unified_payment_system.sql

-- ============================================================================
-- 1. TUITION PLANS & PRICING
-- ============================================================================

-- Create enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tuition_plan_type') THEN
    CREATE TYPE tuition_plan_type AS ENUM ('per_class', 'monthly', 'semester', 'annual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_scope') THEN
    CREATE TYPE discount_scope AS ENUM ('multi_class', 'sibling', 'early_registration', 'scholarship', 'custom', 'coupon');
  END IF;
END $$;

-- Tuition Plans table
CREATE TABLE IF NOT EXISTS tuition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_type tuition_plan_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- Pricing structure
  base_price_in_cents INTEGER NOT NULL CHECK (base_price_in_cents >= 0),
  classes_per_week INTEGER,

  -- Additional fees
  registration_fee_in_cents INTEGER DEFAULT 0 CHECK (registration_fee_in_cents >= 0),
  costume_fee_in_cents INTEGER DEFAULT 0 CHECK (costume_fee_in_cents >= 0),
  recital_fee_in_cents INTEGER DEFAULT 0 CHECK (recital_fee_in_cents >= 0),

  -- Plan restrictions
  class_definition_id UUID REFERENCES class_definitions(id) ON DELETE CASCADE,
  class_level_id UUID REFERENCES class_levels(id) ON DELETE SET NULL,
  dance_style_id UUID REFERENCES dance_styles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tuition_plans_active ON tuition_plans(is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_tuition_plans_class ON tuition_plans(class_definition_id) WHERE class_definition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tuition_plans_level ON tuition_plans(class_level_id) WHERE class_level_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tuition_plans_style ON tuition_plans(dance_style_id) WHERE dance_style_id IS NOT NULL;

-- ============================================================================
-- 2. PRICING RULES (Discounts, Scholarships, Coupons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_scope discount_scope NOT NULL,

  -- Discount value
  discount_percentage DECIMAL(5, 2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount_in_cents INTEGER CHECK (discount_amount_in_cents >= 0),

  -- Application rules
  min_classes INTEGER DEFAULT 1,
  applies_to_class_number INTEGER, -- e.g., "10% off 2nd class"
  requires_sibling BOOLEAN DEFAULT false,
  early_registration_days INTEGER,

  -- Coupon code
  coupon_code VARCHAR(50) UNIQUE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,

  -- Validity
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraint: must have either percentage or amount
  CHECK (
    (discount_percentage IS NOT NULL AND discount_amount_in_cents IS NULL) OR
    (discount_percentage IS NULL AND discount_amount_in_cents IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_coupon ON pricing_rules(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_scope ON pricing_rules(discount_scope);

-- ============================================================================
-- 3. FAMILY DISCOUNTS & SCHOLARSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  pricing_rule_id UUID REFERENCES pricing_rules(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,

  -- Scholarship-specific fields
  is_scholarship BOOLEAN DEFAULT false,
  scholarship_amount_in_cents INTEGER CHECK (scholarship_amount_in_cents >= 0),
  scholarship_percentage DECIMAL(5, 2) CHECK (scholarship_percentage >= 0 AND scholarship_percentage <= 100),
  scholarship_notes TEXT,

  -- Approval tracking
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Validity
  is_active BOOLEAN DEFAULT true,
  valid_from DATE NOT NULL,
  valid_to DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_discounts_student ON family_discounts(student_id, is_active);
CREATE INDEX IF NOT EXISTS idx_family_discounts_enrollment ON family_discounts(enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_discounts_rule ON family_discounts(pricing_rule_id) WHERE pricing_rule_id IS NOT NULL;

-- ============================================================================
-- 4. TUITION INVOICES (extends existing fee tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,

  invoice_number VARCHAR(50) UNIQUE NOT NULL,

  -- Amounts
  tuition_amount_in_cents INTEGER NOT NULL CHECK (tuition_amount_in_cents >= 0),
  additional_fees_in_cents INTEGER DEFAULT 0 CHECK (additional_fees_in_cents >= 0),
  discount_amount_in_cents INTEGER DEFAULT 0 CHECK (discount_amount_in_cents >= 0),
  total_amount_in_cents INTEGER NOT NULL CHECK (total_amount_in_cents >= 0),

  -- Payment tracking (links to unified payment system)
  amount_paid_in_cents INTEGER DEFAULT 0 CHECK (amount_paid_in_cents >= 0),
  balance_in_cents INTEGER NOT NULL CHECK (balance_in_cents >= 0),

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_in_full_date DATE,

  -- Payment plan link
  payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,

  -- Metadata
  line_items JSONB, -- Detailed breakdown of charges
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_enrollment ON tuition_invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_guardian ON tuition_invoices(guardian_id) WHERE guardian_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_due_date ON tuition_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_number ON tuition_invoices(invoice_number);

-- ============================================================================
-- 5. LATE PAYMENT PENALTIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS late_payment_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_invoice_id UUID REFERENCES tuition_invoices(id) ON DELETE CASCADE,

  penalty_amount_in_cents INTEGER NOT NULL CHECK (penalty_amount_in_cents > 0),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  days_overdue INTEGER NOT NULL,

  penalty_percentage DECIMAL(5, 2),
  penalty_flat_fee_in_cents INTEGER,

  waived BOOLEAN DEFAULT false,
  waived_by UUID REFERENCES profiles(id),
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_late_penalties_invoice ON late_payment_penalties(tuition_invoice_id);

-- ============================================================================
-- 6. PAYMENT REMINDERS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_status') THEN
    CREATE TYPE reminder_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_invoice_id UUID REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  reminder_type VARCHAR(50) NOT NULL, -- 'upcoming', 'overdue', 'final_notice'
  days_overdue INTEGER DEFAULT 0,
  reminder_status reminder_status DEFAULT 'scheduled',

  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  email_subject VARCHAR(255),
  email_body TEXT,

  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(tuition_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_user ON payment_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled ON payment_reminders(reminder_status, scheduled_for);

-- ============================================================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update updated_at triggers
CREATE TRIGGER update_tuition_plans_updated_at
  BEFORE UPDATE ON tuition_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

CREATE TRIGGER update_family_discounts_updated_at
  BEFORE UPDATE ON family_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

CREATE TRIGGER update_tuition_invoices_updated_at
  BEFORE UPDATE ON tuition_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

-- Function to update invoice balance when payment is made
CREATE OR REPLACE FUNCTION update_tuition_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed payments
  IF NEW.payment_status = 'completed' AND NEW.order_type = 'tuition' THEN
    -- Find the tuition invoice and update balance
    UPDATE tuition_invoices
    SET
      amount_paid_in_cents = amount_paid_in_cents + NEW.amount_in_cents,
      balance_in_cents = total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents),
      status = CASE
        WHEN total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents) <= 0 THEN 'paid'
        WHEN amount_paid_in_cents + NEW.amount_in_cents > 0 THEN 'partial'
        ELSE status
      END,
      paid_in_full_date = CASE
        WHEN total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents) <= 0 THEN CURRENT_DATE
        ELSE paid_in_full_date
      END
    WHERE student_id = NEW.student_id
      AND status IN ('sent', 'partial', 'overdue')
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_tuition_invoice_on_payment_trigger ON payment_transactions;
CREATE TRIGGER update_tuition_invoice_on_payment_trigger
  AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_tuition_invoice_on_payment();

-- Function to auto-increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pricing_rule_id IS NOT NULL THEN
    UPDATE pricing_rules
    SET current_uses = current_uses + 1
    WHERE id = NEW.pricing_rule_id
      AND coupon_code IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_coupon_usage ON family_discounts;
CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON family_discounts
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_tuition_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
  year_part VARCHAR;
  sequence_part VARCHAR;
  max_sequence INTEGER;
BEGIN
  -- Get current year
  year_part := TO_CHAR(NOW(), 'YY');

  -- Get the maximum sequence number for the current year
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ ('^TU' || year_part || '-[0-9]{4}$')
      THEN CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_sequence
  FROM tuition_invoices
  WHERE invoice_number LIKE 'TU' || year_part || '-%';

  -- Increment and format
  sequence_part := LPAD((max_sequence + 1)::TEXT, 4, '0');

  -- Combine parts
  new_number := 'TU' || year_part || '-' || sequence_part;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE tuition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_payment_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Tuition Plans Policies
CREATE POLICY "Admin and staff can manage tuition plans"
  ON tuition_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Everyone can view active tuition plans"
  ON tuition_plans FOR SELECT
  USING (is_active = true);

-- Pricing Rules Policies
CREATE POLICY "Admin and staff can manage pricing rules"
  ON pricing_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Everyone can view active pricing rules"
  ON pricing_rules FOR SELECT
  USING (is_active = true);

-- Family Discounts Policies
CREATE POLICY "Admin and staff can manage family discounts"
  ON family_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their student discounts"
  ON family_discounts FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
    )
  );

-- Tuition Invoices Policies
CREATE POLICY "Staff can manage tuition invoices"
  ON tuition_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their invoices"
  ON tuition_invoices FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
    )
  );

-- Late Payment Penalties Policies
CREATE POLICY "Staff can manage penalties"
  ON late_payment_penalties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Payment Reminders Policies
CREATE POLICY "Staff can manage reminders"
  ON payment_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can view their reminders"
  ON payment_reminders FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 9. INITIAL DATA
-- ============================================================================

-- Insert default pricing rules
INSERT INTO pricing_rules (name, description, discount_type, discount_scope, discount_percentage, is_active)
VALUES
  ('Sibling Discount', '10% off for each additional sibling', 'percentage', 'sibling', 10.00, true),
  ('Multi-Class Discount', '10% off second class, 15% off third+ classes', 'percentage', 'multi_class', 10.00, true),
  ('Early Bird Special', '5% off for early registration (30 days before term)', 'percentage', 'early_registration', 5.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE tuition_plans IS 'Defines tuition pricing structures for class enrollments';
COMMENT ON TABLE pricing_rules IS 'Flexible discount rules for multi-class, sibling, early registration, and custom discounts';
COMMENT ON TABLE family_discounts IS 'Individual discount assignments including scholarships';
COMMENT ON TABLE tuition_invoices IS 'Tuition invoices for student enrollments, integrates with unified payment system';
COMMENT ON TABLE late_payment_penalties IS 'Late payment penalty tracking with waiver support';
COMMENT ON TABLE payment_reminders IS 'Automated payment reminder scheduling and tracking';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
