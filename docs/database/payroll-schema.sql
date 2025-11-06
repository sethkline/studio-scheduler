-- =====================================================
-- PAYROLL TRACKING SYSTEM - Database Schema
-- =====================================================
-- This schema supports comprehensive payroll tracking including:
-- - Teacher pay rates (with history)
-- - Automatic hour calculation from schedules
-- - Substitute teacher tracking
-- - Overtime and bonus tracking
-- - Pay stub generation
-- - Payroll export capabilities
-- =====================================================

-- =====================================================
-- 1. TEACHER PAY RATES
-- =====================================================
-- Stores pay rate information for teachers
-- Supports rate history for auditing
CREATE TABLE IF NOT EXISTS teacher_pay_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Pay rate configuration
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly', 'per_class', 'salary')),
  rate_amount DECIMAL(10, 2) NOT NULL CHECK (rate_amount >= 0),

  -- Currency (default USD)
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Effective date range
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL means current rate

  -- Optional: Different rates for different class types or levels
  class_definition_id UUID REFERENCES class_definitions(id) ON DELETE SET NULL,
  dance_style_id UUID REFERENCES dance_styles(id) ON DELETE SET NULL,

  -- Overtime configuration
  overtime_enabled BOOLEAN DEFAULT false,
  overtime_threshold_hours DECIMAL(5, 2), -- e.g., 40 hours per week
  overtime_multiplier DECIMAL(3, 2) DEFAULT 1.5, -- e.g., 1.5 for time-and-a-half

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Ensure no overlapping date ranges for same teacher
  CONSTRAINT no_overlapping_rates EXCLUDE USING GIST (
    teacher_id WITH =,
    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
  )
);

CREATE INDEX idx_teacher_pay_rates_teacher ON teacher_pay_rates(teacher_id);
CREATE INDEX idx_teacher_pay_rates_effective_dates ON teacher_pay_rates(effective_from, effective_to);

-- =====================================================
-- 2. PAYROLL PERIODS
-- =====================================================
-- Defines pay periods for payroll processing
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Period information
  period_name TEXT NOT NULL, -- e.g., "January 2024 - Week 1"
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Pay date
  pay_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'approved', 'paid', 'closed')),

  -- Totals (calculated)
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_regular_pay DECIMAL(10, 2) DEFAULT 0,
  total_overtime_pay DECIMAL(10, 2) DEFAULT 0,
  total_adjustments DECIMAL(10, 2) DEFAULT 0,
  total_gross_pay DECIMAL(10, 2) DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CHECK (end_date >= start_date),
  CHECK (pay_date >= end_date)
);

CREATE INDEX idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

-- =====================================================
-- 3. PAYROLL TIME ENTRIES
-- =====================================================
-- Tracks hours worked by teachers
-- Can be auto-calculated from schedule_classes or manually entered
CREATE TABLE IF NOT EXISTS payroll_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Time tracking
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours DECIMAL(5, 2) NOT NULL CHECK (hours >= 0),

  -- Source tracking
  entry_type TEXT NOT NULL CHECK (entry_type IN ('scheduled', 'manual', 'adjustment')),
  schedule_class_id UUID REFERENCES schedule_classes(id) ON DELETE SET NULL,
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE SET NULL,

  -- Substitute tracking
  is_substitute BOOLEAN DEFAULT false,
  original_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  substitute_rate_override DECIMAL(10, 2), -- Optional override for substitute rate

  -- Pay calculation
  pay_rate_id UUID REFERENCES teacher_pay_rates(id) ON DELETE SET NULL,
  rate_amount DECIMAL(10, 2) NOT NULL, -- Snapshot of rate at time of entry
  regular_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  regular_pay DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(10, 2) DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed', 'paid')),

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_time_entries_period ON payroll_time_entries(payroll_period_id);
CREATE INDEX idx_time_entries_teacher ON payroll_time_entries(teacher_id);
CREATE INDEX idx_time_entries_date ON payroll_time_entries(entry_date);
CREATE INDEX idx_time_entries_schedule_class ON payroll_time_entries(schedule_class_id);

-- =====================================================
-- 4. PAYROLL ADJUSTMENTS
-- =====================================================
-- Tracks bonuses, deductions, and other adjustments
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Adjustment details
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'reimbursement', 'correction', 'other')),
  adjustment_category TEXT, -- e.g., "Performance Bonus", "Mileage Reimbursement", "Uniform Deduction"

  -- Amount
  amount DECIMAL(10, 2) NOT NULL,

  -- Description
  description TEXT NOT NULL,

  -- Tax implications
  is_taxable BOOLEAN DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_adjustments_period ON payroll_adjustments(payroll_period_id);
CREATE INDEX idx_adjustments_teacher ON payroll_adjustments(teacher_id);
CREATE INDEX idx_adjustments_type ON payroll_adjustments(adjustment_type);

-- =====================================================
-- 5. PAYROLL PAY STUBS
-- =====================================================
-- Generated pay stubs for each teacher per pay period
CREATE TABLE IF NOT EXISTS payroll_pay_stubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Pay stub number (for reference)
  stub_number TEXT UNIQUE,

  -- Earnings summary
  regular_hours DECIMAL(10, 2) DEFAULT 0,
  regular_pay DECIMAL(10, 2) DEFAULT 0,
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(10, 2) DEFAULT 0,

  -- Adjustments summary
  total_bonuses DECIMAL(10, 2) DEFAULT 0,
  total_deductions DECIMAL(10, 2) DEFAULT 0,
  total_reimbursements DECIMAL(10, 2) DEFAULT 0,

  -- Totals
  gross_pay DECIMAL(10, 2) NOT NULL,
  net_pay DECIMAL(10, 2) NOT NULL,

  -- PDF generation
  pdf_url TEXT, -- URL to generated PDF in storage
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'viewed')),

  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),

  -- Ensure one pay stub per teacher per period
  UNIQUE(payroll_period_id, teacher_id)
);

CREATE INDEX idx_pay_stubs_period ON payroll_pay_stubs(payroll_period_id);
CREATE INDEX idx_pay_stubs_teacher ON payroll_pay_stubs(teacher_id);
CREATE INDEX idx_pay_stubs_stub_number ON payroll_pay_stubs(stub_number);

-- =====================================================
-- 6. PAYROLL EXPORT LOG
-- =====================================================
-- Tracks exports to external payroll systems
CREATE TABLE IF NOT EXISTS payroll_export_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Export details
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'excel', 'quickbooks', 'adp', 'gusto', 'paychex', 'custom')),

  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,

  -- Export summary
  record_count INTEGER,
  total_amount DECIMAL(10, 2),

  -- Status
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exported_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_export_log_period ON payroll_export_log(payroll_period_id);
CREATE INDEX idx_export_log_created ON payroll_export_log(created_at);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE teacher_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_export_log ENABLE ROW LEVEL SECURITY;

-- Admin and staff can manage all payroll data
CREATE POLICY "Admin can manage all payroll data" ON teacher_pay_rates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admin can manage payroll periods" ON payroll_periods FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admin can manage time entries" ON payroll_time_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admin can manage adjustments" ON payroll_adjustments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

-- Teachers can view their own pay stubs
CREATE POLICY "Teachers can view own pay stubs" ON payroll_pay_stubs FOR SELECT USING (
  teacher_id IN (
    SELECT t.id FROM teachers t
    JOIN profiles p ON p.id = t.id OR p.email = t.email
    WHERE p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admin can manage pay stubs" ON payroll_pay_stubs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admin can view export log" ON payroll_export_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate hours from time range
CREATE OR REPLACE FUNCTION calculate_hours(start_time TIME, end_time TIME)
RETURNS DECIMAL(5, 2) AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get current pay rate for a teacher
CREATE OR REPLACE FUNCTION get_current_pay_rate(p_teacher_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  rate_id UUID,
  rate_type TEXT,
  rate_amount DECIMAL(10, 2),
  overtime_enabled BOOLEAN,
  overtime_threshold_hours DECIMAL(5, 2),
  overtime_multiplier DECIMAL(3, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tpr.id,
    tpr.rate_type,
    tpr.rate_amount,
    tpr.overtime_enabled,
    tpr.overtime_threshold_hours,
    tpr.overtime_multiplier
  FROM teacher_pay_rates tpr
  WHERE tpr.teacher_id = p_teacher_id
    AND tpr.effective_from <= p_date
    AND (tpr.effective_to IS NULL OR tpr.effective_to >= p_date)
  ORDER BY tpr.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate pay for time entry
CREATE OR REPLACE FUNCTION calculate_time_entry_pay()
RETURNS TRIGGER AS $$
DECLARE
  v_pay_rate RECORD;
  v_total_hours DECIMAL(10, 2);
  v_overtime_threshold DECIMAL(5, 2);
BEGIN
  -- Get current pay rate
  SELECT * INTO v_pay_rate FROM get_current_pay_rate(NEW.teacher_id, NEW.entry_date);

  IF v_pay_rate IS NULL THEN
    RAISE EXCEPTION 'No pay rate found for teacher % on date %', NEW.teacher_id, NEW.entry_date;
  END IF;

  -- Store rate information
  NEW.pay_rate_id := v_pay_rate.rate_id;
  NEW.rate_amount := v_pay_rate.rate_amount;

  -- Calculate regular and overtime hours
  IF v_pay_rate.overtime_enabled THEN
    -- Get total hours for this teacher in this period up to this entry
    SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
    FROM payroll_time_entries
    WHERE teacher_id = NEW.teacher_id
      AND payroll_period_id = NEW.payroll_period_id
      AND id != NEW.id;

    v_overtime_threshold := v_pay_rate.overtime_threshold_hours;

    -- Calculate overtime
    IF v_total_hours >= v_overtime_threshold THEN
      -- All hours are overtime
      NEW.regular_hours := 0;
      NEW.overtime_hours := NEW.hours;
    ELSIF (v_total_hours + NEW.hours) > v_overtime_threshold THEN
      -- Split between regular and overtime
      NEW.regular_hours := v_overtime_threshold - v_total_hours;
      NEW.overtime_hours := NEW.hours - NEW.regular_hours;
    ELSE
      -- All hours are regular
      NEW.regular_hours := NEW.hours;
      NEW.overtime_hours := 0;
    END IF;
  ELSE
    -- No overtime calculation
    NEW.regular_hours := NEW.hours;
    NEW.overtime_hours := 0;
  END IF;

  -- Calculate pay amounts
  NEW.regular_pay := NEW.regular_hours * NEW.rate_amount;
  NEW.overtime_pay := NEW.overtime_hours * NEW.rate_amount * v_pay_rate.overtime_multiplier;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate pay on insert/update
CREATE TRIGGER trigger_calculate_time_entry_pay
  BEFORE INSERT OR UPDATE OF hours, teacher_id, entry_date
  ON payroll_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_pay();

-- Function to update payroll period totals
CREATE OR REPLACE FUNCTION update_payroll_period_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the payroll period totals
  UPDATE payroll_periods
  SET
    total_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM payroll_time_entries
      WHERE payroll_period_id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id)
    ),
    total_regular_pay = (
      SELECT COALESCE(SUM(regular_pay), 0)
      FROM payroll_time_entries
      WHERE payroll_period_id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id)
    ),
    total_overtime_pay = (
      SELECT COALESCE(SUM(overtime_pay), 0)
      FROM payroll_time_entries
      WHERE payroll_period_id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id)
    ),
    total_adjustments = (
      SELECT COALESCE(SUM(amount), 0)
      FROM payroll_adjustments
      WHERE payroll_period_id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id);

  -- Calculate total gross pay
  UPDATE payroll_periods
  SET total_gross_pay = total_regular_pay + total_overtime_pay + total_adjustments
  WHERE id = COALESCE(NEW.payroll_period_id, OLD.payroll_period_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update period totals
CREATE TRIGGER trigger_update_period_totals_on_time_entry
  AFTER INSERT OR UPDATE OR DELETE
  ON payroll_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_period_totals();

CREATE TRIGGER trigger_update_period_totals_on_adjustment
  AFTER INSERT OR UPDATE OR DELETE
  ON payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_period_totals();

-- =====================================================
-- 9. INITIAL DATA / INDEXES
-- =====================================================

-- Create sequence for pay stub numbers
CREATE SEQUENCE IF NOT EXISTS pay_stub_number_seq START 1000;

-- Function to generate pay stub number
CREATE OR REPLACE FUNCTION generate_pay_stub_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
BEGIN
  v_number := 'PS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pay_stub_number_seq')::TEXT, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate pay stub number
CREATE OR REPLACE FUNCTION set_pay_stub_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stub_number IS NULL THEN
    NEW.stub_number := generate_pay_stub_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_pay_stub_number
  BEFORE INSERT ON payroll_pay_stubs
  FOR EACH ROW
  EXECUTE FUNCTION set_pay_stub_number();

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE teacher_pay_rates IS 'Stores pay rate information for teachers with historical tracking';
COMMENT ON TABLE payroll_periods IS 'Defines pay periods for payroll processing';
COMMENT ON TABLE payroll_time_entries IS 'Tracks hours worked by teachers, auto-calculated from schedule or manually entered';
COMMENT ON TABLE payroll_adjustments IS 'Tracks bonuses, deductions, and other pay adjustments';
COMMENT ON TABLE payroll_pay_stubs IS 'Generated pay stubs for each teacher per pay period';
COMMENT ON TABLE payroll_export_log IS 'Tracks exports to external payroll systems';

-- End of payroll schema
