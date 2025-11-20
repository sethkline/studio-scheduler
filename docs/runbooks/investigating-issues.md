# Runbook: Investigating Issues

This runbook provides step-by-step instructions for investigating production issues using the observability system.

## Table of Contents

1. [Customer Reports Error](#customer-reports-error)
2. [Investigating Failed Refund](#investigating-failed-refund)
3. [Tracking Down Payment Issues](#tracking-down-payment-issues)
4. [Debugging Slow Requests](#debugging-slow-requests)
5. [Auditing User Actions](#auditing-user-actions)
6. [Common Issues](#common-issues)

---

## Customer Reports Error

**Scenario**: A customer reports they received an error when trying to purchase tickets.

### Step 1: Get the Request ID

Ask the customer for:
- Exact time the error occurred
- Email address used
- Browser/device used

OR look for their session in the logs:
```bash
# Search by email in application logs
grep "user@example.com" logs/app.log | tail -20
```

### Step 2: Find the Request

Look for the request in logs around the reported time:

```bash
# Search logs by timestamp
grep "2025-11-19T14:30" logs/app.log | grep "POST /api/payments"
```

Extract the `request_id` from the log entry.

### Step 3: Get All Logs for That Request

```bash
# Get all logs for this request
grep "request_id: \"550e8400-e29b-41d4-a716-446655440000\"" logs/app.log
```

### Step 4: Check Audit Logs

See if the operation left an audit trail:

```sql
SELECT * FROM audit_logs
WHERE request_id = '550e8400-e29b-41d4-a716-446655440000';
```

### Step 5: Identify Root Cause

Look for:
- Error messages in logs
- Stack traces
- Failed database queries
- Stripe API errors
- Validation failures

### Step 6: Take Action

Based on the error:
- **Stripe error**: Check Stripe dashboard
- **Database error**: Check database connection, query syntax
- **Validation error**: Check if data is correct
- **Timeout**: Check for slow queries or external API issues

### Step 7: Document and Follow Up

1. Create a support ticket with findings
2. Notify customer of resolution or next steps
3. If bug found, create GitHub issue

---

## Investigating Failed Refund

**Scenario**: Admin reports that a refund failed.

### Step 1: Find the Refund Attempt in Audit Logs

Navigate to Admin > Audit Logs or query:

```sql
SELECT * FROM audit_logs
WHERE action = 'order.refund'
  AND status = 'failure'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Step 2: Get Details from Audit Log

```sql
SELECT
  id,
  user_name,
  user_email,
  resource_id as order_id,
  metadata,
  error_message,
  request_id,
  created_at
FROM audit_logs
WHERE id = '<audit_log_id>';
```

### Step 3: Check Application Logs

Use the `request_id` to find application logs:

```bash
grep "<request_id>" logs/app.log
```

Look for:
- Stripe API error details
- Database errors
- Validation failures

### Step 4: Check Stripe Dashboard

1. Go to Stripe Dashboard > Payments
2. Search for the order's `payment_intent_id` (from audit metadata)
3. Check if refund was attempted on Stripe side
4. Look for error messages

### Step 5: Verify Order State

```sql
SELECT * FROM ticket_orders
WHERE id = '<order_id>';
```

Check:
- Order status (should be 'paid' for refund)
- `stripe_payment_intent_id` exists
- `total_amount_in_cents` matches refund amount

### Step 6: Resolution

Common issues and fixes:

**Issue**: Order already refunded
- **Fix**: No action needed, inform admin

**Issue**: Stripe API error (e.g., insufficient balance)
- **Fix**: Contact Stripe support, try again later

**Issue**: Order not paid yet
- **Fix**: Wait for payment to complete, then refund

**Issue**: Database connection timeout
- **Fix**: Check database health, try again

---

## Tracking Down Payment Issues

**Scenario**: Customer says payment went through but didn't receive tickets.

### Step 1: Find the Payment in Stripe

1. Search Stripe by:
   - Customer email
   - Payment amount
   - Date/time

2. Get the `payment_intent_id`

### Step 2: Search Audit Logs

```sql
SELECT * FROM audit_logs
WHERE action = 'payment.process'
  AND metadata->>'stripe_payment_intent_id' = '<payment_intent_id>';
```

### Step 3: Check Order Status

```sql
SELECT * FROM ticket_orders
WHERE stripe_payment_intent_id = '<payment_intent_id>';
```

### Step 4: Common Scenarios

**Scenario A: Order exists, status = 'paid'**
- Tickets created successfully
- Check if confirmation email sent:
  ```sql
  SELECT * FROM email_logs
  WHERE metadata->>'order_id' = '<order_id>'
    AND template_slug = 'ticket_confirmation';
  ```
- If email not sent, resend from Admin > Orders

**Scenario B: Order exists, status = 'pending'**
- Payment succeeded but webhook not processed
- Manually update order to 'paid':
  ```sql
  UPDATE ticket_orders
  SET status = 'paid', updated_at = NOW()
  WHERE id = '<order_id>';
  ```
- Trigger ticket generation

**Scenario C: No order found**
- Payment succeeded but order creation failed
- Create support ticket
- Manual refund may be needed

### Step 5: Verify Tickets

```sql
SELECT * FROM tickets
WHERE order_id = '<order_id>';
```

### Step 6: Resend Confirmation

Use Admin UI or API:
```bash
POST /api/admin/ticketing/orders/<order_id>/resend-email
```

---

## Debugging Slow Requests

**Scenario**: Users complaining about slow page loads.

### Step 1: Find Slow Requests in Logs

```bash
# Find slow request warnings
grep "slow_request" logs/app.log | tail -20
```

Or query by type:
```bash
grep '"type":"slow_request"' logs/app.log | \
  jq -r '[.path, .method, .duration_ms] | @csv'
```

### Step 2: Identify Pattern

Look for:
- Same endpoint consistently slow
- Specific time of day
- Specific user or studio

### Step 3: Check for Slow Queries

```bash
# Find slow query warnings
grep "slow_query" logs/app.log
```

### Step 4: Analyze Database Performance

```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check query performance
EXPLAIN ANALYZE <slow_query>;
```

### Step 5: Optimize

Common optimizations:
- Add database indexes
- Use query limits and pagination
- Cache frequently accessed data
- Optimize joins and subqueries

### Step 6: Monitor Improvement

After deploying fix, monitor logs for:
- Reduced duration for previously slow endpoint
- No new slow request warnings

---

## Auditing User Actions

**Scenario**: Need to see what a specific admin user has done.

### Step 1: Find User ID

```sql
SELECT id, email, full_name, user_role
FROM profiles
WHERE email = 'admin@studio.com';
```

### Step 2: Query Audit Logs

```sql
SELECT
  created_at,
  action,
  resource_type,
  resource_id,
  status,
  metadata
FROM audit_logs
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 100;
```

### Step 3: Filter by Action Type

```sql
-- Only refunds
SELECT * FROM audit_logs
WHERE user_id = '<user_id>'
  AND action = 'order.refund'
ORDER BY created_at DESC;

-- Only failed actions
SELECT * FROM audit_logs
WHERE user_id = '<user_id>'
  AND status = 'failure'
ORDER BY created_at DESC;
```

### Step 4: Get Resource Details

For each audit log entry, you can look up the affected resource:

```sql
-- Get order details
SELECT * FROM ticket_orders
WHERE id = '<resource_id>';

-- Get user details
SELECT * FROM profiles
WHERE id = '<resource_id>';
```

### Step 5: Export for Compliance

```sql
-- Export to CSV
COPY (
  SELECT
    created_at,
    user_email,
    action,
    resource_type,
    resource_id,
    status,
    metadata
  FROM audit_logs
  WHERE user_id = '<user_id>'
    AND created_at >= '2025-01-01'
  ORDER BY created_at DESC
) TO '/tmp/audit_export.csv' WITH CSV HEADER;
```

Or use Admin UI > Audit Logs > Export button.

---

## Common Issues

### Issue: Can't Find Request ID

**Solution**: Search by user email or timestamp:
```bash
grep "user@example.com" logs/app.log | grep "2025-11-19T14"
```

### Issue: Audit Log Missing

**Possible Causes**:
- Operation didn't call `logAudit()`
- Database write failed (check app logs)
- Operation failed before audit log could be written

**Solution**: Check application logs for the request to see what happened.

### Issue: Too Many Logs to Search

**Solution**: Use log filtering tools:
```bash
# Filter by log level
grep '"level":"error"' logs/app.log

# Filter by context
grep '"context":"payment_processing"' logs/app.log

# Combine filters with jq
cat logs/app.log | \
  jq 'select(.level=="error" and .context=="payment_processing")'
```

### Issue: Logs Not Showing in Admin UI

**Possible Causes**:
- Not logged in as admin
- RLS policy blocking access
- Frontend API call failing

**Solution**:
1. Check browser console for errors
2. Verify admin role in profiles table
3. Check API endpoint directly:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://app.com/api/admin/audit-logs
   ```

---

## Escalation

### When to Escalate to Engineering

- Database corruption or data loss
- Security incident (unauthorized access)
- System-wide outage
- Repeated failures of critical operations
- Performance degradation affecting all users

### What to Include in Escalation

1. **Request ID** (if applicable)
2. **User Email** (if applicable)
3. **Timestamp** of issue
4. **Error Messages** from logs
5. **Steps to Reproduce** (if known)
6. **Impact**: Number of users affected
7. **Urgency**: How critical is this?

### Contact

- Engineering On-Call: [on-call rotation]
- Engineering Lead: [email]
- Infrastructure: [email/slack]

---

## Related Documentation

- [Observability Guide](../observability.md)
- [Database Schema](../database/)
- [API Documentation](../api/)
