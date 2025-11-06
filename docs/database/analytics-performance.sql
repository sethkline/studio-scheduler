-- Analytics Performance Optimization Migration
-- This migration adds critical indexes for analytics query performance
-- Run this AFTER analytics-schema.sql
-- Date: 2025-11-06

-- ============================================================================
-- PERFORMANCE INDEXES FOR EXISTING TABLES
-- ============================================================================

-- Enrollments table indexes (CRITICAL for analytics performance)
-- These indexes significantly improve analytics query speed

-- Status-based queries (filter by active/inactive enrollments)
CREATE INDEX IF NOT EXISTS idx_enrollments_status
  ON enrollments(status);

-- Student-based enrollment queries (student retention, history)
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status
  ON enrollments(student_id, status);

-- Class-based enrollment queries (class capacity, utilization)
CREATE INDEX IF NOT EXISTS idx_enrollments_class_status
  ON enrollments(class_instance_id, status);

-- Date-based enrollment trends
CREATE INDEX IF NOT EXISTS idx_enrollments_date
  ON enrollments(enrollment_date);

-- Combined index for common enrollment analytics queries
CREATE INDEX IF NOT EXISTS idx_enrollments_analytics
  ON enrollments(enrollment_date, status, student_id);

-- Ticket Orders table indexes (for revenue analytics)
-- Order date for revenue trends
CREATE INDEX IF NOT EXISTS idx_ticket_orders_date
  ON ticket_orders(order_date);

-- Payment status for revenue calculations
CREATE INDEX IF NOT EXISTS idx_ticket_orders_status
  ON ticket_orders(payment_status);

-- Combined index for revenue analytics
CREATE INDEX IF NOT EXISTS idx_ticket_orders_analytics
  ON ticket_orders(order_date, payment_status);

-- Students table indexes (for student analytics)
-- Status for active student counts
CREATE INDEX IF NOT EXISTS idx_students_status
  ON students(status);

-- Created date for student acquisition trends
CREATE INDEX IF NOT EXISTS idx_students_created
  ON students(created_at);

-- Class Instances table indexes (for class performance analytics)
-- Status for active class queries
CREATE INDEX IF NOT EXISTS idx_class_instances_status
  ON class_instances(status);

-- Teacher for teacher workload analytics
CREATE INDEX IF NOT EXISTS idx_class_instances_teacher
  ON class_instances(teacher_id, status);

-- Teachers table indexes
-- Index for teacher lookups
CREATE INDEX IF NOT EXISTS idx_teachers_name
  ON teachers(last_name, first_name);

-- Schedule Classes table indexes (for time slot analytics)
-- Schedule for term-based queries
CREATE INDEX IF NOT EXISTS idx_schedule_classes_schedule
  ON schedule_classes(schedule_id);

-- Day and time for popular time slot analysis
CREATE INDEX IF NOT EXISTS idx_schedule_classes_time
  ON schedule_classes(day_of_week, start_time);

-- ============================================================================
-- MATERIALIZED VIEWS FOR DAILY AGGREGATES
-- ============================================================================

-- Daily enrollment statistics
-- Refreshed once per day for fast dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_enrollment_stats AS
SELECT
  DATE(enrollment_date) as date,
  COUNT(*) as total_enrollments,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(*) FILTER (WHERE status = 'active') as active_enrollments,
  COUNT(*) FILTER (WHERE status IN ('withdrawn', 'cancelled', 'inactive')) as churned_enrollments
FROM enrollments
WHERE enrollment_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE(enrollment_date)
ORDER BY date DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_enrollment_stats_date
  ON mv_daily_enrollment_stats(date);

-- Daily revenue statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue_stats AS
SELECT
  DATE(payment_date) as date,
  COUNT(*) as transaction_count,
  SUM(amount_in_cents) as total_revenue_cents,
  SUM(refund_amount_in_cents) as total_refunds_cents,
  SUM(amount_in_cents - refund_amount_in_cents) as net_revenue_cents,
  COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE payment_status = 'refunded') as refunded_count
FROM payments
WHERE payment_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE(payment_date)
ORDER BY date DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_stats_date
  ON mv_daily_revenue_stats(date);

-- Monthly enrollment summary (for faster trend queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_enrollment_summary AS
SELECT
  DATE_TRUNC('month', enrollment_date) as month,
  COUNT(*) as total_enrollments,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(*) FILTER (WHERE status = 'active') as active_enrollments
FROM enrollments
WHERE enrollment_date >= CURRENT_DATE - INTERVAL '3 years'
GROUP BY DATE_TRUNC('month', enrollment_date)
ORDER BY month DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_enrollment_summary_month
  ON mv_monthly_enrollment_summary(month);

-- Class capacity utilization snapshot
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_capacity_current AS
SELECT
  ci.id as class_instance_id,
  cd.name as class_name,
  ds.name as dance_style,
  cl.name as class_level,
  cd.max_students,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as enrolled_students,
  ROUND(100.0 * COUNT(e.id) FILTER (WHERE e.status = 'active') / NULLIF(cd.max_students, 0), 2) as utilization_percent
FROM class_instances ci
LEFT JOIN class_definitions cd ON ci.class_definition_id = cd.id
LEFT JOIN dance_styles ds ON cd.dance_style_id = ds.id
LEFT JOIN class_levels cl ON cd.class_level_id = cl.id
LEFT JOIN enrollments e ON e.class_instance_id = ci.id
WHERE ci.status = 'active'
GROUP BY ci.id, cd.name, ds.name, cl.name, cd.max_students
ORDER BY utilization_percent DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_class_capacity_current_id
  ON mv_class_capacity_current(class_instance_id);

-- ============================================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_enrollment_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_enrollment_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_capacity_current;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_analytics_materialized_views() TO authenticated;

-- ============================================================================
-- SCHEDULED REFRESH (Optional - requires pg_cron extension)
-- ============================================================================

-- Uncomment if pg_cron extension is available:
--
-- -- Refresh materialized views daily at 2 AM
-- SELECT cron.schedule(
--   'refresh-analytics-views',
--   '0 2 * * *', -- Daily at 2 AM
--   $$ SELECT refresh_analytics_materialized_views(); $$
-- );

-- ============================================================================
-- QUERY PERFORMANCE TESTING
-- ============================================================================

-- Test query performance with EXPLAIN ANALYZE:
--
-- EXPLAIN ANALYZE
-- SELECT DATE(enrollment_date) as date, COUNT(*) as enrollments
-- FROM enrollments
-- WHERE enrollment_date >= CURRENT_DATE - INTERVAL '12 months'
-- AND status = 'active'
-- GROUP BY DATE(enrollment_date);
--
-- Expected: Should use idx_enrollments_analytics index
-- Look for "Index Scan" or "Bitmap Index Scan" in output

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Run VACUUM ANALYZE to update statistics for query planner
VACUUM ANALYZE enrollments;
VACUUM ANALYZE ticket_orders;
VACUUM ANALYZE students;
VACUUM ANALYZE class_instances;
VACUUM ANALYZE payments;
VACUUM ANALYZE invoices;
VACUUM ANALYZE attendance_records;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_enrollments_status IS 'Performance index for filtering enrollments by status';
COMMENT ON INDEX idx_enrollments_student_status IS 'Performance index for student enrollment history queries';
COMMENT ON INDEX idx_enrollments_class_status IS 'Performance index for class capacity queries';
COMMENT ON INDEX idx_enrollments_date IS 'Performance index for enrollment trend queries';
COMMENT ON INDEX idx_enrollments_analytics IS 'Composite index for common analytics queries';

COMMENT ON MATERIALIZED VIEW mv_daily_enrollment_stats IS 'Pre-calculated daily enrollment statistics for fast dashboard loading';
COMMENT ON MATERIALIZED VIEW mv_daily_revenue_stats IS 'Pre-calculated daily revenue statistics for fast dashboard loading';
COMMENT ON MATERIALIZED VIEW mv_monthly_enrollment_summary IS 'Pre-calculated monthly enrollment summary for trend charts';
COMMENT ON MATERIALIZED VIEW mv_class_capacity_current IS 'Current class capacity utilization snapshot';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created:
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND (tablename IN ('enrollments', 'ticket_orders', 'students', 'class_instances')
--      OR tablename LIKE 'mv_%')
-- ORDER BY tablename, indexname;

-- Check materialized view sizes:
-- SELECT
--   schemaname,
--   matviewname,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
-- FROM pg_matviews
-- WHERE schemaname = 'public'
-- ORDER BY matviewname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- After running this migration:
-- 1. Verify all indexes created successfully
-- 2. Test query performance with EXPLAIN ANALYZE
-- 3. Set up daily refresh of materialized views (cron or manual)
-- 4. Monitor query performance in production
-- 5. Add caching layer in application code
