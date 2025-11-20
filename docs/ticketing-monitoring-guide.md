# Ticketing System Monitoring Guide

## Overview

This guide outlines the monitoring metrics, alerts, and operational procedures for the hardened ticketing system.

## Table of Contents

1. [Key Metrics](#key-metrics)
2. [Database Queries for Monitoring](#database-queries-for-monitoring)
3. [Alert Configuration](#alert-configuration)
4. [Operational Dashboards](#operational-dashboards)
5. [Troubleshooting](#troubleshooting)

---

## Key Metrics

### 1. Reservation Success Rate

**What it measures**: Percentage of reservation attempts that succeed

**Target**: > 95% (excluding legitimate conflicts)

**Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'created') as total_attempts,
  COUNT(*) FILTER (WHERE event_type = 'failed' AND error_message LIKE '%taken by another%') as race_conditions,
  COUNT(*) FILTER (WHERE event_type = 'failed' AND error_message NOT LIKE '%taken by another%') as system_errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'created') /
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM seat_reservation_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Alert if**: Success rate < 90% over last hour

---

### 2. Double-Booking Attempts

**What it measures**: Number of times database constraint prevented double-booking

**Target**: Should be 0 (application logic should prevent this)

**Query**:
```sql
SELECT COUNT(*)
FROM seat_reservation_audit_log
WHERE event_type = 'failed'
  AND error_message LIKE '%constraint%'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Alert if**: > 0 (immediate investigation required)

---

### 3. Reservation Expiration Rate

**What it measures**: Percentage of reservations that expire without conversion to order

**Target**: < 50% (expected some abandonment)

**Query**:
```sql
WITH stats AS (
  SELECT * FROM get_reservation_statistics(NULL, 24)
)
SELECT
  total_created,
  total_completed,
  total_expired,
  ROUND(100.0 * total_expired / NULLIF(total_created, 0), 2) as expiration_rate_pct
FROM stats;
```

**Alert if**: Expiration rate > 80% (may indicate checkout flow issues)

---

### 4. Average Reservation Hold Time

**What it measures**: Average time from reservation creation to completion/expiration

**Target**: 5-8 minutes (users complete checkout within hold window)

**Query**:
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as avg_minutes
FROM (
  SELECT
    reservation_id,
    MIN(created_at) FILTER (WHERE event_type = 'created') as created_at,
    MIN(created_at) FILTER (WHERE event_type IN ('completed', 'expired')) as completed_at
  FROM seat_reservation_audit_log
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY reservation_id
  HAVING MIN(created_at) FILTER (WHERE event_type IN ('completed', 'expired')) IS NOT NULL
) subq;
```

**Alert if**: Average > 15 minutes (may indicate UX issues)

---

### 5. Cleanup Job Health

**What it measures**: Cleanup job execution status and performance

**Query**:
```sql
SELECT * FROM reservation_cleanup_job_status
LIMIT 10;
```

**Alert if**:
- No runs in last 10 minutes
- Any failed runs
- Run duration > 30 seconds

---

### 6. Active Reservations Count

**What it measures**: Current number of active seat reservations

**Query**:
```sql
SELECT
  COUNT(*) as active_reservations,
  COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '2 minutes') as expiring_soon,
  SUM(
    (SELECT COUNT(*) FROM reservation_seats WHERE reservation_id = seat_reservations.id)
  ) as total_seats_held
FROM seat_reservations
WHERE is_active = true
  AND expires_at > NOW();
```

**Alert if**: Active reservations > 1000 (may need capacity planning)

---

### 7. Payment Intent Failures

**What it measures**: Payment processing failures

**Query**:
```sql
SELECT
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'failed') /
    NULLIF(COUNT(*), 0),
    2
  ) as failure_rate_pct
FROM ticket_orders
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Alert if**: Failure rate > 5%

---

## Database Queries for Monitoring

### Real-time Dashboard Query

```sql
-- Get live ticketing statistics
SELECT
  -- Reservations
  (
    SELECT COUNT(*)
    FROM seat_reservations
    WHERE is_active = true AND expires_at > NOW()
  ) as active_reservations,

  -- Recent activity (last hour)
  (
    SELECT COUNT(*)
    FROM seat_reservation_audit_log
    WHERE event_type = 'created' AND created_at > NOW() - INTERVAL '1 hour'
  ) as reservations_last_hour,

  -- Tickets sold today
  (
    SELECT COUNT(*)
    FROM tickets
    WHERE created_at > CURRENT_DATE
  ) as tickets_sold_today,

  -- Revenue today (in dollars)
  (
    SELECT ROUND(SUM(total_amount_in_cents) / 100.0, 2)
    FROM ticket_orders
    WHERE status = 'paid' AND created_at > CURRENT_DATE
  ) as revenue_today,

  -- Cleanup stats (last run)
  (
    SELECT jsonb_build_object(
      'last_run', MAX(start_time),
      'status', (SELECT status FROM cron.job_run_details WHERE jobid = job.jobid ORDER BY start_time DESC LIMIT 1),
      'duration_seconds', (SELECT EXTRACT(EPOCH FROM (end_time - start_time)) FROM cron.job_run_details WHERE jobid = job.jobid ORDER BY start_time DESC LIMIT 1)
    )
    FROM cron.job
    WHERE jobname = 'cleanup-expired-reservations'
  ) as cleanup_status;
```

### Hourly Metrics (for trending)

```sql
-- Aggregate metrics by hour for last 24 hours
SELECT
  date_trunc('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE event_type = 'created') as reservations_created,
  COUNT(*) FILTER (WHERE event_type = 'completed') as reservations_completed,
  COUNT(*) FILTER (WHERE event_type = 'expired') as reservations_expired,
  COUNT(*) FILTER (WHERE event_type = 'failed') as reservations_failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'completed') /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'created'), 0),
    2
  ) as completion_rate_pct
FROM seat_reservation_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Top Errors

```sql
-- Most common error messages
SELECT
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_seen
FROM seat_reservation_audit_log
WHERE event_type = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;
```

---

## Alert Configuration

### Critical Alerts (Immediate Response Required)

#### 1. Database Constraint Violation

**Condition**: Double-booking prevented by database constraint

**Query**:
```sql
SELECT COUNT(*) > 0 as alert
FROM seat_reservation_audit_log
WHERE event_type = 'failed'
  AND error_message LIKE '%constraint%'
  AND created_at > NOW() - INTERVAL '5 minutes';
```

**Action**: Investigate immediately - application logic should prevent this

---

#### 2. Cleanup Job Failed

**Condition**: Reservation cleanup job failed or hasn't run

**Query**:
```sql
SELECT
  CASE
    WHEN MAX(start_time) < NOW() - INTERVAL '15 minutes' THEN true
    WHEN (SELECT status FROM cron.job_run_details WHERE jobid = job.jobid ORDER BY start_time DESC LIMIT 1) = 'failed' THEN true
    ELSE false
  END as alert
FROM cron.job
WHERE jobname = 'cleanup-expired-reservations';
```

**Action**: Check Supabase logs, manually run cleanup if needed

---

#### 3. Payment Processing Down

**Condition**: Payment failures > 20% in last 15 minutes

**Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') >
  COUNT(*) * 0.2
FROM ticket_orders
WHERE created_at > NOW() - INTERVAL '15 minutes';
```

**Action**: Check Stripe status, verify API keys

---

### Warning Alerts (Response Within 1 Hour)

#### 1. High Expiration Rate

**Condition**: > 70% of reservations expiring without purchase

**Query**:
```sql
WITH stats AS (
  SELECT * FROM get_reservation_statistics(NULL, 1)
)
SELECT total_expired > total_created * 0.7
FROM stats;
```

**Action**: Review checkout UX, check for errors in checkout flow

---

#### 2. Low Success Rate

**Condition**: Reservation success rate < 90%

**Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'created') <
  (COUNT(*) FILTER (WHERE event_type = 'created') + COUNT(*) FILTER (WHERE event_type = 'failed')) * 0.9
FROM seat_reservation_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Action**: Review error logs, check for systematic issues

---

### Info Alerts (Daily Review)

#### 1. Extension Rate Trends

Track how often users need to extend reservations

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as extensions,
  COUNT(DISTINCT reservation_id) as unique_reservations
FROM seat_reservation_audit_log
WHERE event_type = 'extended'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

---

## Operational Dashboards

### Dashboard 1: Real-Time Operations

**Metrics to Display**:
- Active reservations (live count)
- Reservations created (last hour)
- Tickets sold (today)
- Revenue (today)
- Last cleanup run status

**Update Frequency**: 30 seconds

---

### Dashboard 2: Quality Metrics

**Metrics to Display**:
- Reservation success rate (24h)
- Double-booking attempts (24h)
- Expiration rate (24h)
- Average hold time (24h)
- Payment failure rate (24h)

**Update Frequency**: 5 minutes

---

### Dashboard 3: System Health

**Metrics to Display**:
- Cleanup job status
- Database connection pool status
- API response times
- Error rate by endpoint

**Update Frequency**: 1 minute

---

## Troubleshooting

### Issue: High Reservation Failure Rate

**Symptoms**: Success rate < 80%

**Possible Causes**:
1. Database connectivity issues
2. High concurrency causing legitimate conflicts
3. Application bugs

**Investigation Steps**:
1. Check error distribution:
   ```sql
   SELECT error_message, COUNT(*)
   FROM seat_reservation_audit_log
   WHERE event_type = 'failed'
   AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY error_message;
   ```

2. Check for database issues:
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE state = 'active';
   ```

3. Review application logs for exceptions

---

### Issue: Cleanup Job Not Running

**Symptoms**: No recent cleanup runs, expired reservations accumulating

**Investigation Steps**:

1. Check pg_cron status:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-reservations';
   ```

2. Check recent runs:
   ```sql
   SELECT * FROM reservation_cleanup_job_status;
   ```

3. Manually run cleanup:
   ```sql
   SELECT * FROM cleanup_expired_seat_reservations();
   ```

4. If pg_cron unavailable, use external cron:
   ```bash
   curl -X POST https://your-app.com/api/admin/cleanup-reservations \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

---

### Issue: Double-Booking Constraint Violations

**Symptoms**: Audit log shows constraint violation errors

**Severity**: CRITICAL - Should never happen

**Investigation Steps**:

1. Get violation details:
   ```sql
   SELECT *
   FROM seat_reservation_audit_log
   WHERE error_message LIKE '%constraint%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. Check seat status:
   ```sql
   SELECT *
   FROM show_seats
   WHERE id IN (SELECT unnest(seat_ids) FROM seat_reservation_audit_log WHERE error_message LIKE '%constraint%');
   ```

3. Review application code changes (likely bug introduced)

4. Consider rolling back to previous version

---

### Issue: Payment Intent Creation Failing

**Symptoms**: High rate of payment_intent API errors

**Investigation Steps**:

1. Check Stripe status: https://status.stripe.com

2. Verify API keys are correct:
   ```bash
   echo $STRIPE_SECRET_KEY | head -c 20
   ```

3. Check for rate limiting:
   ```sql
   SELECT
     DATE_TRUNC('minute', created_at) as minute,
     COUNT(*) as requests
   FROM ticket_orders
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY minute
   ORDER BY minute DESC;
   ```

4. Review Stripe dashboard for declined transactions

---

## Monitoring Tools Integration

### Grafana Dashboard (Recommended)

Create dashboards using PostgreSQL data source:

```yaml
# grafana-dashboard-config.yml
apiVersion: 1
datasources:
  - name: Supabase PostgreSQL
    type: postgres
    url: your-supabase-db-url
    user: dashboard_reader
    secureJsonData:
      password: your-password
    jsonData:
      database: postgres
      sslmode: require
```

### Datadog Integration

Use Datadog PostgreSQL integration with custom queries:

```yaml
# postgres.yaml
init_config:
instances:
  - host: your-supabase-host
    port: 5432
    username: datadog
    password: your-password
    dbname: postgres
    custom_queries:
      - query: SELECT COUNT(*) as active_reservations FROM seat_reservations WHERE is_active = true
        columns:
          - name: active_reservations
            type: gauge
        tags:
          - service:ticketing
```

### Sentry Error Tracking

Configure Sentry to track reservation errors:

```typescript
// In API endpoints
try {
  // ... reservation logic
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      endpoint: 'reserve-seats',
      show_id: body.show_id
    },
    extra: {
      seat_ids: body.seat_ids,
      session_id: sessionId
    }
  })
  throw error
}
```

---

## Automated Monitoring Setup

### Option 1: Supabase Edge Functions

Create a monitoring edge function that runs every 5 minutes:

```typescript
// supabase/functions/monitoring-check/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_KEY')!
  )

  // Check critical metrics
  const { data: stats } = await supabase.rpc('get_reservation_statistics', {
    p_hours: 1
  })

  // Alert if issues found
  if (stats[0].expiration_rate > 0.8) {
    await sendAlert('High expiration rate', stats[0])
  }

  return new Response(JSON.stringify({ status: 'ok', stats }))
})
```

### Option 2: GitHub Actions Cron

```yaml
# .github/workflows/monitoring.yml
name: Ticketing Monitoring
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  check-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Check Metrics
        run: |
          curl -X POST ${{ secrets.MONITORING_ENDPOINT }} \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"
```

---

## Summary

**Key Takeaways**:

1. **Monitor continuously**: Set up automated checks for critical metrics
2. **Alert appropriately**: Critical alerts require immediate response
3. **Track trends**: Use hourly/daily aggregates to spot patterns
4. **Have runbooks**: Document response procedures for common issues
5. **Test alerts**: Regularly verify monitoring is working

**Recommended Monitoring Stack**:
- **Metrics**: Grafana + PostgreSQL
- **Errors**: Sentry
- **Uptime**: UptimeRobot or Pingdom
- **Logs**: Supabase Dashboard + CloudWatch (if on AWS)
