-- Migration: Tier 1 - Recital Fees and Payment Tracking
-- Adds comprehensive fee management, payment plans, and balance tracking

-- Create recital fee types table (defines what fees exist for a recital)
CREATE TABLE IF NOT EXISTS recital_fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,

  -- Fee details
  fee_name VARCHAR(255) NOT NULL,
  description TEXT,
  fee_type VARCHAR(50) NOT NULL, -- 'participation', 'costume', 'registration', 'ticket', 'other'
  amount_in_cents INTEGER NOT NULL,

  -- Applicability
  applies_to VARCHAR(50) DEFAULT 'all', -- 'all', 'per_student', 'per_performance', 'per_family'
  is_required BOOLEAN DEFAULT TRUE,
  is_refundable BOOLEAN DEFAULT FALSE,

  -- Deadlines
  due_date DATE,
  early_bird_deadline DATE,
  early_bird_amount_in_cents INTEGER,
  late_fee_amount_in_cents INTEGER,
  late_fee_start_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student recital fees (individual fee assignments)
CREATE TABLE IF NOT EXISTS student_recital_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES recital_fee_types(id) ON DELETE SET NULL,

  -- Fee details (captured at assignment time)
  fee_name VARCHAR(255) NOT NULL,
  description TEXT,
  amount_in_cents INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_amount_in_cents INTEGER NOT NULL, -- amount * quantity

  -- Performance link (if fee is per-performance)
  recital_performance_id UUID REFERENCES recital_performances(id) ON DELETE SET NULL,

  -- Payment status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'waived', 'refunded'
  amount_paid_in_cents INTEGER DEFAULT 0,
  balance_in_cents INTEGER NOT NULL,

  -- Deadlines
  due_date DATE,
  paid_in_full_date TIMESTAMPTZ,

  -- Waiver/discount
  is_waived BOOLEAN DEFAULT FALSE,
  waived_by UUID REFERENCES profiles(id),
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  discount_amount_in_cents INTEGER DEFAULT 0,
  discount_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS recital_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id UUID NOT NULL REFERENCES student_recital_fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Payment details
  amount_in_cents INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'cash', 'check', 'transfer', 'waiver'
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'

  -- Payment processor details
  payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  check_number VARCHAR(100),

  -- Guardian who made payment
  guardian_id UUID REFERENCES guardians(id),
  paid_by_name VARCHAR(255),

  -- Transaction metadata
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES profiles(id),

  -- Notes and receipts
  notes TEXT,
  receipt_url TEXT,
  receipt_sent_at TIMESTAMPTZ,

  -- Refund tracking
  refund_amount_in_cents INTEGER DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment plans table
CREATE TABLE IF NOT EXISTS recital_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id),

  -- Plan details
  plan_name VARCHAR(255),
  total_amount_in_cents INTEGER NOT NULL,
  number_of_installments INTEGER NOT NULL,
  installment_amount_in_cents INTEGER NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly'

  -- Plan status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'defaulted'
  amount_paid_in_cents INTEGER DEFAULT 0,
  balance_in_cents INTEGER NOT NULL,

  -- Schedule
  start_date DATE NOT NULL,
  next_payment_date DATE,
  final_payment_date DATE,

  -- Auto-payment
  auto_pay_enabled BOOLEAN DEFAULT FALSE,
  auto_pay_method_id VARCHAR(255), -- Stripe payment method ID

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment plan installments table
CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES recital_payment_plans(id) ON DELETE CASCADE,

  -- Installment details
  installment_number INTEGER NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  due_date DATE NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'paid', 'overdue', 'skipped'
  paid_amount_in_cents INTEGER DEFAULT 0,
  paid_date TIMESTAMPTZ,

  -- Transaction link
  transaction_id UUID REFERENCES recital_payment_transactions(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_types_recital ON recital_fee_types(recital_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_recital_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_recital ON student_recital_fees(recital_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_recital_fees(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student_fee ON recital_payment_transactions(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON recital_payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_guardian ON recital_payment_transactions(guardian_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_student ON recital_payment_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_recital ON recital_payment_plans(recital_id);
CREATE INDEX IF NOT EXISTS idx_installments_plan ON payment_plan_installments(payment_plan_id);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_recital_fee_types_updated_at ON recital_fee_types;
CREATE TRIGGER update_recital_fee_types_updated_at
  BEFORE UPDATE ON recital_fee_types
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_student_recital_fees_updated_at ON student_recital_fees;
CREATE TRIGGER update_student_recital_fees_updated_at
  BEFORE UPDATE ON student_recital_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON recital_payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON recital_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_payment_plans_updated_at ON recital_payment_plans;
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON recital_payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

DROP TRIGGER IF EXISTS update_installments_updated_at ON payment_plan_installments;
CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON payment_plan_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_updated_at();

-- Create function to automatically update balance when payment is made
CREATE OR REPLACE FUNCTION update_fee_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the student fee balance
  UPDATE student_recital_fees
  SET
    amount_paid_in_cents = amount_paid_in_cents + NEW.amount_in_cents,
    balance_in_cents = total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents),
    status = CASE
      WHEN total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents) <= 0 THEN 'paid'
      WHEN amount_paid_in_cents + NEW.amount_in_cents > 0 THEN 'partial'
      ELSE status
    END,
    paid_in_full_date = CASE
      WHEN total_amount_in_cents - (amount_paid_in_cents + NEW.amount_in_cents) <= 0 THEN NOW()
      ELSE paid_in_full_date
    END
  WHERE id = NEW.student_fee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_balance_on_payment ON recital_payment_transactions;
CREATE TRIGGER update_balance_on_payment
  AFTER INSERT ON recital_payment_transactions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION update_fee_balance_on_payment();

-- Create view for parent payment summary
CREATE OR REPLACE VIEW parent_payment_summary AS
SELECT
  g.id as guardian_id,
  g.user_id,
  s.id as student_id,
  s.first_name,
  s.last_name,
  r.id as recital_id,
  r.name as recital_name,
  COUNT(DISTINCT sf.id) as total_fees,
  SUM(sf.total_amount_in_cents) as total_amount_in_cents,
  SUM(sf.amount_paid_in_cents) as amount_paid_in_cents,
  SUM(sf.balance_in_cents) as balance_in_cents,
  COUNT(DISTINCT CASE WHEN sf.status = 'paid' THEN sf.id END) as fees_paid_count,
  COUNT(DISTINCT CASE WHEN sf.status = 'pending' THEN sf.id END) as fees_pending_count,
  MIN(sf.due_date) as earliest_due_date
FROM guardians g
JOIN student_guardian_relationships sgr ON g.id = sgr.guardian_id
JOIN students s ON sgr.student_id = s.id
JOIN student_recital_fees sf ON s.id = sf.student_id
JOIN recitals r ON sf.recital_id = r.id
GROUP BY g.id, g.user_id, s.id, s.first_name, s.last_name, r.id, r.name;

-- Enable RLS
ALTER TABLE recital_fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_recital_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recital_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all fee types"
  ON recital_fee_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can manage fee types"
  ON recital_fee_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can view all student fees"
  ON student_recital_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their children's fees"
  ON student_recital_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_guardian_relationships sgr
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = student_recital_fees.student_id
    )
  );

CREATE POLICY "Staff can manage student fees"
  ON student_recital_fees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can view all transactions"
  ON recital_payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their transactions"
  ON recital_payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_guardian_relationships sgr
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = recital_payment_transactions.student_id
    )
  );

CREATE POLICY "Staff can manage transactions"
  ON recital_payment_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can view payment plans"
  ON recital_payment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their payment plans"
  ON recital_payment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_guardian_relationships sgr
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = recital_payment_plans.student_id
    )
  );

CREATE POLICY "Staff can manage payment plans"
  ON recital_payment_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Grant permissions
GRANT SELECT ON parent_payment_summary TO authenticated;
