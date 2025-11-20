-- Migration: Migrate Existing Data to Default Studio
-- Created: 2025-11-19
-- Description: Creates a default studio and migrates all existing data to it
-- This is PHASE 4 of multi-tenant migration
-- WARNING: This migration modifies existing data. Review carefully before applying!

-- ============================================
-- STEP 1: Create Default Studio
-- ============================================

DO $$
DECLARE
  v_default_studio_id UUID;
  v_studio_name TEXT;
  v_studio_email TEXT;
  v_studio_phone TEXT;
BEGIN
  -- Try to get studio info from existing studio_profile table if it exists
  BEGIN
    SELECT name, email, phone
    INTO v_studio_name, v_studio_email, v_studio_phone
    FROM studio_profile
    LIMIT 1;
  EXCEPTION
    WHEN undefined_table THEN
      v_studio_name := 'Default Studio';
      v_studio_email := NULL;
      v_studio_phone := NULL;
  END;

  -- Create default studio (only if no studios exist)
  IF NOT EXISTS (SELECT 1 FROM studios LIMIT 1) THEN
    INSERT INTO studios (
      name,
      slug,
      email,
      phone,
      subscription_tier,
      subscription_status,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(v_studio_name, 'Default Studio'),
      'default-studio',
      v_studio_email,
      v_studio_phone,
      'professional', -- Give default studio professional tier
      'active',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_default_studio_id;

    RAISE NOTICE 'Created default studio with ID: %', v_default_studio_id;
  ELSE
    -- Get existing default studio
    SELECT id INTO v_default_studio_id
    FROM studios
    WHERE slug = 'default-studio'
    LIMIT 1;

    IF v_default_studio_id IS NULL THEN
      SELECT id INTO v_default_studio_id
      FROM studios
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    RAISE NOTICE 'Using existing studio with ID: %', v_default_studio_id;
  END IF;

  -- Store default studio ID in a temp table for other steps
  CREATE TEMP TABLE IF NOT EXISTS temp_default_studio (studio_id UUID);
  DELETE FROM temp_default_studio;
  INSERT INTO temp_default_studio VALUES (v_default_studio_id);
END $$;

-- ============================================
-- STEP 2: Create Studio Memberships for All Existing Users
-- ============================================

DO $$
DECLARE
  v_default_studio_id UUID;
  v_users_migrated INTEGER := 0;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  -- Create studio_member records for all existing users in profiles table
  INSERT INTO studio_members (studio_id, user_id, role, status, joined_at, created_at, updated_at)
  SELECT
    v_default_studio_id,
    p.id,
    p.user_role, -- Map existing user_role to studio role
    'active',
    p.created_at, -- Use profile creation date as joined date
    NOW(),
    NOW()
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM studio_members sm
    WHERE sm.user_id = p.id AND sm.studio_id = v_default_studio_id
  )
  ON CONFLICT (studio_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_users_migrated = ROW_COUNT;
  RAISE NOTICE 'Created studio memberships for % users', v_users_migrated;

  -- Update profiles to set primary_studio_id
  UPDATE profiles
  SET primary_studio_id = v_default_studio_id
  WHERE primary_studio_id IS NULL;

  RAISE NOTICE 'Updated profiles with primary studio ID';
END $$;

-- ============================================
-- STEP 3: Set studio_id on All Business Tables
-- ============================================

DO $$
DECLARE
  v_default_studio_id UUID;
  v_table_name TEXT;
  v_rows_updated INTEGER;
  v_sql TEXT;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  -- List of all tables that need studio_id updated
  FOR v_table_name IN
    SELECT unnest(ARRAY[
      'students', 'teachers', 'dance_styles', 'class_levels',
      'class_definitions', 'class_instances', 'enrollments',
      'schedules', 'schedule_classes', 'teacher_availability',
      'teacher_availability_exceptions', 'recitals', 'recital_shows',
      'recital_programs', 'recital_performances',
      'venues', 'venue_sections', 'price_zones', 'seats',
      'show_seats', 'ticket_orders', 'tickets', 'ticket_order_items',
      'payment_transactions', 'payment_plans', 'payment_plan_installments',
      'payment_methods', 'refunds', 'studio_credits', 'studio_credit_transactions',
      'attendance_records'
    ])
  LOOP
    -- Check if table exists before updating
    IF EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      -- Check if studio_id column exists
      IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = v_table_name
        AND column_name = 'studio_id'
      ) THEN
        v_sql := format('UPDATE %I SET studio_id = $1 WHERE studio_id IS NULL', v_table_name);
        EXECUTE v_sql USING v_default_studio_id;

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated > 0 THEN
          RAISE NOTICE 'Updated % rows in % table', v_rows_updated, v_table_name;
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 4: Handle Conditional Tables (with DO blocks)
-- ============================================

-- Update guardians table if it exists
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guardians') THEN
    SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

    UPDATE guardians SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in guardians table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update recital_series table if it exists
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recital_series') THEN
    SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

    UPDATE recital_series SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in recital_series table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update recital_program_advertisements table if it exists
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recital_program_advertisements') THEN
    SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

    UPDATE recital_program_advertisements SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in recital_program_advertisements table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update scheduling_constraints table if it exists
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduling_constraints') THEN
    SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

    UPDATE scheduling_constraints SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in scheduling_constraints table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update tuition-related tables if they exist
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tuition_plans') THEN
    UPDATE tuition_plans SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in tuition_plans table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rules') THEN
    UPDATE pricing_rules SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in pricing_rules table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'family_discounts') THEN
    UPDATE family_discounts SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in family_discounts table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tuition_invoices') THEN
    UPDATE tuition_invoices SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in tuition_invoices table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'late_payment_penalties') THEN
    UPDATE late_payment_penalties SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in late_payment_penalties table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_reminders') THEN
    UPDATE payment_reminders SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in payment_reminders table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_recital_fees') THEN
    UPDATE student_recital_fees SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in student_recital_fees table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update email/marketing tables if they exist
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    UPDATE email_campaigns SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in email_campaigns table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaign_recipients') THEN
    UPDATE email_campaign_recipients SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in email_campaign_recipients table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaign_unsubscribes') THEN
    UPDATE email_campaign_unsubscribes SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in email_campaign_unsubscribes table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    UPDATE blog_posts SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in blog_posts table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update media, volunteer, task tables if they exist
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'media') THEN
    UPDATE media SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in media table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'volunteers') THEN
    UPDATE volunteers SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in volunteers table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    UPDATE tasks SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in tasks table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'costumes') THEN
    UPDATE costumes SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in costumes table', v_rows_updated;
    END IF;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rehearsals') THEN
    UPDATE rehearsals SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in rehearsals table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- Update studio_locations table
DO $$
DECLARE
  v_default_studio_id UUID;
  v_rows_updated INTEGER;
BEGIN
  SELECT studio_id INTO v_default_studio_id FROM temp_default_studio;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'studio_locations') THEN
    UPDATE studio_locations SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated > 0 THEN
      RAISE NOTICE 'Updated % rows in studio_locations table', v_rows_updated;
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 5: Add NOT NULL Constraints (After Data Migration)
-- ============================================

-- Add NOT NULL constraints to critical tables
-- NOTE: Only adding to core tables; optional tables handled with conditional logic

ALTER TABLE students ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE dance_styles ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE class_levels ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE class_definitions ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE class_instances ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE enrollments ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE schedule_classes ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE teacher_availability ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE teacher_availability_exceptions ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE recitals ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE recital_shows ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE recital_programs ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE recital_performances ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE venues ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE venue_sections ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE price_zones ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE seats ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE show_seats ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE ticket_orders ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE ticket_order_items ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE payment_transactions ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE payment_plans ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE payment_plan_installments ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE payment_methods ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE refunds ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE studio_credits ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE studio_credit_transactions ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN studio_id SET NOT NULL;

RAISE NOTICE 'Added NOT NULL constraints to studio_id columns';

-- ============================================
-- STEP 6: Cleanup
-- ============================================

DROP TABLE IF EXISTS temp_default_studio;

-- ============================================
-- MIGRATION COMPLETE - PHASE 4
-- ============================================

RAISE NOTICE '========================================';
RAISE NOTICE 'Multi-tenant data migration complete!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Update server/utils/auth.ts with studio context helpers';
RAISE NOTICE '2. Create studio context middleware';
RAISE NOTICE '3. Update stores/studio.ts to be studio-scoped';
RAISE NOTICE '4. Update all API handlers to filter by studio_id';
RAISE NOTICE '========================================';
