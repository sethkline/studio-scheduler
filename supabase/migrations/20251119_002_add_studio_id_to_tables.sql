-- Migration: Add studio_id to All Business Tables
-- Created: 2025-11-19
-- Description: Adds studio_id foreign key to all tables for multi-tenant data isolation
-- This is PHASE 2 of multi-tenant migration
-- NOTE: This migration adds columns but does NOT set NOT NULL constraint yet
--       (that will be done after data migration in Phase 3)

-- ============================================
-- CORE USER/PROFILE TABLES
-- ============================================

-- profiles table (user accounts)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_studio_id UUID REFERENCES studios(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.primary_studio_id IS 'User primary/default studio (users can be members of multiple studios)';
CREATE INDEX IF NOT EXISTS idx_profiles_primary_studio ON profiles(primary_studio_id);

-- students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN students.studio_id IS 'Studio this student belongs to';
CREATE INDEX IF NOT EXISTS idx_students_studio ON students(studio_id);

-- teachers table
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN teachers.studio_id IS 'Studio this teacher belongs to';
CREATE INDEX IF NOT EXISTS idx_teachers_studio ON teachers(studio_id);

-- guardians table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guardians') THEN
    ALTER TABLE guardians
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_guardians_studio ON guardians(studio_id);
  END IF;
END $$;

-- ============================================
-- CLASS & DANCE STYLE TABLES
-- ============================================

-- dance_styles table
ALTER TABLE dance_styles
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN dance_styles.studio_id IS 'Studio this dance style belongs to';
CREATE INDEX IF NOT EXISTS idx_dance_styles_studio ON dance_styles(studio_id);

-- class_levels table
ALTER TABLE class_levels
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN class_levels.studio_id IS 'Studio this class level belongs to';
CREATE INDEX IF NOT EXISTS idx_class_levels_studio ON class_levels(studio_id);

-- class_definitions table
ALTER TABLE class_definitions
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN class_definitions.studio_id IS 'Studio this class definition belongs to';
CREATE INDEX IF NOT EXISTS idx_class_definitions_studio ON class_definitions(studio_id);

-- class_instances table
ALTER TABLE class_instances
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN class_instances.studio_id IS 'Studio this class instance belongs to';
CREATE INDEX IF NOT EXISTS idx_class_instances_studio ON class_instances(studio_id);

-- enrollments table
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN enrollments.studio_id IS 'Studio this enrollment belongs to';
CREATE INDEX IF NOT EXISTS idx_enrollments_studio ON enrollments(studio_id);

-- ============================================
-- SCHEDULING TABLES
-- ============================================

-- schedules table
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN schedules.studio_id IS 'Studio this schedule belongs to';
CREATE INDEX IF NOT EXISTS idx_schedules_studio ON schedules(studio_id);

-- schedule_classes table
ALTER TABLE schedule_classes
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN schedule_classes.studio_id IS 'Studio this schedule class belongs to';
CREATE INDEX IF NOT EXISTS idx_schedule_classes_studio ON schedule_classes(studio_id);

-- scheduling_constraints table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduling_constraints') THEN
    ALTER TABLE scheduling_constraints
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_scheduling_constraints_studio ON scheduling_constraints(studio_id);
  END IF;
END $$;

-- teacher_availability table
ALTER TABLE teacher_availability
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN teacher_availability.studio_id IS 'Studio this availability belongs to';
CREATE INDEX IF NOT EXISTS idx_teacher_availability_studio ON teacher_availability(studio_id);

-- teacher_availability_exceptions table
ALTER TABLE teacher_availability_exceptions
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN teacher_availability_exceptions.studio_id IS 'Studio this availability exception belongs to';
CREATE INDEX IF NOT EXISTS idx_teacher_availability_exceptions_studio ON teacher_availability_exceptions(studio_id);

-- ============================================
-- RECITAL TABLES
-- ============================================

-- recitals table
ALTER TABLE recitals
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN recitals.studio_id IS 'Studio this recital belongs to';
CREATE INDEX IF NOT EXISTS idx_recitals_studio ON recitals(studio_id);

-- recital_series table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recital_series') THEN
    ALTER TABLE recital_series
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_recital_series_studio ON recital_series(studio_id);
  END IF;
END $$;

-- recital_shows table
ALTER TABLE recital_shows
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN recital_shows.studio_id IS 'Studio this recital show belongs to';
CREATE INDEX IF NOT EXISTS idx_recital_shows_studio ON recital_shows(studio_id);

-- recital_programs table
ALTER TABLE recital_programs
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN recital_programs.studio_id IS 'Studio this recital program belongs to';
CREATE INDEX IF NOT EXISTS idx_recital_programs_studio ON recital_programs(studio_id);

-- recital_performances table
ALTER TABLE recital_performances
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN recital_performances.studio_id IS 'Studio this recital performance belongs to';
CREATE INDEX IF NOT EXISTS idx_recital_performances_studio ON recital_performances(studio_id);

-- recital_program_advertisements table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recital_program_advertisements') THEN
    ALTER TABLE recital_program_advertisements
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_recital_program_advertisements_studio ON recital_program_advertisements(studio_id);
  END IF;
END $$;

-- ============================================
-- TICKETING TABLES
-- ============================================

-- venues table
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN venues.studio_id IS 'Studio this venue belongs to';
CREATE INDEX IF NOT EXISTS idx_venues_studio ON venues(studio_id);

-- venue_sections table
ALTER TABLE venue_sections
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN venue_sections.studio_id IS 'Studio this venue section belongs to';
CREATE INDEX IF NOT EXISTS idx_venue_sections_studio ON venue_sections(studio_id);

-- price_zones table
ALTER TABLE price_zones
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN price_zones.studio_id IS 'Studio this price zone belongs to';
CREATE INDEX IF NOT EXISTS idx_price_zones_studio ON price_zones(studio_id);

-- seats table
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN seats.studio_id IS 'Studio this seat belongs to';
CREATE INDEX IF NOT EXISTS idx_seats_studio_id ON seats(studio_id);

-- show_seats table
ALTER TABLE show_seats
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN show_seats.studio_id IS 'Studio this show seat belongs to';
CREATE INDEX IF NOT EXISTS idx_show_seats_studio ON show_seats(studio_id);

-- ticket_orders table
ALTER TABLE ticket_orders
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN ticket_orders.studio_id IS 'Studio this ticket order belongs to';
CREATE INDEX IF NOT EXISTS idx_ticket_orders_studio ON ticket_orders(studio_id);

-- tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN tickets.studio_id IS 'Studio this ticket belongs to';
CREATE INDEX IF NOT EXISTS idx_tickets_studio ON tickets(studio_id);

-- ticket_order_items table
ALTER TABLE ticket_order_items
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN ticket_order_items.studio_id IS 'Studio this ticket order item belongs to';
CREATE INDEX IF NOT EXISTS idx_ticket_order_items_studio ON ticket_order_items(studio_id);

-- ============================================
-- PAYMENT TABLES
-- ============================================

-- payment_transactions table
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN payment_transactions.studio_id IS 'Studio this payment transaction belongs to';
CREATE INDEX IF NOT EXISTS idx_payment_transactions_studio ON payment_transactions(studio_id);

-- payment_plans table
ALTER TABLE payment_plans
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN payment_plans.studio_id IS 'Studio this payment plan belongs to';
CREATE INDEX IF NOT EXISTS idx_payment_plans_studio ON payment_plans(studio_id);

-- payment_plan_installments table
ALTER TABLE payment_plan_installments
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN payment_plan_installments.studio_id IS 'Studio this installment belongs to';
CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_studio ON payment_plan_installments(studio_id);

-- payment_methods table
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN payment_methods.studio_id IS 'Studio this payment method belongs to';
CREATE INDEX IF NOT EXISTS idx_payment_methods_studio ON payment_methods(studio_id);

-- refunds table
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN refunds.studio_id IS 'Studio this refund belongs to';
CREATE INDEX IF NOT EXISTS idx_refunds_studio ON refunds(studio_id);

-- studio_credits table
ALTER TABLE studio_credits
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN studio_credits.studio_id IS 'Studio this credit belongs to';
CREATE INDEX IF NOT EXISTS idx_studio_credits_studio ON studio_credits(studio_id);

-- studio_credit_transactions table
ALTER TABLE studio_credit_transactions
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN studio_credit_transactions.studio_id IS 'Studio this credit transaction belongs to';
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_studio ON studio_credit_transactions(studio_id);

-- tuition_plans table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tuition_plans') THEN
    ALTER TABLE tuition_plans
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_tuition_plans_studio ON tuition_plans(studio_id);
  END IF;
END $$;

-- pricing_rules table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rules') THEN
    ALTER TABLE pricing_rules
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_pricing_rules_studio ON pricing_rules(studio_id);
  END IF;
END $$;

-- family_discounts table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'family_discounts') THEN
    ALTER TABLE family_discounts
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_family_discounts_studio ON family_discounts(studio_id);
  END IF;
END $$;

-- tuition_invoices table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tuition_invoices') THEN
    ALTER TABLE tuition_invoices
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_tuition_invoices_studio ON tuition_invoices(studio_id);
  END IF;
END $$;

-- late_payment_penalties table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'late_payment_penalties') THEN
    ALTER TABLE late_payment_penalties
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_late_payment_penalties_studio ON late_payment_penalties(studio_id);
  END IF;
END $$;

-- payment_reminders table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_reminders') THEN
    ALTER TABLE payment_reminders
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_payment_reminders_studio ON payment_reminders(studio_id);
  END IF;
END $$;

-- student_recital_fees table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_recital_fees') THEN
    ALTER TABLE student_recital_fees
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_student_recital_fees_studio ON student_recital_fees(studio_id);
  END IF;
END $$;

-- ============================================
-- ATTENDANCE TABLES
-- ============================================

-- attendance_records table
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

COMMENT ON COLUMN attendance_records.studio_id IS 'Studio this attendance record belongs to';
CREATE INDEX IF NOT EXISTS idx_attendance_records_studio ON attendance_records(studio_id);

-- ============================================
-- EMAIL/MARKETING TABLES
-- ============================================

-- email_campaigns table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    ALTER TABLE email_campaigns
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_email_campaigns_studio ON email_campaigns(studio_id);
  END IF;
END $$;

-- email_campaign_recipients table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaign_recipients') THEN
    ALTER TABLE email_campaign_recipients
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_studio ON email_campaign_recipients(studio_id);
  END IF;
END $$;

-- email_campaign_unsubscribes table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaign_unsubscribes') THEN
    ALTER TABLE email_campaign_unsubscribes
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_email_campaign_unsubscribes_studio ON email_campaign_unsubscribes(studio_id);
  END IF;
END $$;

-- blog_posts table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_blog_posts_studio ON blog_posts(studio_id);
  END IF;
END $$;

-- ============================================
-- MEDIA/CONTENT TABLES
-- ============================================

-- media table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'media') THEN
    ALTER TABLE media
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_media_studio ON media(studio_id);
  END IF;
END $$;

-- ============================================
-- VOLUNTEER/TASK TABLES
-- ============================================

-- volunteers table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'volunteers') THEN
    ALTER TABLE volunteers
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_volunteers_studio ON volunteers(studio_id);
  END IF;
END $$;

-- tasks table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_tasks_studio ON tasks(studio_id);
  END IF;
END $$;

-- ============================================
-- STUDIO-SPECIFIC TABLES
-- ============================================

-- studio_locations table (already has studio relationship, update FK)
DO $$
BEGIN
  -- Check if studio_profile_id exists and rename to studio_id
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'studio_locations'
    AND column_name = 'studio_profile_id'
  ) THEN
    ALTER TABLE studio_locations RENAME COLUMN studio_profile_id TO studio_id;

    -- Drop old constraint if exists
    ALTER TABLE studio_locations
      DROP CONSTRAINT IF EXISTS studio_locations_studio_profile_id_fkey;

    -- Add new constraint
    ALTER TABLE studio_locations
      ADD CONSTRAINT studio_locations_studio_id_fkey
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;
  ELSIF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'studio_locations'
    AND column_name = 'studio_id'
  ) THEN
    -- Add studio_id if it doesn't exist
    ALTER TABLE studio_locations
      ADD COLUMN studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_studio_locations_studio ON studio_locations(studio_id);
END $$;

-- studio_rooms table (link to studio via location)
-- Already has location_id FK, which links to studio indirectly

-- operating_hours table (link to studio via location)
-- Already has location_id FK, which links to studio indirectly

-- special_operating_hours table (if exists - link to studio via location)
-- Already has location_id FK, which links to studio indirectly

-- ============================================
-- COSTUME TABLES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'costumes') THEN
    ALTER TABLE costumes
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_costumes_studio ON costumes(studio_id);
  END IF;
END $$;

-- ============================================
-- REHEARSAL TABLES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rehearsals') THEN
    ALTER TABLE rehearsals
      ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES studios(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_rehearsals_studio ON rehearsals(studio_id);
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE - PHASE 2
-- ============================================
-- Next: Phase 3 - Update RLS policies for studio isolation
-- Next: Phase 4 - Data migration script to set studio_id on existing records
-- Next: Phase 5 - Add NOT NULL constraints after data migration
