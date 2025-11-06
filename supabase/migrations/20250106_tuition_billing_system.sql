-- =====================================================
-- TUITION & BILLING SYSTEM MIGRATION
-- Story 3.2: Comprehensive Financial Management
-- =====================================================

-- =====================================================
-- 1. TUITION PLANS & PRICING
-- =====================================================

-- Tuition plan types (per-class, monthly, semester, annual)
CREATE TYPE tuition_plan_type AS ENUM ('per_class', 'monthly', 'semester', 'annual');

-- Discount types
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Discount application scope
CREATE TYPE discount_scope AS ENUM ('multi_class', 'sibling', 'early_registration', 'scholarship', 'custom', 'coupon');

-- Tuition Plans
CREATE TABLE tuition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type tuition_plan_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to DATE,

    -- Pricing structure
    base_price DECIMAL(10, 2) NOT NULL,

    -- Per-class pricing
    classes_per_week INTEGER,

    -- Registration fees
    registration_fee DECIMAL(10, 2) DEFAULT 0,

    -- Additional fees
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
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type discount_type NOT NULL,
    discount_scope discount_scope NOT NULL,

    -- Discount value
    discount_percentage DECIMAL(5, 2), -- e.g., 10.00 for 10%
    discount_amount DECIMAL(10, 2),    -- e.g., 50.00 for $50 off

    -- Application rules
    min_classes INTEGER DEFAULT 1,
    applies_to_class_number INTEGER, -- e.g., 2 for "10% off 2nd class"
    requires_sibling BOOLEAN DEFAULT false,

    -- Early registration
    early_registration_days INTEGER, -- days before term starts

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
CREATE TABLE family_discounts (
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
-- 2. INVOICING
-- =====================================================

-- Invoice status
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'partial_paid', 'overdue', 'cancelled', 'refunded');

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,

    -- Parent/Family relationship
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,

    -- Invoice details
    status invoice_status DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(10, 2) DEFAULT 0,
    tax_total DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    amount_due DECIMAL(10, 2) NOT NULL,

    -- Late fees
    late_fee_applied DECIMAL(10, 2) DEFAULT 0,
    late_fee_applied_at TIMESTAMPTZ,

    -- Notes and metadata
    notes TEXT,
    internal_notes TEXT,

    -- PDF generation
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,

    -- Tracking
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

    -- Line item details
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,

    -- Optional references
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    tuition_plan_id UUID REFERENCES tuition_plans(id) ON DELETE SET NULL,

    -- Discounts applied to this line
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PAYMENTS
-- =====================================================

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled');

-- Payment method type
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_transfer', 'cash', 'check', 'other');

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent/User relationship
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_method_type payment_method_type NOT NULL,

    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),

    -- Payment metadata
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmation_number VARCHAR(100) UNIQUE,

    -- Allocation (for partial payments or multiple invoices)
    allocated_to_invoice BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Receipt
    receipt_url TEXT,
    receipt_email_sent BOOLEAN DEFAULT false,
    receipt_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment allocations (for splitting payments across multiple invoices)
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. AUTO-PAY & PAYMENT METHODS
-- =====================================================

-- Payment methods (stored via Stripe)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe integration
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,

    -- Payment method details (from Stripe)
    payment_method_type payment_method_type NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Auto-pay settings
    is_default BOOLEAN DEFAULT false,
    is_autopay_enabled BOOLEAN DEFAULT false,

    -- Metadata
    nickname VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-pay subscriptions
CREATE TABLE billing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- Schedule settings
    is_active BOOLEAN DEFAULT true,
    billing_day INTEGER NOT NULL DEFAULT 1, -- day of month (1-28)

    -- Stripe subscription (if using Stripe Billing)
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),

    -- Auto-pay discount
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
-- 5. REFUNDS
-- =====================================================

-- Refund status
CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled');

-- Refund type
CREATE TYPE refund_type AS ENUM ('full', 'partial', 'pro_rated', 'studio_credit');

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Refund details
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_type refund_type NOT NULL,
    refund_status refund_status DEFAULT 'pending',

    -- Stripe integration
    stripe_refund_id VARCHAR(255) UNIQUE,

    -- Reason and approval
    reason TEXT NOT NULL,
    internal_notes TEXT,

    -- Approval workflow
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Processing
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Studio credit (instead of cash refund)
    is_studio_credit BOOLEAN DEFAULT false,
    studio_credit_balance UUID REFERENCES studio_credits(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio credits (alternative to cash refunds)
CREATE TABLE studio_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Credit balance
    total_credit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    used_credit DECIMAL(10, 2) DEFAULT 0,
    available_credit DECIMAL(10, 2) GENERATED ALWAYS AS (total_credit - used_credit) STORED,

    -- Expiration
    expires_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio credit transactions
CREATE TABLE studio_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_credit_id UUID REFERENCES studio_credits(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'expiration'
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,

    -- References
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. LATE PAYMENT TRACKING
-- =====================================================

-- Payment reminder status
CREATE TYPE reminder_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');

-- Payment reminders
CREATE TABLE payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Reminder details
    reminder_type VARCHAR(50) NOT NULL, -- 'upcoming', 'due', 'overdue_3', 'overdue_7', 'overdue_14', 'final_notice'
    days_overdue INTEGER DEFAULT 0,

    -- Status
    reminder_status reminder_status DEFAULT 'scheduled',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,

    -- Email details
    email_subject VARCHAR(255),
    email_body TEXT,

    -- Tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Late payment penalties
CREATE TABLE late_payment_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

    -- Penalty details
    penalty_amount DECIMAL(10, 2) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    days_overdue INTEGER NOT NULL,

    -- Configuration snapshot
    penalty_percentage DECIMAL(5, 2),
    penalty_flat_fee DECIMAL(10, 2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. PAYMENT PLANS
-- =====================================================

-- Payment plan status
CREATE TYPE payment_plan_status AS ENUM ('active', 'completed', 'defaulted', 'cancelled');

-- Payment plans (for large balances)
CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

    -- Plan details
    total_amount DECIMAL(10, 2) NOT NULL,
    down_payment DECIMAL(10, 2) DEFAULT 0,
    remaining_balance DECIMAL(10, 2) NOT NULL,

    -- Installment schedule
    num_installments INTEGER NOT NULL,
    installment_amount DECIMAL(10, 2) NOT NULL,
    installment_frequency VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly'

    -- Status
    payment_plan_status payment_plan_status DEFAULT 'active',

    -- Dates
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,

    -- Tracking
    payments_made INTEGER DEFAULT 0,
    total_paid DECIMAL(10, 2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Payment plan installments
CREATE TABLE payment_plan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,

    -- Installment details
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,

    -- Payment tracking
    is_paid BOOLEAN DEFAULT false,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. FINANCIAL REPORTING VIEWS
-- =====================================================

-- Revenue summary view
CREATE OR REPLACE VIEW revenue_summary AS
SELECT
    DATE_TRUNC('month', payment_date) AS month,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_revenue,
    SUM(CASE WHEN payment_method_type = 'card' THEN amount ELSE 0 END) AS card_revenue,
    SUM(CASE WHEN payment_method_type = 'cash' THEN amount ELSE 0 END) AS cash_revenue,
    SUM(CASE WHEN payment_method_type = 'check' THEN amount ELSE 0 END) AS check_revenue
FROM payments
WHERE payment_status = 'succeeded'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month DESC;

-- Outstanding balance view
CREATE OR REPLACE VIEW outstanding_balances AS
SELECT
    i.parent_user_id,
    p.full_name AS parent_name,
    p.email AS parent_email,
    COUNT(DISTINCT i.id) AS invoice_count,
    SUM(i.amount_due) AS total_outstanding,
    SUM(CASE WHEN i.due_date < CURRENT_DATE THEN i.amount_due ELSE 0 END) AS overdue_amount,
    MIN(i.due_date) AS oldest_due_date,
    MAX(CASE WHEN i.status = 'overdue' THEN i.due_date END) AS most_recent_overdue_date
FROM invoices i
JOIN profiles p ON i.parent_user_id = p.user_id
WHERE i.status IN ('sent', 'viewed', 'partial_paid', 'overdue')
  AND i.amount_due > 0
GROUP BY i.parent_user_id, p.full_name, p.email
ORDER BY total_outstanding DESC;

-- Aging report view (30, 60, 90+ days)
CREATE OR REPLACE VIEW aging_report AS
SELECT
    i.parent_user_id,
    p.full_name AS parent_name,
    p.email AS parent_email,
    SUM(CASE WHEN CURRENT_DATE - i.due_date <= 30 THEN i.amount_due ELSE 0 END) AS days_0_30,
    SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.amount_due ELSE 0 END) AS days_31_60,
    SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.amount_due ELSE 0 END) AS days_61_90,
    SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.amount_due ELSE 0 END) AS days_90_plus,
    SUM(i.amount_due) AS total_outstanding
FROM invoices i
JOIN profiles p ON i.parent_user_id = p.user_id
WHERE i.status IN ('sent', 'viewed', 'partial_paid', 'overdue')
  AND i.amount_due > 0
GROUP BY i.parent_user_id, p.full_name, p.email
ORDER BY total_outstanding DESC;

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Tuition plans
CREATE INDEX idx_tuition_plans_active ON tuition_plans(is_active, effective_from, effective_to);
CREATE INDEX idx_tuition_plans_class ON tuition_plans(class_definition_id) WHERE class_definition_id IS NOT NULL;

-- Pricing rules
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active, valid_from, valid_to);
CREATE INDEX idx_pricing_rules_coupon ON pricing_rules(coupon_code) WHERE coupon_code IS NOT NULL;

-- Family discounts
CREATE INDEX idx_family_discounts_student ON family_discounts(student_id, is_active);

-- Invoices
CREATE INDEX idx_invoices_parent ON invoices(parent_user_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date, status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Invoice line items
CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Payments
CREATE INDEX idx_payments_parent ON payments(parent_user_id, payment_status);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Payment methods
CREATE INDEX idx_payment_methods_parent ON payment_methods(parent_user_id);
CREATE INDEX idx_payment_methods_stripe ON payment_methods(stripe_customer_id);

-- Billing schedules
CREATE INDEX idx_billing_schedules_parent ON billing_schedules(parent_user_id, is_active);
CREATE INDEX idx_billing_schedules_next_billing ON billing_schedules(next_billing_date, is_active);

-- Refunds
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(refund_status);

-- Payment reminders
CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_scheduled ON payment_reminders(reminder_status, scheduled_for);

-- Payment plans
CREATE INDEX idx_payment_plans_parent ON payment_plans(parent_user_id, payment_plan_status);

-- =====================================================
-- 10. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tuition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_payment_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

-- Tuition Plans: Admin/Staff can manage, everyone can view active plans
CREATE POLICY "Admin and staff can manage tuition plans"
    ON tuition_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Everyone can view active tuition plans"
    ON tuition_plans FOR SELECT
    USING (is_active = true);

-- Pricing Rules: Admin/Staff only
CREATE POLICY "Admin and staff can manage pricing rules"
    ON pricing_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- Family Discounts: Admin/Staff can manage, parents can view their own
CREATE POLICY "Admin and staff can manage family discounts"
    ON family_discounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can view their student discounts"
    ON family_discounts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = family_discounts.student_id
            AND students.parent_id = auth.uid()
        )
    );

-- Invoices: Admin/Staff full access, parents can view their own
CREATE POLICY "Admin and staff can manage all invoices"
    ON invoices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can view their own invoices"
    ON invoices FOR SELECT
    USING (parent_user_id = auth.uid());

-- Invoice Line Items: Inherit from invoices
CREATE POLICY "Admin and staff can manage invoice line items"
    ON invoice_line_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can view their invoice line items"
    ON invoice_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_line_items.invoice_id
            AND invoices.parent_user_id = auth.uid()
        )
    );

-- Payments: Admin/Staff full access, parents can manage their own
CREATE POLICY "Admin and staff can manage all payments"
    ON payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can manage their own payments"
    ON payments FOR ALL
    USING (parent_user_id = auth.uid());

-- Payment Methods: Admin/Staff can view, parents can manage their own
CREATE POLICY "Admin and staff can view all payment methods"
    ON payment_methods FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can manage their own payment methods"
    ON payment_methods FOR ALL
    USING (parent_user_id = auth.uid());

-- Billing Schedules: Admin/Staff can view, parents can manage their own
CREATE POLICY "Admin and staff can view all billing schedules"
    ON billing_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can manage their own billing schedules"
    ON billing_schedules FOR ALL
    USING (parent_user_id = auth.uid());

-- Refunds: Admin/Staff only
CREATE POLICY "Admin and staff can manage refunds"
    ON refunds FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- Studio Credits: Admin/Staff can manage, parents can view their own
CREATE POLICY "Admin and staff can manage studio credits"
    ON studio_credits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can view their own studio credits"
    ON studio_credits FOR SELECT
    USING (parent_user_id = auth.uid());

-- Payment Reminders: Admin/Staff only
CREATE POLICY "Admin and staff can manage payment reminders"
    ON payment_reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

-- Payment Plans: Admin/Staff can manage, parents can view their own
CREATE POLICY "Admin and staff can manage payment plans"
    ON payment_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.user_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Parents can view their own payment plans"
    ON payment_plans FOR SELECT
    USING (parent_user_id = auth.uid());

-- =====================================================
-- 11. TRIGGERS & FUNCTIONS
-- =====================================================

-- Update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET
        subtotal = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        discount_total = (
            SELECT COALESCE(SUM(discount_amount), 0)
            FROM invoice_line_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        total_amount = subtotal + tax_total + late_fee_applied - discount_total,
        amount_due = total_amount - amount_paid,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Update invoice status when payment is made
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'succeeded' AND NEW.invoice_id IS NOT NULL THEN
        UPDATE invoices
        SET
            amount_paid = amount_paid + NEW.amount,
            amount_due = amount_due - NEW.amount,
            status = CASE
                WHEN amount_due - NEW.amount <= 0 THEN 'paid'::invoice_status
                WHEN amount_paid + NEW.amount > 0 THEN 'partial_paid'::invoice_status
                ELSE status
            END,
            paid_at = CASE
                WHEN amount_due - NEW.amount <= 0 THEN NOW()
                ELSE paid_at
            END,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_on_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();

-- Update invoice status to overdue
CREATE OR REPLACE FUNCTION mark_invoices_overdue()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'::invoice_status
    WHERE due_date < CURRENT_DATE
      AND status IN ('sent', 'viewed', 'partial_paid')
      AND amount_due > 0;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_tuition_plans_updated_at
BEFORE UPDATE ON tuition_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pricing_rules_updated_at
BEFORE UPDATE ON pricing_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_billing_schedules_updated_at
BEFORE UPDATE ON billing_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. INITIAL CONFIGURATION
-- =====================================================

-- Insert default pricing rules (examples)
INSERT INTO pricing_rules (name, description, discount_type, discount_scope, discount_percentage, is_active)
VALUES
    ('Sibling Discount', '10% off for each additional sibling', 'percentage', 'sibling', 10.00, true),
    ('Multi-Class Discount', '10% off second class, 15% off third class', 'percentage', 'multi_class', 10.00, true),
    ('Early Bird Special', '5% off for early registration (30 days before term)', 'percentage', 'early_registration', 5.00, true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
