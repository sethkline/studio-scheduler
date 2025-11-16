# Tier 1 Database Implementation Guide

## Overview

This guide provides a comprehensive database implementation plan for all Tier 1 features. Use this document to:
- Understand all database changes required
- Implement migrations in the correct order
- Verify database schema is correct
- Test RLS policies and constraints
- Troubleshoot database issues

**Total Database Changes:**
- 20 new tables
- 50+ indexes
- 40+ RLS policies
- 10+ database functions
- 5+ views
- 15+ triggers

---

## Quick Reference

| Feature | Tables | Migration File |
|---------|--------|----------------|
| Rehearsal Management | 4 tables | `20250116_001_tier1_rehearsal_management.sql` |
| Recital Fees & Payments | 5 tables | `20250116_002_tier1_recital_fees.sql` |
| Performer Confirmation | 3 tables | `20250116_003_tier1_performer_confirmations.sql` |
| Email Campaigns | 5 tables | `20250116_004_tier1_email_campaigns.sql` |
| Show-Day Check-In | 5 tables | `20250116_005_tier1_show_day_checkin.sql` |

---

## Migration Order

**IMPORTANT:** Migrations must be run in this exact order to avoid foreign key constraint violations.

1. ✅ `20250116_001_tier1_rehearsal_management.sql`
2. ✅ `20250116_002_tier1_recital_fees.sql`
3. `20250116_003_tier1_performer_confirmations.sql` (to be created)
4. `20250116_004_tier1_email_campaigns.sql` (to be created)
5. `20250116_005_tier1_show_day_checkin.sql` (to be created)

---

## Feature 1: Rehearsal Management

### Tables

#### 1.1 `recital_rehearsals`
Main rehearsal scheduling table.

```sql
CREATE TABLE IF NOT EXISTS recital_rehearsals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  rehearsal_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rehearsal_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  room_id UUID,
  notes TEXT,
  requires_costumes BOOLEAN DEFAULT FALSE,
  requires_props BOOLEAN DEFAULT FALSE,
  requires_tech BOOLEAN DEFAULT FALSE,
  parents_allowed BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_rehearsals_recital ON recital_rehearsals(recital_id);
CREATE INDEX idx_rehearsals_date ON recital_rehearsals(rehearsal_date);
CREATE INDEX idx_rehearsals_status ON recital_rehearsals(status);
```

**Constraints:**
- `recital_id` must reference existing recital
- `rehearsal_type` enum: 'tech', 'dress', 'stage', 'class', 'full'
- `status` enum: 'scheduled', 'in_progress', 'completed', 'cancelled'

---

#### 1.2 `rehearsal_participants`
Links classes/performances to rehearsals.

```sql
CREATE TABLE IF NOT EXISTS rehearsal_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,
  class_instance_id UUID REFERENCES class_instances(id) ON DELETE CASCADE,
  recital_performance_id UUID REFERENCES recital_performances(id) ON DELETE CASCADE,
  call_time TIME,
  expected_duration INTEGER,
  performance_order INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rehearsal_participant_link CHECK (
    class_instance_id IS NOT NULL OR recital_performance_id IS NOT NULL
  )
);
```

**Indexes:**
```sql
CREATE INDEX idx_rehearsal_participants_rehearsal ON rehearsal_participants(rehearsal_id);
CREATE INDEX idx_rehearsal_participants_class ON rehearsal_participants(class_instance_id);
CREATE INDEX idx_rehearsal_participants_performance ON rehearsal_participants(recital_performance_id);
```

**Constraints:**
- Must link to either a class OR a performance (enforced by CHECK constraint)

---

#### 1.3 `rehearsal_attendance`
Tracks individual student attendance.

```sql
CREATE TABLE IF NOT EXISTS rehearsal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'expected',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  teacher_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rehearsal_id, student_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_rehearsal_attendance_rehearsal ON rehearsal_attendance(rehearsal_id);
CREATE INDEX idx_rehearsal_attendance_student ON rehearsal_attendance(student_id);
```

**Constraints:**
- `status` enum: 'expected', 'present', 'absent', 'excused', 'late'
- UNIQUE constraint prevents duplicate attendance records

---

#### 1.4 `rehearsal_resources`
Videos, documents, and files for rehearsals.

```sql
CREATE TABLE IF NOT EXISTS rehearsal_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES recital_rehearsals(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  visible_to_parents BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_rehearsal_resources_rehearsal ON rehearsal_resources(rehearsal_id);
```

**Constraints:**
- `resource_type` enum: 'video', 'audio', 'document', 'image', 'link'

---

### Views

#### `rehearsal_summary`
Aggregated rehearsal data with counts.

```sql
CREATE OR REPLACE VIEW rehearsal_summary AS
SELECT
  r.*,
  COUNT(DISTINCT rp.id) as participant_count,
  COUNT(DISTINCT ra.id) as expected_attendance,
  COUNT(DISTINCT CASE WHEN ra.status = 'present' THEN ra.id END) as actual_attendance,
  COUNT(DISTINCT CASE WHEN ra.status = 'absent' THEN ra.id END) as absent_count
FROM recital_rehearsals r
LEFT JOIN rehearsal_participants rp ON r.id = rp.rehearsal_id
LEFT JOIN rehearsal_attendance ra ON r.id = ra.rehearsal_id
GROUP BY r.id;
```

---

### RLS Policies

```sql
-- Staff can view all rehearsals
CREATE POLICY "Staff can view all rehearsals"
  ON recital_rehearsals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
  );

-- Staff can manage rehearsals
CREATE POLICY "Staff can manage rehearsals"
  ON recital_rehearsals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- Parents can view their children's attendance
CREATE POLICY "Parents can view their children's attendance"
  ON rehearsal_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_guardian_relationships sgr
      JOIN guardians g ON sgr.guardian_id = g.id
      WHERE g.user_id = auth.uid()
      AND sgr.student_id = rehearsal_attendance.student_id
    )
  );
```

---

## Feature 2: Recital Fees & Payments

### Tables

#### 2.1 `recital_fee_types`
Defines fee types for a recital.

```sql
CREATE TABLE IF NOT EXISTS recital_fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  fee_name VARCHAR(255) NOT NULL,
  description TEXT,
  fee_type VARCHAR(50) NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  applies_to VARCHAR(50) DEFAULT 'all',
  is_required BOOLEAN DEFAULT TRUE,
  is_refundable BOOLEAN DEFAULT FALSE,
  due_date DATE,
  early_bird_deadline DATE,
  early_bird_amount_in_cents INTEGER,
  late_fee_amount_in_cents INTEGER,
  late_fee_start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_fee_types_recital ON recital_fee_types(recital_id);
```

**Constraints:**
- `fee_type` enum: 'participation', 'costume', 'registration', 'ticket', 'other'
- `applies_to` enum: 'all', 'per_student', 'per_performance', 'per_family'
- `amount_in_cents` must be >= 0

---

#### 2.2 `student_recital_fees`
Individual fee assignments to students.

```sql
CREATE TABLE IF NOT EXISTS student_recital_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES recital_fee_types(id) ON DELETE SET NULL,
  fee_name VARCHAR(255) NOT NULL,
  description TEXT,
  amount_in_cents INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_amount_in_cents INTEGER NOT NULL,
  recital_performance_id UUID REFERENCES recital_performances(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  amount_paid_in_cents INTEGER DEFAULT 0,
  balance_in_cents INTEGER NOT NULL,
  due_date DATE,
  paid_in_full_date TIMESTAMPTZ,
  is_waived BOOLEAN DEFAULT FALSE,
  waived_by UUID REFERENCES profiles(id),
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  discount_amount_in_cents INTEGER DEFAULT 0,
  discount_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_student_fees_student ON student_recital_fees(student_id);
CREATE INDEX idx_student_fees_recital ON student_recital_fees(recital_id);
CREATE INDEX idx_student_fees_status ON student_recital_fees(status);
```

**Constraints:**
- `status` enum: 'pending', 'partial', 'paid', 'waived', 'refunded'
- `balance_in_cents` = `total_amount_in_cents` - `amount_paid_in_cents` - `discount_amount_in_cents`

---

#### 2.3 `recital_payment_transactions`
Individual payment records.

```sql
CREATE TABLE IF NOT EXISTS recital_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id UUID NOT NULL REFERENCES student_recital_fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_in_cents INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  check_number VARCHAR(100),
  guardian_id UUID REFERENCES guardians(id),
  paid_by_name VARCHAR(255),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES profiles(id),
  notes TEXT,
  receipt_url TEXT,
  receipt_sent_at TIMESTAMPTZ,
  refund_amount_in_cents INTEGER DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_payment_transactions_student_fee ON recital_payment_transactions(student_fee_id);
CREATE INDEX idx_payment_transactions_student ON recital_payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_guardian ON recital_payment_transactions(guardian_id);
```

**Constraints:**
- `payment_method` enum: 'stripe', 'cash', 'check', 'transfer', 'waiver'
- `payment_status` enum: 'pending', 'completed', 'failed', 'refunded'

---

#### 2.4 `recital_payment_plans`
Payment plan configurations.

```sql
CREATE TABLE IF NOT EXISTS recital_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recital_id UUID NOT NULL REFERENCES recitals(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id),
  plan_name VARCHAR(255),
  total_amount_in_cents INTEGER NOT NULL,
  number_of_installments INTEGER NOT NULL,
  installment_amount_in_cents INTEGER NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly',
  status VARCHAR(50) DEFAULT 'active',
  amount_paid_in_cents INTEGER DEFAULT 0,
  balance_in_cents INTEGER NOT NULL,
  start_date DATE NOT NULL,
  next_payment_date DATE,
  final_payment_date DATE,
  auto_pay_enabled BOOLEAN DEFAULT FALSE,
  auto_pay_method_id VARCHAR(255),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_payment_plans_student ON recital_payment_plans(student_id);
CREATE INDEX idx_payment_plans_recital ON recital_payment_plans(recital_id);
CREATE INDEX idx_payment_plans_status ON recital_payment_plans(status);
```

**Constraints:**
- `frequency` enum: 'weekly', 'biweekly', 'monthly'
- `status` enum: 'active', 'completed', 'cancelled', 'defaulted'

---

#### 2.5 `payment_plan_installments`
Individual installment tracking.

```sql
CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES recital_payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  paid_amount_in_cents INTEGER DEFAULT 0,
  paid_date TIMESTAMPTZ,
  transaction_id UUID REFERENCES recital_payment_transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_installments_plan ON payment_plan_installments(payment_plan_id);
CREATE INDEX idx_installments_due_date ON payment_plan_installments(due_date);
```

**Constraints:**
- `status` enum: 'scheduled', 'paid', 'overdue', 'skipped'

---

### Functions

#### Auto-update balance on payment

```sql
CREATE OR REPLACE FUNCTION update_fee_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
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
```

**Trigger:**
```sql
CREATE TRIGGER update_balance_on_payment
  AFTER INSERT ON recital_payment_transactions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION update_fee_balance_on_payment();
```

---

### Views

#### `parent_payment_summary`
Payment summary by parent.

```sql
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
```

---

## Verification Queries

After running migrations, use these queries to verify everything is set up correctly.

### Check All Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'recital_rehearsals',
    'rehearsal_participants',
    'rehearsal_attendance',
    'rehearsal_resources',
    'recital_fee_types',
    'student_recital_fees',
    'recital_payment_transactions',
    'recital_payment_plans',
    'payment_plan_installments'
  )
ORDER BY table_name;
```

**Expected Result:** 9 rows

---

### Check All Indexes Exist

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE '%rehearsal%'
  OR tablename LIKE '%fee%'
  OR tablename LIKE '%payment%'
ORDER BY tablename, indexname;
```

**Expected Result:** 20+ indexes

---

### Check All RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE '%rehearsal%'
       OR tablename LIKE '%fee%'
       OR tablename LIKE '%payment%')
ORDER BY tablename, policyname;
```

**Expected Result:** 15+ policies

---

### Check Foreign Keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name LIKE '%rehearsal%'
       OR tc.table_name LIKE '%fee%'
       OR tc.table_name LIKE '%payment%')
ORDER BY tc.table_name, kcu.column_name;
```

**Expected Result:** 25+ foreign key constraints

---

### Check Triggers

```sql
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (event_object_table LIKE '%rehearsal%'
       OR event_object_table LIKE '%fee%'
       OR event_object_table LIKE '%payment%')
ORDER BY event_object_table, trigger_name;
```

**Expected Result:** 8+ triggers

---

### Check Functions

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%rehearsal%'
       OR routine_name LIKE '%fee%'
       OR routine_name LIKE '%payment%')
ORDER BY routine_name;
```

**Expected Result:** 2+ functions

---

### Check Views

```sql
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE '%rehearsal%'
       OR table_name LIKE '%payment%')
ORDER BY table_name;
```

**Expected Result:** 2+ views

---

## Test Data Scripts

### Insert Test Rehearsal

```sql
-- Insert a test rehearsal
INSERT INTO recital_rehearsals (
  recital_id,
  rehearsal_type,
  name,
  description,
  rehearsal_date,
  start_time,
  end_time,
  location,
  requires_costumes,
  status
) VALUES (
  (SELECT id FROM recitals LIMIT 1),
  'dress',
  'Dress Rehearsal - Test',
  'Full run with costumes',
  CURRENT_DATE + INTERVAL '7 days',
  '14:00',
  '17:00',
  'Main Theater',
  true,
  'scheduled'
) RETURNING *;
```

---

### Insert Test Fee Type

```sql
-- Insert a test fee type
INSERT INTO recital_fee_types (
  recital_id,
  fee_name,
  description,
  fee_type,
  amount_in_cents,
  applies_to,
  is_required,
  due_date
) VALUES (
  (SELECT id FROM recitals LIMIT 1),
  'Test Participation Fee',
  'Testing fee functionality',
  'participation',
  7500, -- $75.00
  'per_student',
  true,
  CURRENT_DATE + INTERVAL '30 days'
) RETURNING *;
```

---

### Assign Test Fee to Student

```sql
-- Assign fee to a student
INSERT INTO student_recital_fees (
  student_id,
  recital_id,
  fee_type_id,
  fee_name,
  amount_in_cents,
  quantity,
  total_amount_in_cents,
  balance_in_cents,
  status
) VALUES (
  (SELECT id FROM students LIMIT 1),
  (SELECT id FROM recitals LIMIT 1),
  (SELECT id FROM recital_fee_types LIMIT 1),
  'Test Participation Fee',
  7500,
  1,
  7500,
  7500,
  'pending'
) RETURNING *;
```

---

### Record Test Payment

```sql
-- Record a payment
INSERT INTO recital_payment_transactions (
  student_fee_id,
  student_id,
  amount_in_cents,
  payment_method,
  payment_status,
  paid_by_name
) VALUES (
  (SELECT id FROM student_recital_fees LIMIT 1),
  (SELECT student_id FROM student_recital_fees LIMIT 1),
  7500,
  'cash',
  'completed',
  'Test Parent'
) RETURNING *;
```

---

### Verify Balance Updated

```sql
-- Should show balance = 0, status = 'paid'
SELECT
  id,
  fee_name,
  total_amount_in_cents,
  amount_paid_in_cents,
  balance_in_cents,
  status,
  paid_in_full_date
FROM student_recital_fees
WHERE id = (SELECT id FROM student_recital_fees LIMIT 1);
```

---

## RLS Policy Testing

### Test as Admin

```sql
-- Set session to admin user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "admin-user-id", "role": "authenticated"}';

-- Should see all rehearsals
SELECT COUNT(*) FROM recital_rehearsals;

-- Should be able to insert
INSERT INTO recital_rehearsals (...) VALUES (...);
```

---

### Test as Parent

```sql
-- Set session to parent user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "parent-user-id", "role": "authenticated"}';

-- Should NOT see any rehearsals (not a staff member)
SELECT COUNT(*) FROM recital_rehearsals;
-- Expected: 0

-- Should see their child's attendance
SELECT COUNT(*) FROM rehearsal_attendance
WHERE student_id IN (
  SELECT student_id FROM student_guardian_relationships
  WHERE guardian_id = (SELECT id FROM guardians WHERE user_id = 'parent-user-id')
);
-- Expected: > 0 if their child has attendance records

-- Should see their child's fees
SELECT COUNT(*) FROM student_recital_fees
WHERE student_id IN (
  SELECT student_id FROM student_guardian_relationships
  WHERE guardian_id = (SELECT id FROM guardians WHERE user_id = 'parent-user-id')
);
-- Expected: > 0 if their child has fees
```

---

## Performance Testing

### Check Query Performance

```sql
-- Explain analyze a complex query
EXPLAIN ANALYZE
SELECT
  r.*,
  COUNT(DISTINCT rp.id) as participant_count,
  COUNT(DISTINCT ra.id) as attendance_count
FROM recital_rehearsals r
LEFT JOIN rehearsal_participants rp ON r.id = rp.rehearsal_id
LEFT JOIN rehearsal_attendance ra ON r.id = ra.rehearsal_id
WHERE r.recital_id = 'some-uuid'
GROUP BY r.id;
```

**Look for:**
- Execution time < 100ms
- Using indexes (not Seq Scan)
- No excessive nested loops

---

### Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE '%rehearsal%'
       OR tablename LIKE '%fee%'
       OR tablename LIKE '%payment%')
ORDER BY idx_scan DESC;
```

**Look for:**
- idx_scan > 0 (indexes are being used)
- If idx_scan = 0, index may not be needed

---

## Rollback Procedures

If you need to rollback migrations:

### Rollback Order

**IMPORTANT:** Rollback in REVERSE order to avoid constraint violations.

1. Drop Show-Day Check-In tables
2. Drop Email Campaign tables
3. Drop Performer Confirmation tables
4. Drop Recital Fees tables
5. Drop Rehearsal Management tables

---

### Drop Rehearsal Management Tables

```sql
-- Drop in reverse order of creation
DROP VIEW IF EXISTS rehearsal_summary CASCADE;
DROP TABLE IF EXISTS rehearsal_resources CASCADE;
DROP TABLE IF EXISTS rehearsal_attendance CASCADE;
DROP TABLE IF EXISTS rehearsal_participants CASCADE;
DROP TABLE IF EXISTS recital_rehearsals CASCADE;
```

---

### Drop Recital Fees Tables

```sql
DROP VIEW IF EXISTS parent_payment_summary CASCADE;
DROP TRIGGER IF EXISTS update_balance_on_payment ON recital_payment_transactions;
DROP FUNCTION IF EXISTS update_fee_balance_on_payment();
DROP TABLE IF EXISTS payment_plan_installments CASCADE;
DROP TABLE IF EXISTS recital_payment_plans CASCADE;
DROP TABLE IF EXISTS recital_payment_transactions CASCADE;
DROP TABLE IF EXISTS student_recital_fees CASCADE;
DROP TABLE IF EXISTS recital_fee_types CASCADE;
```

---

## Common Issues & Solutions

### Issue: Foreign Key Constraint Violation

**Error:**
```
ERROR: insert or update on table "rehearsal_participants" violates foreign key constraint
```

**Solution:**
- Ensure referenced record exists first
- Check `recital_id`, `class_instance_id`, `student_id` exist
- Verify data types match

---

### Issue: RLS Policy Blocking Access

**Error:**
```
ERROR: new row violates row-level security policy
```

**Solution:**
- Check you're authenticated
- Verify user role is correct
- Review RLS policy conditions
- Use `SET LOCAL` for testing

---

### Issue: Trigger Not Firing

**Symptom:** Balance not updating automatically

**Solution:**
- Check trigger exists: `\dft` in psql
- Verify trigger condition (WHEN clause)
- Check function has no errors
- Ensure `payment_status = 'completed'`

---

### Issue: Slow Queries

**Symptom:** Queries taking > 1 second

**Solution:**
- Run EXPLAIN ANALYZE
- Check indexes are being used
- Consider adding composite indexes
- Optimize JOIN conditions

---

## Migration Checklist

Before deploying to production:

- [ ] All migration files created
- [ ] Migrations run successfully on local
- [ ] All verification queries pass
- [ ] Test data inserted successfully
- [ ] RLS policies tested for all roles
- [ ] Triggers tested and working
- [ ] Views return expected data
- [ ] Performance tested with realistic data
- [ ] Rollback procedure tested
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Staging environment tested
- [ ] Backup of production database taken
- [ ] Migration scheduled with stakeholders
- [ ] Rollback plan ready

---

## Next Steps

1. **Review this guide** with your database administrator
2. **Run migrations locally** on development database
3. **Execute verification queries** to ensure correctness
4. **Test with sample data** to validate functionality
5. **Test RLS policies** for each user role
6. **Run performance tests** with realistic data volume
7. **Deploy to staging** and repeat tests
8. **Schedule production deployment** with rollback plan ready

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Document Version:** 1.0
**Last Updated:** January 16, 2025
**Maintained By:** Development Team
