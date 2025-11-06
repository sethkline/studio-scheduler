-- Analytics Schema Migration
-- This migration adds tables for payments, invoices, and attendance tracking
-- Required for Analytics & Reporting Dashboard (Story 4.1)
--
-- Run this migration in your Supabase SQL Editor
-- Date: 2025-11-06

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
-- Tracks all payment transactions (ticket sales, tuition, merchandise)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES ticket_orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents >= 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'stripe', -- 'stripe', 'cash', 'check', 'bank_transfer'
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
  stripe_payment_intent_id VARCHAR(255),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refund_amount_in_cents INTEGER DEFAULT 0 CHECK (refund_amount_in_cents >= 0),
  refund_date TIMESTAMPTZ,
  refund_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by status and date
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Trigger to update updated_at timestamp
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

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Tracks tuition invoices sent to guardians
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount_in_cents INTEGER NOT NULL CHECK (total_amount_in_cents >= 0),
  amount_paid_in_cents INTEGER DEFAULT 0 CHECK (amount_paid_in_cents >= 0),
  discount_in_cents INTEGER DEFAULT 0 CHECK (discount_in_cents >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'
  due_date DATE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_paid_amount_check CHECK (amount_paid_in_cents <= total_amount_in_cents)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guardian_id ON invoices(guardian_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Function to auto-update invoice status based on payment
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid_in_cents >= NEW.total_amount_in_cents THEN
    NEW.status = 'paid';
    NEW.paid_date = CURRENT_DATE;
  ELSIF NEW.amount_paid_in_cents > 0 THEN
    NEW.status = 'partially_paid';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status = 'sent' THEN
    NEW.status = 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_status_update_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- ============================================================================
-- INVOICE ITEMS TABLE
-- ============================================================================
-- Line items for invoices (tuition, fees, merchandise, etc.)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE SET NULL,
  item_type VARCHAR(50) DEFAULT 'tuition', -- 'tuition', 'registration_fee', 'costume', 'merchandise', 'late_fee', 'other'
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_in_cents INTEGER NOT NULL CHECK (unit_price_in_cents >= 0),
  total_price_in_cents INTEGER NOT NULL CHECK (total_price_in_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_class_instance_id ON invoice_items(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_type ON invoice_items(item_type);

-- Trigger to auto-calculate total price
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price_in_cents = NEW.quantity * NEW.unit_price_in_cents;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_item_total_trigger
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_item_total();

-- Trigger to update invoice total when items change
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET total_amount_in_cents = (
    SELECT COALESCE(SUM(total_price_in_cents), 0)
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_total_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total();

-- ============================================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================================
-- Tracks student attendance for classes
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  schedule_class_id UUID REFERENCES schedule_classes(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'excused', 'tardy', 'left_early'
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, class_instance_id, attendance_date)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_instance_id ON attendance_records(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_class_id ON attendance_records(schedule_class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_updated_at_trigger
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- Revenue summary view
CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT
  DATE_TRUNC('month', payment_date) AS month,
  COUNT(*) AS payment_count,
  SUM(amount_in_cents) AS total_revenue_cents,
  SUM(refund_amount_in_cents) AS total_refunds_cents,
  SUM(amount_in_cents - refund_amount_in_cents) AS net_revenue_cents,
  payment_method,
  payment_status
FROM payments
GROUP BY DATE_TRUNC('month', payment_date), payment_method, payment_status;

-- Enrollment summary view
CREATE OR REPLACE VIEW v_enrollment_summary AS
SELECT
  DATE_TRUNC('month', e.enrollment_date) AS month,
  COUNT(*) AS enrollment_count,
  COUNT(DISTINCT e.student_id) AS unique_students,
  ds.name AS dance_style,
  cl.name AS class_level
FROM enrollments e
LEFT JOIN class_instances ci ON e.class_instance_id = ci.id
LEFT JOIN class_definitions cd ON ci.class_definition_id = cd.id
LEFT JOIN dance_styles ds ON cd.dance_style_id = ds.id
LEFT JOIN class_levels cl ON cd.class_level_id = cl.id
WHERE e.status = 'active'
GROUP BY DATE_TRUNC('month', e.enrollment_date), ds.name, cl.name;

-- Attendance summary view
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT
  DATE_TRUNC('month', attendance_date) AS month,
  COUNT(*) AS total_records,
  SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
  SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
  SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
  SUM(CASE WHEN status = 'tardy' THEN 1 ELSE 0 END) AS tardy_count,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS attendance_rate
FROM attendance_records
GROUP BY DATE_TRUNC('month', attendance_date);

-- Class performance view
CREATE OR REPLACE VIEW v_class_performance AS
SELECT
  ci.id AS class_instance_id,
  cd.name AS class_name,
  ds.name AS dance_style,
  cl.name AS class_level,
  t.first_name || ' ' || t.last_name AS teacher_name,
  cd.max_students,
  COUNT(DISTINCT e.student_id) AS enrolled_students,
  ROUND(100.0 * COUNT(DISTINCT e.student_id) / NULLIF(cd.max_students, 0), 2) AS capacity_utilization,
  COUNT(ar.id) AS attendance_records,
  SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present_count,
  ROUND(
    100.0 * SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0),
    2
  ) AS attendance_rate
FROM class_instances ci
LEFT JOIN class_definitions cd ON ci.class_definition_id = cd.id
LEFT JOIN dance_styles ds ON cd.dance_style_id = ds.id
LEFT JOIN class_levels cl ON cd.class_level_id = cl.id
LEFT JOIN teachers t ON ci.teacher_id = t.id
LEFT JOIN enrollments e ON e.class_instance_id = ci.id AND e.status = 'active'
LEFT JOIN attendance_records ar ON ar.class_instance_id = ci.id
GROUP BY ci.id, cd.name, ds.name, cl.name, t.first_name, t.last_name, cd.max_students;

-- Teacher workload view
CREATE OR REPLACE VIEW v_teacher_workload AS
SELECT
  t.id AS teacher_id,
  t.first_name || ' ' || t.last_name AS teacher_name,
  COUNT(DISTINCT ci.id) AS classes_taught,
  COUNT(DISTINCT sc.id) AS time_slots,
  SUM(cd.duration) AS total_teaching_minutes,
  COUNT(DISTINCT e.student_id) AS total_students,
  ROUND(AVG(cd.max_students), 2) AS avg_class_size,
  COUNT(DISTINCT ar.id) AS attendance_records
FROM teachers t
LEFT JOIN class_instances ci ON ci.teacher_id = t.id AND ci.status = 'active'
LEFT JOIN class_definitions cd ON ci.class_definition_id = cd.id
LEFT JOIN schedule_classes sc ON sc.class_instance_id = ci.id
LEFT JOIN enrollments e ON e.class_instance_id = ci.id AND e.status = 'active'
LEFT JOIN attendance_records ar ON ar.class_instance_id = ci.id
GROUP BY t.id, t.first_name, t.last_name;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Admin and staff can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.guardian_id = auth.uid()
    )
  );

-- Invoices policies
CREATE POLICY "Admin and staff can view all invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their own invoices"
  ON invoices FOR SELECT
  USING (guardian_id = auth.uid());

-- Invoice items policies
CREATE POLICY "Admin and staff can view all invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can manage invoice items"
  ON invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their own invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.guardian_id = auth.uid()
    )
  );

-- Attendance records policies
CREATE POLICY "Admin and staff can view all attendance"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Teachers can view attendance for their classes"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_instances ci
      JOIN teachers t ON ci.teacher_id = t.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ci.id = attendance_records.class_instance_id
      AND p.user_role = 'teacher'
      AND t.id = ci.teacher_id
    )
  );

CREATE POLICY "Admin, staff, and teachers can manage attendance"
  ON attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's attendance"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN student_guardian_relationships sgr ON sgr.student_id = s.id
      WHERE s.id = attendance_records.student_id
      AND sgr.guardian_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE payments IS 'Tracks all payment transactions including ticket sales, tuition, and other revenue';
COMMENT ON TABLE invoices IS 'Tuition invoices sent to guardians';
COMMENT ON TABLE invoice_items IS 'Line items for invoices (tuition, fees, merchandise)';
COMMENT ON TABLE attendance_records IS 'Student attendance tracking for classes';

COMMENT ON VIEW v_revenue_summary IS 'Aggregated revenue metrics by month, method, and status';
COMMENT ON VIEW v_enrollment_summary IS 'Enrollment trends over time by dance style and level';
COMMENT ON VIEW v_attendance_summary IS 'Attendance metrics and rates by month';
COMMENT ON VIEW v_class_performance IS 'Class capacity utilization and attendance rates';
COMMENT ON VIEW v_teacher_workload IS 'Teacher workload distribution and student load';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- After running this migration:
-- 1. Verify tables were created successfully
-- 2. Test RLS policies with different user roles
-- 3. Populate with sample data for testing analytics
-- 4. Run analytics queries to verify views work correctly
