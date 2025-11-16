-- =====================================================
-- TUITION & BILLING SYSTEM MIGRATION (INTEGRATED VERSION)
-- Integrates with unified payment system instead of duplicating infrastructure
-- =====================================================
-- IMPORTANT: This migration requires the unified payment system migrations to be run first:
-- - 20251116_006_unified_payment_system.sql
-- - 20251116_007_tuition_billing_extensions.sql
-- =====================================================

-- This migration adds the ORDER LINE ITEMS table which was in the original
-- but is needed for detailed invoice breakdowns

-- ============================================================================
-- ORDER LINE ITEMS (for detailed invoice breakdowns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can link to either tuition invoice or ticket order
  tuition_invoice_id UUID REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  ticket_order_id UUID REFERENCES ticket_orders(id) ON DELETE CASCADE,

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

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: must link to something
  CHECK (tuition_invoice_id IS NOT NULL OR ticket_order_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_order_line_items_tuition_invoice ON order_line_items(tuition_invoice_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_ticket_order ON order_line_items(ticket_order_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_enrollment ON order_line_items(enrollment_id);

-- ============================================================================
-- RLS POLICIES FOR ORDER LINE ITEMS
-- ============================================================================

ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and staff can manage line items"
  ON order_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Parents can view their order line items"
  ON order_line_items FOR SELECT
  USING (
    -- Can see if linked to their tuition invoice
    tuition_invoice_id IN (
      SELECT ti.id FROM tuition_invoices ti
      JOIN students s ON ti.student_id = s.id
      JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
    )
    OR
    -- Can see if linked to their ticket order
    ticket_order_id IN (
      SELECT id FROM ticket_orders
      WHERE parent_user_id = auth.uid()
      OR email IN (
        SELECT email FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- FUNCTION TO UPDATE INVOICE TOTALS WHEN LINE ITEMS CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tuition_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tuition invoice totals if this line item is linked to one
  IF COALESCE(NEW.tuition_invoice_id, OLD.tuition_invoice_id) IS NOT NULL THEN
    UPDATE tuition_invoices
    SET
      total_amount_in_cents = (
        SELECT COALESCE(SUM(amount_in_cents - discount_amount_in_cents), 0)
        FROM order_line_items
        WHERE tuition_invoice_id = COALESCE(NEW.tuition_invoice_id, OLD.tuition_invoice_id)
      ),
      balance_in_cents = (
        SELECT COALESCE(SUM(amount_in_cents - discount_amount_in_cents), 0)
        FROM order_line_items
        WHERE tuition_invoice_id = COALESCE(NEW.tuition_invoice_id, OLD.tuition_invoice_id)
      ) - COALESCE(
        (SELECT amount_paid_in_cents FROM tuition_invoices
         WHERE id = COALESCE(NEW.tuition_invoice_id, OLD.tuition_invoice_id)),
        0
      )
    WHERE id = COALESCE(NEW.tuition_invoice_id, OLD.tuition_invoice_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_tuition_invoice_totals ON order_line_items;
CREATE TRIGGER trigger_update_tuition_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_tuition_invoice_totals();

-- ============================================================================
-- HELPER VIEWS FOR TUITION BILLING
-- ============================================================================

-- View for parent billing summary
CREATE OR REPLACE VIEW parent_tuition_summary AS
SELECT
  g.id as guardian_id,
  g.user_id,
  g.first_name || ' ' || g.last_name as guardian_name,
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,

  -- Tuition summary
  COUNT(DISTINCT ti.id) as total_invoices,
  SUM(ti.total_amount_in_cents) FILTER (WHERE ti.status NOT IN ('cancelled', 'paid')) as outstanding_amount_cents,
  SUM(ti.balance_in_cents) FILTER (WHERE ti.status NOT IN ('cancelled', 'paid')) as balance_due_cents,
  MIN(ti.due_date) FILTER (WHERE ti.status NOT IN ('cancelled', 'paid')) as next_due_date,

  -- Payment plan info
  COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'active') as active_payment_plans,
  SUM(pp.balance_in_cents) FILTER (WHERE pp.status = 'active') as payment_plan_balance_cents,

  -- Payment method
  BOOL_OR(pm.is_autopay_enabled) as has_autopay_enabled

FROM guardians g
JOIN student_guardian_relationships sgr ON g.id = sgr.guardian_id
JOIN students s ON sgr.student_id = s.id
LEFT JOIN tuition_invoices ti ON s.id = ti.student_id
LEFT JOIN payment_plans pp ON s.id = pp.student_id AND pp.plan_type = 'tuition'
LEFT JOIN payment_methods pm ON g.user_id = pm.user_id AND pm.is_default = true

GROUP BY g.id, g.user_id, g.first_name, g.last_name, s.id, s.first_name, s.last_name;

GRANT SELECT ON parent_tuition_summary TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE order_line_items IS 'Detailed line items for invoices (tuition or ticket orders)';
COMMENT ON VIEW parent_tuition_summary IS 'Summary of tuition billing for parents';

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================

-- This migration integrates with the unified payment system:
--
-- REMOVED (use unified tables instead):
-- - refunds table → use unified 'refunds' table
-- - billing_schedules table → use 'payment_plans' + 'payment_plan_installments'
-- - separate payment tracking → use 'payment_transactions' with order_type='tuition'
--
-- KEPT (tuition-specific):
-- - tuition_plans
-- - pricing_rules
-- - family_discounts
-- - tuition_invoices
-- - late_payment_penalties
-- - payment_reminders
-- - order_line_items (this file)
--
-- HOW TO USE:
--
-- 1. Create tuition invoice:
--    INSERT INTO tuition_invoices (student_id, enrollment_id, ...)
--
-- 2. Add line items:
--    INSERT INTO order_line_items (tuition_invoice_id, description, amount_in_cents, ...)
--
-- 3. When parent pays:
--    INSERT INTO payment_transactions (
--      order_type = 'tuition',
--      student_id = ...,
--      amount_in_cents = ...,
--      payment_status = 'completed'
--    )
--    -- Trigger automatically updates tuition_invoices.amount_paid_in_cents
--
-- 4. For payment plans:
--    INSERT INTO payment_plans (
--      plan_type = 'tuition',
--      student_id = ...,
--      enrollment_id = ...,
--      ...
--    )
--    -- Then create installments
--    INSERT INTO payment_plan_installments (payment_plan_id, ...)
--
-- 5. For refunds:
--    INSERT INTO refunds (
--      payment_transaction_id = ...,
--      refund_amount_in_cents = ...,
--      ...
--    )

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
