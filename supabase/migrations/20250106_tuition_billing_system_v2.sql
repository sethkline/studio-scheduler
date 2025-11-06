-- =====================================================
-- TUITION & BILLING SYSTEM MIGRATION (REVISED)
-- Integrates with existing ticket_orders infrastructure
-- =====================================================

-- =====================================================
-- 1. EXTEND EXISTING TABLES
-- =====================================================

-- Add order_type to ticket_orders to support both tickets and tuition
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE order_type AS ENUM ('ticket', 'tuition', 'merchandise', 'other');
  END IF;
END $$;

-- Extend ticket_orders table
ALTER TABLE ticket_orders
  ADD COLUMN IF NOT EXISTS order_type order_type DEFAULT 'ticket',
  ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create index for tuition orders
CREATE INDEX IF NOT EXISTS idx_ticket_orders_tuition ON ticket_orders(order_type, parent_user_id)
  WHERE order_type = 'tuition';

-- =====================================================
-- 2. TUITION PLANS & PRICING
-- =====================================================

-- Create types if they don't exist
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

-- Tuition Plans
CREATE TABLE IF NOT EXISTS tuition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type tuition_plan_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to DATE,

    -- Pricing structure
    base_price DECIMAL(10, 2) NOT NULL,
    classes_per_week INTEGER,

    -- Additional fees
    registration_fee DECIMAL(10, 2) DEFAULT 0,
    costume_fee DECIMAL(10, 2) DEFAULT 0,
    recital_fee DECIMAL(10, 2) DEFAULT 0,

    -- Plan restrictions
    class_definition_id UUID REFERENCES class_definitions(id) ON DELETE CASCADE,
    class_level_id UUID REFERENCES class_levels(id) ON DELETE SET NULL,
    dance_style_id UUID REFERENCES dance_styles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Pricing Rules (for flexible discounts)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type discount_type NOT NULL,
    discount_scope discount_scope NOT NULL,

    -- Discount value
    discount_percentage DECIMAL(5, 2),
    discount_amount DECIMAL(10, 2),

    -- Application rules
    min_classes INTEGER DEFAULT 1,
    applies_to_class_number INTEGER,
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
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Family-specific discounts and scholarships
CREATE TABLE IF NOT EXISTS family_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    pricing_rule_id UUID REFERENCES pricing_rules(id) ON DELETE CASCADE,

    -- Scholarship-specific fields
    is_scholarship BOOLEAN DEFAULT false,
    scholarship_amount DECIMAL(10, 2),
    scholarship_percentage DECIMAL(5, 2),
    scholarship_notes TEXT,

    -- Approval tracking
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Validity
    is_active BOOLEAN DEFAULT true,
    valid_from DATE NOT NULL,
    valid_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ORDER LINE ITEMS (for tuition invoices)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ticket_orders(id) ON DELETE CASCADE,

    -- Line item details
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price_in_cents INTEGER NOT NULL,
    amount_in_cents INTEGER NOT NULL,

    -- Optional references
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    tuition_plan_id UUID REFERENCES tuition_plans(id) ON DELETE SET NULL,

    -- Discounts applied to this line
    discount_amount_in_cents INTEGER DEFAULT 0,
    discount_description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. PAYMENT METHODS & AUTO-PAY
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe integration
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,

    -- Payment method details (from Stripe)
    payment_method_type VARCHAR(50) NOT NULL DEFAULT 'card',
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Auto-pay settings
    is_default BOOLEAN DEFAULT false,
    is_autopay_enabled BOOLEAN DEFAULT false,
    nickname VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-pay billing schedules
CREATE TABLE IF NOT EXISTS billing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- Stripe subscription
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),

    -- Schedule settings
    is_active BOOLEAN DEFAULT true,
    billing_day INTEGER NOT NULL DEFAULT 1,
    autopay_discount_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Next billing
    next_billing_date DATE,
    last_billing_date DATE,

    -- Failure handling
    retry_count INTEGER DEFAULT 0,
    last_failure_date TIMESTAMPTZ,
    last_failure_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. REFUNDS & CREDITS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_type') THEN
    CREATE TYPE refund_type AS ENUM ('full', 'partial', 'pro_rated', 'studio_credit');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ticket_orders(id) ON DELETE CASCADE,

    -- Refund details
    refund_amount_in_cents INTEGER NOT NULL,
    refund_type refund_type NOT NULL,
    refund_status refund_status DEFAULT 'pending',

    -- Stripe integration
    stripe_refund_id VARCHAR(255) UNIQUE,

    -- Reason and approval
    reason TEXT NOT NULL,
    internal_notes TEXT,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Processing
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Studio credit
    is_studio_credit BOOLEAN DEFAULT false,
    studio_credit_balance UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio credits
CREATE TABLE IF NOT EXISTS studio_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_credit_in_cents INTEGER NOT NULL DEFAULT 0,
    used_credit_in_cents INTEGER DEFAULT 0,
    available_credit_in_cents INTEGER GENERATED ALWAYS AS (total_credit_in_cents - used_credit_in_cents) STORED,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio credit transactions
CREATE TABLE IF NOT EXISTS studio_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_credit_id UUID REFERENCES studio_credits(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount_in_cents INTEGER NOT NULL,
    description TEXT,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    order_id UUID REFERENCES ticket_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. PAYMENT TRACKING
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_status') THEN
    CREATE TYPE reminder_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');
  END IF;
END $$;

-- Payment reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ticket_orders(id) ON DELETE CASCADE,
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    days_overdue INTEGER DEFAULT 0,
    reminder_status reminder_status DEFAULT 'scheduled',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    email_subject VARCHAR(255),
    email_body TEXT,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Late payment penalties
CREATE TABLE IF NOT EXISTS late_payment_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ticket_orders(id) ON DELETE CASCADE,
    penalty_amount_in_cents INTEGER NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    days_overdue INTEGER NOT NULL,
    penalty_percentage DECIMAL(5, 2),
    penalty_flat_fee_in_cents INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tuition_plans_active ON tuition_plans(is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_tuition_plans_class ON tuition_plans(class_definition_id) WHERE class_definition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_coupon ON pricing_rules(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_discounts_student ON family_discounts(student_id, is_active);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_parent ON payment_methods(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_parent ON billing_schedules(parent_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_next_billing ON billing_schedules(next_billing_date, is_active);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_order ON payment_reminders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled ON payment_reminders(reminder_status, scheduled_for);

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

ALTER TABLE tuition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_payment_penalties ENABLE ROW LEVEL SECURITY;

-- Tuition Plans
CREATE POLICY IF NOT EXISTS "Admin and staff can manage tuition plans"
    ON tuition_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Everyone can view active tuition plans"
    ON tuition_plans FOR SELECT
    USING (is_active = true);

-- Pricing Rules
CREATE POLICY IF NOT EXISTS "Admin and staff can manage pricing rules"
    ON pricing_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- Family Discounts
CREATE POLICY IF NOT EXISTS "Admin and staff can manage family discounts"
    ON family_discounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Parents can view their student discounts"
    ON family_discounts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = family_discounts.student_id
            AND students.parent_id = auth.uid()
        )
    );

-- Order Line Items
CREATE POLICY IF NOT EXISTS "Admin and staff can manage line items"
    ON order_line_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Parents can view their order line items"
    ON order_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ticket_orders
            WHERE ticket_orders.id = order_line_items.order_id
            AND (ticket_orders.parent_user_id = auth.uid() OR ticket_orders.email IN (
                SELECT email FROM profiles WHERE user_id = auth.uid()
            ))
        )
    );

-- Payment Methods
CREATE POLICY IF NOT EXISTS "Admin and staff can view all payment methods"
    ON payment_methods FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Parents can manage their own payment methods"
    ON payment_methods FOR ALL
    USING (parent_user_id = auth.uid());

-- Billing Schedules
CREATE POLICY IF NOT EXISTS "Admin and staff can view all billing schedules"
    ON billing_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Parents can manage their own billing schedules"
    ON billing_schedules FOR ALL
    USING (parent_user_id = auth.uid());

-- Refunds
CREATE POLICY IF NOT EXISTS "Admin and staff can manage refunds"
    ON refunds FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- Studio Credits
CREATE POLICY IF NOT EXISTS "Admin and staff can manage studio credits"
    ON studio_credits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY IF NOT EXISTS "Parents can view their own studio credits"
    ON studio_credits FOR SELECT
    USING (parent_user_id = auth.uid());

-- Payment Reminders
CREATE POLICY IF NOT EXISTS "Admin and staff can manage payment reminders"
    ON payment_reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- =====================================================
-- 9. TRIGGERS & FUNCTIONS
-- =====================================================

-- Update order totals when line items change
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ticket_orders
    SET
        total_amount_in_cents = (
            SELECT COALESCE(SUM(amount_in_cents), 0)
            FROM order_line_items
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_totals ON order_line_items;
CREATE TRIGGER trigger_update_order_totals
AFTER INSERT OR UPDATE OR DELETE ON order_line_items
FOR EACH ROW EXECUTE FUNCTION update_order_totals();

-- Auto-increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing_rules
    SET current_uses = current_uses + 1
    WHERE id = NEW.pricing_rule_id
      AND coupon_code IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_coupon_usage ON family_discounts;
CREATE TRIGGER trigger_increment_coupon_usage
AFTER INSERT ON family_discounts
FOR EACH ROW EXECUTE FUNCTION increment_coupon_usage();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tuition_plans_updated_at ON tuition_plans;
CREATE TRIGGER trigger_tuition_plans_updated_at
BEFORE UPDATE ON tuition_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER trigger_pricing_rules_updated_at
BEFORE UPDATE ON pricing_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER trigger_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_billing_schedules_updated_at ON billing_schedules;
CREATE TRIGGER trigger_billing_schedules_updated_at
BEFORE UPDATE ON billing_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. INITIAL DATA
-- =====================================================

-- Insert default pricing rules
INSERT INTO pricing_rules (name, description, discount_type, discount_scope, discount_percentage, is_active)
VALUES
    ('Sibling Discount', '10% off for each additional sibling', 'percentage', 'sibling', 10.00, true),
    ('Multi-Class Discount', '10% off second class, 15% off third+ classes', 'percentage', 'multi_class', 10.00, true),
    ('Early Bird Special', '5% off for early registration (30 days before term)', 'percentage', 'early_registration', 5.00, true)
ON CONFLICT DO NOTHING;

-- Update existing profiles table to include stripe_customer_id if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_customer_id VARCHAR(255);
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
