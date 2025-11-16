-- Migration: Analytics Dashboard Views
-- Description: Creates analytics views using existing payment infrastructure (NO duplicate tables)
-- Date: 2025-11-16
-- Dependencies: Requires unified payment system and tuition billing migrations

-- ============================================================================
-- IMPORTANT: This migration creates VIEWS instead of tables
-- It aggregates data from existing payment infrastructure for analytics
-- ============================================================================

-- ============================================================================
-- 1. UNIFIED PAYMENT SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_payment_summary AS
SELECT
  pt.id as payment_id,
  pt.order_type as payment_type,
  pt.student_id,
  s.first_name || ' ' || s.last_name as student_name,
  pt.amount_in_cents,
  pt.payment_status,
  pt.payment_method,
  pt.transaction_date as payment_date,
  pt.stripe_charge_id,
  pt.guardian_id,
  g.first_name || ' ' || g.last_name as guardian_name,

  -- Event/Context information
  CASE
    WHEN pt.order_type = 'recital_fee' THEN r.name
    WHEN pt.order_type = 'ticket' THEN rs.name
    WHEN pt.order_type = 'tuition' THEN cd.name
    WHEN pt.order_type = 'merchandise' THEN 'Merchandise Order #' || mo.order_number
    ELSE NULL
  END as event_name,

  -- Refund information
  COALESCE(ref.refund_amount_in_cents, 0) as refund_amount_in_cents,
  ref.refund_status,

  -- Timestamps
  pt.created_at,
  pt.transaction_date

FROM payment_transactions pt
LEFT JOIN students s ON pt.student_id = s.id
LEFT JOIN guardians g ON pt.guardian_id = g.id

-- Recital fee joins
LEFT JOIN student_recital_fees srf ON pt.student_fee_id = srf.id
LEFT JOIN recitals r ON srf.recital_id = r.id

-- Ticket order joins
LEFT JOIN ticket_orders tor ON pt.ticket_order_id = tor.id
LEFT JOIN recital_shows rs ON tor.recital_show_id = rs.id

-- Tuition joins (via student and enrollment)
LEFT JOIN enrollments e ON s.id = e.student_id
LEFT JOIN class_instances ci ON e.class_instance_id = ci.id
LEFT JOIN class_definitions cd ON ci.class_definition_id = cd.id

-- Merchandise joins
LEFT JOIN merchandise_orders mo ON pt.merchandise_order_id = mo.id

-- Refund information
LEFT JOIN refunds ref ON ref.payment_transaction_id = pt.id;

-- Grant access
GRANT SELECT ON analytics_payment_summary TO authenticated;

-- ============================================================================
-- 2. REVENUE BY PAYMENT TYPE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_revenue_by_type AS
SELECT
  order_type,
  DATE_TRUNC('month', transaction_date) as month,
  DATE_TRUNC('week', transaction_date) as week,
  DATE_TRUNC('day', transaction_date) as day,
  COUNT(*) as transaction_count,
  SUM(amount_in_cents) as total_revenue_cents,
  AVG(amount_in_cents) as avg_transaction_cents,
  SUM(CASE WHEN payment_status = 'completed' THEN amount_in_cents ELSE 0 END) as completed_revenue_cents,
  SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN payment_status = 'refunded' THEN amount_in_cents ELSE 0 END) as refunded_cents
FROM payment_transactions
GROUP BY order_type, DATE_TRUNC('month', transaction_date), DATE_TRUNC('week', transaction_date), DATE_TRUNC('day', transaction_date);

GRANT SELECT ON analytics_revenue_by_type TO authenticated;

-- ============================================================================
-- 3. OUTSTANDING BALANCES VIEW (Recital Fees)
-- ============================================================================

CREATE OR REPLACE VIEW analytics_outstanding_balances AS
SELECT
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,
  g.id as guardian_id,
  g.first_name || ' ' || g.last_name as guardian_name,
  g.email as guardian_email,
  g.phone as guardian_phone,

  -- Recital fees
  SUM(srf.balance_in_cents) FILTER (WHERE srf.status IN ('pending', 'partial')) as recital_balance_cents,
  COUNT(srf.id) FILTER (WHERE srf.status IN ('pending', 'partial')) as outstanding_recital_fee_count,
  MIN(srf.due_date) FILTER (WHERE srf.status IN ('pending', 'partial')) as earliest_recital_due_date,

  -- Tuition invoices
  SUM(ti.balance_in_cents) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')) as tuition_balance_cents,
  COUNT(ti.id) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')) as outstanding_tuition_count,
  MIN(ti.due_date) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')) as earliest_tuition_due_date,

  -- Combined totals
  COALESCE(SUM(srf.balance_in_cents) FILTER (WHERE srf.status IN ('pending', 'partial')), 0) +
  COALESCE(SUM(ti.balance_in_cents) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')), 0) as total_balance_cents,

  LEAST(
    MIN(srf.due_date) FILTER (WHERE srf.status IN ('pending', 'partial')),
    MIN(ti.due_date) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue'))
  ) as earliest_due_date,

  -- Overdue flags
  BOOL_OR(srf.due_date < CURRENT_DATE AND srf.status IN ('pending', 'partial')) as has_overdue_recital_fees,
  BOOL_OR(ti.due_date < CURRENT_DATE AND ti.status IN ('sent', 'partial', 'overdue')) as has_overdue_tuition

FROM students s
JOIN student_guardian_relationships sgr ON s.id = sgr.student_id
JOIN guardians g ON sgr.guardian_id = g.id
LEFT JOIN student_recital_fees srf ON s.id = srf.student_id
LEFT JOIN tuition_invoices ti ON s.id = ti.student_id
GROUP BY s.id, s.first_name, s.last_name, g.id, g.first_name, g.last_name, g.email, g.phone
HAVING
  SUM(srf.balance_in_cents) FILTER (WHERE srf.status IN ('pending', 'partial')) > 0 OR
  SUM(ti.balance_in_cents) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')) > 0;

GRANT SELECT ON analytics_outstanding_balances TO authenticated;

-- ============================================================================
-- 4. PAYMENT METHOD USAGE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_payment_method_usage AS
SELECT
  payment_method,
  DATE_TRUNC('month', transaction_date) as month,
  COUNT(*) as transaction_count,
  SUM(amount_in_cents) as total_amount_cents,
  AVG(amount_in_cents) as avg_amount_cents,
  SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as successful_count,
  SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  ROUND(
    100.0 * SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate_percentage
FROM payment_transactions
GROUP BY payment_method, DATE_TRUNC('month', transaction_date);

GRANT SELECT ON analytics_payment_method_usage TO authenticated;

-- ============================================================================
-- 5. ENROLLMENT & ATTENDANCE STATISTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_enrollment_stats AS
SELECT
  cd.id as class_definition_id,
  cd.name as class_name,
  ds.name as dance_style,
  cl.name as class_level,
  t.first_name || ' ' || t.last_name as teacher_name,
  sch.id as schedule_id,
  sch.name as schedule_name,

  -- Enrollment stats
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as active_enrollments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'waitlist') as waitlist_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'dropped') as dropped_count,
  ci.max_students,
  ci.max_students - COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as available_spots,

  -- Attendance stats (if attendance tracking exists)
  ROUND(
    AVG(CASE WHEN att.status = 'present' THEN 1.0 ELSE 0.0 END) * 100,
    2
  ) as attendance_rate_percentage,

  -- Financial stats
  SUM(ti.total_amount_in_cents) FILTER (WHERE ti.status != 'cancelled') as total_tuition_billed_cents,
  SUM(ti.amount_paid_in_cents) as total_tuition_collected_cents,

  ci.created_at

FROM class_instances ci
JOIN class_definitions cd ON ci.class_definition_id = cd.id
LEFT JOIN dance_styles ds ON cd.dance_style_id = ds.id
LEFT JOIN class_levels cl ON cd.class_level_id = cl.id
LEFT JOIN teachers t ON ci.teacher_id = t.id
LEFT JOIN schedule_classes sclass ON ci.id = sclass.class_instance_id
LEFT JOIN schedules sch ON sclass.schedule_id = sch.id
LEFT JOIN enrollments e ON ci.id = e.class_instance_id
LEFT JOIN tuition_invoices ti ON e.id = ti.enrollment_id
LEFT JOIN attendance att ON e.student_id = att.student_id AND sclass.id = att.schedule_class_id

GROUP BY
  cd.id, cd.name, ds.name, cl.name, t.first_name, t.last_name,
  sch.id, sch.name, ci.max_students, ci.created_at;

GRANT SELECT ON analytics_enrollment_stats TO authenticated;

-- ============================================================================
-- 6. RECITAL REVENUE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_recital_revenue AS
SELECT
  r.id as recital_id,
  r.name as recital_name,
  r.year as recital_year,

  -- Fee revenue
  COUNT(DISTINCT srf.id) as total_fees_assigned,
  SUM(srf.total_amount_in_cents) as total_fees_billed_cents,
  SUM(srf.amount_paid_in_cents) as total_fees_collected_cents,
  SUM(srf.balance_in_cents) as total_fees_outstanding_cents,

  -- Ticket revenue
  COUNT(DISTINCT tor.id) FILTER (WHERE tor.payment_status = 'completed') as tickets_sold,
  SUM(tor.total_in_cents) FILTER (WHERE tor.payment_status = 'completed') as ticket_revenue_cents,

  -- Combined revenue
  SUM(srf.amount_paid_in_cents) + COALESCE(SUM(tor.total_in_cents) FILTER (WHERE tor.payment_status = 'completed'), 0) as total_revenue_cents,

  -- Student participation
  COUNT(DISTINCT srf.student_id) as participating_students,

  r.created_at

FROM recitals r
LEFT JOIN student_recital_fees srf ON r.id = srf.recital_id
LEFT JOIN recital_shows rs ON r.id = rs.recital_id
LEFT JOIN ticket_orders tor ON rs.id = tor.recital_show_id

GROUP BY r.id, r.name, r.year, r.created_at;

GRANT SELECT ON analytics_recital_revenue TO authenticated;

-- ============================================================================
-- 7. PARENT PORTAL ACTIVITY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_parent_activity AS
SELECT
  g.id as guardian_id,
  g.user_id,
  g.first_name || ' ' || g.last_name as guardian_name,
  g.email,

  -- Student count
  COUNT(DISTINCT sgr.student_id) as student_count,

  -- Payment activity
  COUNT(DISTINCT pt.id) as total_payments,
  SUM(pt.amount_in_cents) FILTER (WHERE pt.payment_status = 'completed') as total_paid_cents,
  MAX(pt.transaction_date) as last_payment_date,

  -- Outstanding balances
  COALESCE(SUM(srf.balance_in_cents) FILTER (WHERE srf.status IN ('pending', 'partial')), 0) +
  COALESCE(SUM(ti.balance_in_cents) FILTER (WHERE ti.status IN ('sent', 'partial', 'overdue')), 0) as total_balance_cents,

  -- Enrollment activity
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as active_enrollments,

  -- Last activity
  GREATEST(
    MAX(pt.transaction_date),
    MAX(e.enrolled_at),
    MAX(er.requested_at)
  ) as last_activity_date

FROM guardians g
LEFT JOIN student_guardian_relationships sgr ON g.id = sgr.guardian_id
LEFT JOIN students s ON sgr.student_id = s.id
LEFT JOIN payment_transactions pt ON g.id = pt.guardian_id
LEFT JOIN student_recital_fees srf ON s.id = srf.student_id
LEFT JOIN tuition_invoices ti ON s.id = ti.student_id
LEFT JOIN enrollments e ON s.id = e.student_id
LEFT JOIN enrollment_requests er ON s.id = er.student_id

GROUP BY g.id, g.user_id, g.first_name, g.last_name, g.email;

GRANT SELECT ON analytics_parent_activity TO authenticated;

-- ============================================================================
-- 8. DAILY REVENUE DASHBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_daily_revenue AS
SELECT
  DATE(transaction_date) as revenue_date,
  order_type,
  payment_status,
  COUNT(*) as transaction_count,
  SUM(amount_in_cents) as total_amount_cents,

  -- Running totals
  SUM(SUM(amount_in_cents)) OVER (
    PARTITION BY order_type
    ORDER BY DATE(transaction_date)
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as running_total_cents

FROM payment_transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(transaction_date), order_type, payment_status
ORDER BY revenue_date DESC, order_type;

GRANT SELECT ON analytics_daily_revenue TO authenticated;

-- ============================================================================
-- 9. REFUND ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_refund_summary AS
SELECT
  DATE_TRUNC('month', r.created_at) as month,
  pt.order_type,
  r.refund_type,
  r.refund_status,

  COUNT(*) as refund_count,
  SUM(r.refund_amount_in_cents) as total_refunded_cents,
  AVG(r.refund_amount_in_cents) as avg_refund_cents,

  -- Approval metrics
  COUNT(*) FILTER (WHERE r.refund_status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE r.refund_status = 'failed') as failed_count,
  AVG(EXTRACT(EPOCH FROM (r.approved_at - r.created_at)) / 86400) FILTER (WHERE r.approved_at IS NOT NULL) as avg_approval_time_days

FROM refunds r
JOIN payment_transactions pt ON r.payment_transaction_id = pt.id
GROUP BY DATE_TRUNC('month', r.created_at), pt.order_type, r.refund_type, r.refund_status;

GRANT SELECT ON analytics_refund_summary TO authenticated;

-- ============================================================================
-- 10. STUDIO CREDIT USAGE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW analytics_studio_credit_usage AS
SELECT
  DATE_TRUNC('month', sct.created_at) as month,
  sct.transaction_type,

  COUNT(*) as transaction_count,
  SUM(sct.amount_in_cents) as total_amount_cents,

  -- Active credit balances
  (SELECT SUM(available_credit_in_cents) FROM studio_credits WHERE is_active = true) as total_active_credits_cents,
  (SELECT COUNT(*) FROM studio_credits WHERE is_active = true AND available_credit_in_cents > 0) as accounts_with_balance

FROM studio_credit_transactions sct
GROUP BY DATE_TRUNC('month', sct.created_at), sct.transaction_type;

GRANT SELECT ON analytics_studio_credit_usage TO authenticated;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON VIEW analytics_payment_summary IS 'Unified view of all payment transactions across payment types';
COMMENT ON VIEW analytics_revenue_by_type IS 'Revenue aggregated by payment type and time period';
COMMENT ON VIEW analytics_outstanding_balances IS 'Outstanding balances per student/guardian across all payment types';
COMMENT ON VIEW analytics_payment_method_usage IS 'Payment method usage statistics and success rates';
COMMENT ON VIEW analytics_enrollment_stats IS 'Class enrollment and attendance statistics';
COMMENT ON VIEW analytics_recital_revenue IS 'Recital-specific revenue from fees and ticket sales';
COMMENT ON VIEW analytics_parent_activity IS 'Parent portal activity and engagement metrics';
COMMENT ON VIEW analytics_daily_revenue IS 'Daily revenue trends with running totals';
COMMENT ON VIEW analytics_refund_summary IS 'Refund analytics and processing metrics';
COMMENT ON VIEW analytics_studio_credit_usage IS 'Studio credit issuance and usage tracking';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Benefits of using VIEWS instead of duplicate tables:
-- 1. ✅ Single source of truth - data comes from existing payment tables
-- 2. ✅ Real-time analytics - no sync lag
-- 3. ✅ No data duplication - reduced storage and complexity
-- 4. ✅ Automatic updates - views reflect latest data instantly
-- 5. ✅ Easier to maintain - update source tables, views adapt automatically
-- 6. ✅ Better data integrity - impossible to have conflicting data
-- 7. ✅ Flexible - can create new views without migrating data
