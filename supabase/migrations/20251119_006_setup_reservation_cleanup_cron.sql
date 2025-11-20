-- Migration: Setup Automated Reservation Cleanup
-- Created: 2025-11-19
-- Description: Configure pg_cron job to automatically clean up expired reservations
--
-- IMPORTANT: This requires pg_cron extension to be enabled in Supabase
-- Run this in Supabase SQL Editor with elevated privileges
--
-- If pg_cron is not available, you can alternatively:
-- 1. Use Supabase Edge Functions with a scheduled trigger
-- 2. Use an external cron service (like GitHub Actions, Vercel Cron, etc.)

-- ============================================
-- 1. ENABLE PG_CRON EXTENSION
-- ============================================
-- Note: In Supabase, this may require dashboard access or support ticket
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 2. SCHEDULE CLEANUP JOB
-- ============================================
-- Run cleanup every 5 minutes to ensure timely seat release
-- This prevents seats from being held unnecessarily after expiration

-- First, remove any existing cleanup job (idempotent)
SELECT cron.unschedule('cleanup-expired-reservations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-reservations'
);

-- Schedule new job to run every 5 minutes
SELECT cron.schedule(
  'cleanup-expired-reservations',           -- Job name
  '*/5 * * * *',                           -- Every 5 minutes (cron format)
  $$
    SELECT cleanup_expired_seat_reservations();
  $$
);

COMMENT ON EXTENSION pg_cron IS
  'Cron-based job scheduler for PostgreSQL - used for automated reservation cleanup';

-- ============================================
-- 3. CREATE MONITORING VIEW
-- ============================================
-- View to monitor the cron job execution
CREATE OR REPLACE VIEW reservation_cleanup_job_status AS
SELECT
  job.jobname,
  job.schedule,
  job.active,
  job.command,
  run.status,
  run.return_message,
  run.start_time,
  run.end_time,
  EXTRACT(EPOCH FROM (run.end_time - run.start_time)) as duration_seconds
FROM cron.job
LEFT JOIN LATERAL (
  SELECT *
  FROM cron.job_run_details
  WHERE jobid = job.jobid
  ORDER BY start_time DESC
  LIMIT 10
) run ON true
WHERE job.jobname = 'cleanup-expired-reservations'
ORDER BY run.start_time DESC NULLS LAST;

COMMENT ON VIEW reservation_cleanup_job_status IS
  'Monitor reservation cleanup cron job execution history and status';

-- Grant access to admin and staff
GRANT SELECT ON reservation_cleanup_job_status TO authenticated;

-- ============================================
-- 4. ALTERNATIVE: MANUAL CLEANUP ENDPOINT
-- ============================================
-- If pg_cron is not available, create a function that can be called via API
-- You can then trigger this from an external cron service

CREATE OR REPLACE FUNCTION api_cleanup_expired_reservations(
  p_api_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result RECORD;
  v_expected_key TEXT;
BEGIN
  -- Optional API key validation (set via environment variable)
  v_expected_key := current_setting('app.cleanup_api_key', true);

  IF v_expected_key IS NOT NULL AND v_expected_key != '' THEN
    IF p_api_key IS NULL OR p_api_key != v_expected_key THEN
      RAISE EXCEPTION 'Invalid API key'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Run cleanup
  SELECT *
  INTO v_result
  FROM cleanup_expired_seat_reservations();

  -- Return results as JSON
  RETURN jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'reservations_expired', v_result.total_reservations_expired,
    'seats_released', v_result.total_seats_released,
    'reservation_ids', v_result.reservation_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION api_cleanup_expired_reservations IS
  'API-callable version of cleanup function for external cron services (e.g., GitHub Actions, Vercel Cron)';
