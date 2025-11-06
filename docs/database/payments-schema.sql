-- Payments table for tracking all parent payments
-- This includes class tuition, recital fees, costume fees, etc.

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL, -- NULL for family-wide payments

  -- Payment details
  amount_cents INTEGER NOT NULL, -- Store in cents to avoid floating point issues
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL, -- 'tuition', 'recital_fee', 'costume', 'registration', 'late_fee', 'other'
  payment_method VARCHAR(50), -- 'credit_card', 'debit_card', 'ach', 'check', 'cash', 'stripe'

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded', 'overdue'

  -- Description and metadata
  description TEXT NOT NULL,
  notes TEXT,

  -- References
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE SET NULL,
  recital_id UUID REFERENCES recitals(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to ticket orders

  -- Stripe integration
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Due date and payment date
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Receipt information
  receipt_number VARCHAR(50) UNIQUE,
  receipt_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_guardian_id ON payments(guardian_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admins and staff can view all payments
CREATE POLICY "Admin and staff can view all payments"
  ON payments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE user_role IN ('admin', 'staff')
    )
  );

-- Parents can view their own payments
CREATE POLICY "Parents can view their own payments"
  ON payments FOR SELECT
  USING (
    guardian_id IN (
      SELECT id FROM guardians WHERE user_id = auth.uid()
    )
  );

-- Only admins and staff can insert/update/delete payments
CREATE POLICY "Admin and staff can manage payments"
  ON payments FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE user_role IN ('admin', 'staff')
    )
  );

-- Payment method history for tracking payment methods on file
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,

  -- Stripe payment method details
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'card', 'ach', 'bank_account'

  -- Card details (last 4 digits, brand, exp)
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Bank account details
  bank_name VARCHAR(255),
  bank_last4 VARCHAR(4),

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'removed'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_guardian_id ON payment_methods(guardian_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);

-- RLS Policies for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own payment methods"
  ON payment_methods FOR SELECT
  USING (
    guardian_id IN (
      SELECT id FROM guardians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and staff can view all payment methods"
  ON payment_methods FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can manage their own payment methods"
  ON payment_methods FOR ALL
  USING (
    guardian_id IN (
      SELECT id FROM guardians WHERE user_id = auth.uid()
    )
  );
