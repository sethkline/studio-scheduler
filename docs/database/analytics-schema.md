# Analytics Database Schema Documentation

## Overview

This document describes the database schema additions for the Analytics & Reporting Dashboard feature (Story 4.1). These additions enable comprehensive financial tracking, attendance monitoring, and business intelligence reporting.

## Migration Instructions

### Running the Migration

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `analytics-schema.sql`
4. Execute the SQL script
5. Verify all tables and views were created successfully

### Verification Queries

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('payments', 'invoices', 'invoice_items', 'attendance_records');

-- Check if views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'v_%';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('payments', 'invoices', 'invoice_items', 'attendance_records');
```

## Schema Details

### Tables

#### 1. `payments`

Tracks all payment transactions across the studio.

**Purpose:** Centralized payment tracking for revenue analytics, refund management, and financial reporting.

**Key Fields:**
- `amount_in_cents` - Payment amount (in cents for precision)
- `payment_method` - Payment type: 'stripe', 'cash', 'check', 'bank_transfer'
- `payment_status` - Status: 'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
- `order_id` - Links to ticket orders (nullable)
- `invoice_id` - Links to tuition invoices (nullable)
- `refund_amount_in_cents` - Partial or full refund amount

**Indexes:**
- `payment_status` - Fast status filtering
- `payment_date` - Date range queries
- `order_id`, `invoice_id` - Foreign key lookups
- `created_at` - Chronological sorting

**Usage Examples:**
```sql
-- Get total revenue for current month
SELECT SUM(amount_in_cents - refund_amount_in_cents) / 100.0 AS net_revenue
FROM payments
WHERE payment_status = 'completed'
AND payment_date >= DATE_TRUNC('month', CURRENT_DATE);

-- Revenue breakdown by payment method
SELECT
  payment_method,
  COUNT(*) AS transaction_count,
  SUM(amount_in_cents) / 100.0 AS total_amount
FROM payments
WHERE payment_status = 'completed'
AND payment_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY payment_method;
```

---

#### 2. `invoices`

Tuition invoices sent to guardians for class enrollment fees.

**Purpose:** Track outstanding revenue, payment status, and automate overdue invoice detection.

**Key Fields:**
- `invoice_number` - Unique identifier (e.g., "INV-2025-0001")
- `total_amount_in_cents` - Total invoice amount
- `amount_paid_in_cents` - Amount paid so far
- `status` - Status: 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'
- `due_date` - Payment due date
- `student_id`, `guardian_id` - Links to student and guardian

**Automatic Behaviors:**
- Status auto-updates to 'paid' when `amount_paid_in_cents >= total_amount_in_cents`
- Status auto-updates to 'overdue' when `due_date < CURRENT_DATE` and status is 'sent'
- `paid_date` auto-sets when status becomes 'paid'

**Usage Examples:**
```sql
-- Outstanding revenue
SELECT SUM(total_amount_in_cents - amount_paid_in_cents) / 100.0 AS outstanding
FROM invoices
WHERE status IN ('sent', 'partially_paid', 'overdue');

-- Overdue invoices
SELECT
  invoice_number,
  student_id,
  total_amount_in_cents / 100.0 AS amount,
  due_date,
  CURRENT_DATE - due_date AS days_overdue
FROM invoices
WHERE status = 'overdue'
ORDER BY due_date ASC;
```

---

#### 3. `invoice_items`

Line items for invoices (tuition, fees, merchandise).

**Purpose:** Itemized billing with automatic total calculation.

**Key Fields:**
- `description` - Item description (e.g., "Ballet Beginner - Fall 2025")
- `item_type` - Type: 'tuition', 'registration_fee', 'costume', 'merchandise', 'late_fee', 'other'
- `quantity` - Number of items
- `unit_price_in_cents` - Price per item
- `total_price_in_cents` - Auto-calculated (quantity × unit_price)
- `class_instance_id` - Links to specific class (nullable)

**Automatic Behaviors:**
- `total_price_in_cents` auto-calculates on insert/update
- Invoice `total_amount_in_cents` auto-updates when items change

**Usage Examples:**
```sql
-- Revenue by item type
SELECT
  item_type,
  COUNT(*) AS item_count,
  SUM(total_price_in_cents) / 100.0 AS total_revenue
FROM invoice_items
WHERE created_at >= '2025-01-01'
GROUP BY item_type;

-- Top revenue-generating classes
SELECT
  cd.name AS class_name,
  COUNT(ii.id) AS enrollments,
  SUM(ii.total_price_in_cents) / 100.0 AS revenue
FROM invoice_items ii
JOIN class_instances ci ON ii.class_instance_id = ci.id
JOIN class_definitions cd ON ci.class_definition_id = cd.id
WHERE ii.item_type = 'tuition'
GROUP BY cd.name
ORDER BY revenue DESC
LIMIT 10;
```

---

#### 4. `attendance_records`

Student attendance tracking for classes.

**Purpose:** Monitor attendance rates, identify at-risk students, and measure class engagement.

**Key Fields:**
- `student_id` - Student who attended/missed
- `class_instance_id` - Which class
- `attendance_date` - Date of the class
- `status` - Status: 'present', 'absent', 'excused', 'tardy', 'left_early'
- `check_in_time`, `check_out_time` - Optional time tracking
- `notes` - Attendance notes (e.g., reason for absence)
- `recorded_by` - Staff/teacher who recorded attendance

**Constraints:**
- Unique constraint on (student_id, class_instance_id, attendance_date) - prevents duplicates

**Usage Examples:**
```sql
-- Attendance rate for a specific student
SELECT
  s.first_name || ' ' || s.last_name AS student_name,
  COUNT(*) AS total_records,
  SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 2) AS attendance_rate
FROM attendance_records ar
JOIN students s ON ar.student_id = s.id
WHERE ar.student_id = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY s.first_name, s.last_name;

-- Students with low attendance (< 75%)
SELECT
  s.id,
  s.first_name || ' ' || s.last_name AS student_name,
  COUNT(*) AS classes,
  SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended,
  ROUND(100.0 * SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate
FROM students s
JOIN attendance_records ar ON ar.student_id = s.id
WHERE ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.first_name, s.last_name
HAVING COUNT(*) > 0
AND ROUND(100.0 * SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 2) < 75
ORDER BY rate ASC;
```

---

### Views

#### 1. `v_revenue_summary`

Aggregated revenue metrics by month, payment method, and status.

**Usage:**
```sql
-- Monthly revenue trend
SELECT
  month,
  SUM(net_revenue_cents) / 100.0 AS net_revenue
FROM v_revenue_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY month
ORDER BY month;
```

---

#### 2. `v_enrollment_summary`

Enrollment trends over time by dance style and class level.

**Usage:**
```sql
-- Enrollment by dance style
SELECT
  dance_style,
  SUM(enrollment_count) AS total_enrollments,
  SUM(unique_students) AS unique_students
FROM v_enrollment_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY dance_style
ORDER BY total_enrollments DESC;
```

---

#### 3. `v_attendance_summary`

Monthly attendance metrics and rates.

**Usage:**
```sql
-- Attendance trend
SELECT
  month,
  attendance_rate,
  present_count,
  absent_count
FROM v_attendance_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
ORDER BY month;
```

---

#### 4. `v_class_performance`

Class capacity utilization and attendance rates.

**Usage:**
```sql
-- Underperforming classes (< 50% capacity)
SELECT
  class_name,
  dance_style,
  teacher_name,
  enrolled_students,
  max_students,
  capacity_utilization
FROM v_class_performance
WHERE capacity_utilization < 50
ORDER BY capacity_utilization ASC;

-- Classes with low attendance
SELECT
  class_name,
  enrolled_students,
  attendance_rate
FROM v_class_performance
WHERE attendance_rate IS NOT NULL
AND attendance_rate < 75
ORDER BY attendance_rate ASC;
```

---

#### 5. `v_teacher_workload`

Teacher workload distribution and student load.

**Usage:**
```sql
-- Teacher workload comparison
SELECT
  teacher_name,
  classes_taught,
  total_teaching_minutes / 60.0 AS teaching_hours,
  total_students,
  avg_class_size
FROM v_teacher_workload
ORDER BY total_teaching_minutes DESC;

-- Identify overworked or underutilized teachers
SELECT
  teacher_name,
  classes_taught,
  total_teaching_minutes / 60.0 AS teaching_hours,
  CASE
    WHEN total_teaching_minutes > 1200 THEN 'Overworked (>20 hrs/week)'
    WHEN total_teaching_minutes < 300 THEN 'Underutilized (<5 hrs/week)'
    ELSE 'Balanced'
  END AS workload_status
FROM v_teacher_workload
ORDER BY total_teaching_minutes DESC;
```

---

## Row-Level Security (RLS)

All tables have RLS enabled with role-based access policies:

### Admin & Staff
- **Full access** to all tables (SELECT, INSERT, UPDATE, DELETE)

### Teachers
- **View** attendance for their own classes
- **Manage** attendance records for their classes

### Parents
- **View** their own invoices, payments, and invoice items
- **View** their children's attendance records

### Students
- No direct access (access through parent account)

---

## Data Population

### Sample Data for Testing

```sql
-- Create a sample invoice
INSERT INTO invoices (student_id, guardian_id, invoice_number, total_amount_in_cents, due_date, issue_date, status)
VALUES (
  'student-uuid',
  'guardian-uuid',
  'INV-2025-0001',
  15000, -- $150.00
  '2025-12-01',
  '2025-11-01',
  'sent'
);

-- Add invoice items
INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price_in_cents)
VALUES
  ('invoice-uuid', 'Ballet Beginner - Fall 2025', 'tuition', 1, 12000),
  ('invoice-uuid', 'Registration Fee', 'registration_fee', 1, 3000);

-- Record a payment
INSERT INTO payments (invoice_id, amount_in_cents, payment_method, payment_status, payment_date)
VALUES
  ('invoice-uuid', 7500, 'stripe', 'completed', NOW());

-- Record attendance
INSERT INTO attendance_records (student_id, class_instance_id, attendance_date, status)
VALUES
  ('student-uuid', 'class-instance-uuid', '2025-11-05', 'present');
```

---

## Analytics Query Examples

### Revenue Analytics

```sql
-- Total revenue by month for the past year
SELECT
  DATE_TRUNC('month', payment_date) AS month,
  SUM(amount_in_cents - refund_amount_in_cents) / 100.0 AS net_revenue,
  COUNT(*) AS transaction_count
FROM payments
WHERE payment_status = 'completed'
AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month;

-- Revenue breakdown by source
SELECT
  CASE
    WHEN order_id IS NOT NULL THEN 'Ticket Sales'
    WHEN invoice_id IS NOT NULL THEN 'Tuition'
    ELSE 'Other'
  END AS revenue_source,
  SUM(amount_in_cents - refund_amount_in_cents) / 100.0 AS net_revenue
FROM payments
WHERE payment_status = 'completed'
GROUP BY revenue_source;
```

### Enrollment Analytics

```sql
-- Monthly enrollment trend
SELECT
  DATE_TRUNC('month', enrollment_date) AS month,
  COUNT(*) AS new_enrollments
FROM enrollments
WHERE status = 'active'
AND enrollment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', enrollment_date)
ORDER BY month;

-- Enrollment by dance style
SELECT
  ds.name AS dance_style,
  COUNT(e.id) AS enrollment_count,
  COUNT(DISTINCT e.student_id) AS unique_students
FROM enrollments e
JOIN class_instances ci ON e.class_instance_id = ci.id
JOIN class_definitions cd ON ci.class_definition_id = cd.id
JOIN dance_styles ds ON cd.dance_style_id = ds.id
WHERE e.status = 'active'
GROUP BY ds.name
ORDER BY enrollment_count DESC;
```

### Retention Analytics

```sql
-- Student retention rate (students who re-enrolled next term)
WITH term_enrollments AS (
  SELECT
    e.student_id,
    s.name AS term_name,
    s.start_date,
    s.end_date
  FROM enrollments e
  JOIN class_instances ci ON e.class_instance_id = ci.id
  JOIN schedule_classes sc ON sc.class_instance_id = ci.id
  JOIN schedules s ON sc.schedule_id = s.id
  WHERE e.status = 'active'
  GROUP BY e.student_id, s.name, s.start_date, s.end_date
)
SELECT
  t1.term_name AS current_term,
  COUNT(DISTINCT t1.student_id) AS students_current_term,
  COUNT(DISTINCT t2.student_id) AS students_next_term,
  ROUND(100.0 * COUNT(DISTINCT t2.student_id) / COUNT(DISTINCT t1.student_id), 2) AS retention_rate
FROM term_enrollments t1
LEFT JOIN term_enrollments t2 ON t1.student_id = t2.student_id
  AND t2.start_date > t1.end_date
  AND t2.start_date <= t1.end_date + INTERVAL '30 days'
GROUP BY t1.term_name, t1.start_date
ORDER BY t1.start_date DESC;
```

---

## Maintenance

### Indexes

All tables have appropriate indexes for common query patterns. Monitor query performance and add additional indexes as needed:

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('payments', 'invoices', 'invoice_items', 'attendance_records')
ORDER BY idx_scan DESC;
```

### Data Archival

Consider archiving old records to maintain performance:

```sql
-- Archive payments older than 7 years
-- (Consult with accountant for retention requirements)
CREATE TABLE IF NOT EXISTS payments_archive (LIKE payments INCLUDING ALL);

INSERT INTO payments_archive
SELECT * FROM payments
WHERE payment_date < CURRENT_DATE - INTERVAL '7 years';

DELETE FROM payments
WHERE payment_date < CURRENT_DATE - INTERVAL '7 years';
```

---

## Troubleshooting

### Common Issues

**Issue:** Invoice total not updating
- **Cause:** Trigger not firing on invoice_items changes
- **Solution:** Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'invoice_total_update_trigger';`

**Issue:** RLS preventing admin access
- **Cause:** User role not set correctly in profiles table
- **Solution:** Verify user_role: `SELECT id, email, user_role FROM profiles WHERE id = auth.uid();`

**Issue:** Duplicate attendance records
- **Cause:** Trying to insert same student/class/date combination
- **Solution:** Use UPSERT pattern with ON CONFLICT

```sql
INSERT INTO attendance_records (student_id, class_instance_id, attendance_date, status)
VALUES ('student-uuid', 'class-uuid', '2025-11-06', 'present')
ON CONFLICT (student_id, class_instance_id, attendance_date)
DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
```

---

## Next Steps

After running this migration:

1. ✅ Verify all tables and views created successfully
2. ✅ Test RLS policies with different user roles
3. ✅ Populate with sample data for development
4. ✅ Build API endpoints for analytics queries
5. ✅ Create frontend components to visualize data
6. ✅ Add export functionality (CSV, Excel, PDF)

See `/docs/api/analytics-endpoints.md` for API endpoint documentation (to be created).
