## Tuition & Billing System - Setup Guide (REVISED)

This document provides step-by-step instructions for setting up the comprehensive tuition and billing system, addressing all code review feedback.

---

## ✅ CODE REVIEW FIXES IMPLEMENTED

### 1. **Database Migration Fixed** ✅
- **Old Approach:** Created separate `invoices` and `payments` tables
- **New Approach:** Extends existing `ticket_orders` table with `order_type` field
- **Integration:** Reuses existing Stripe payment infrastructure

### 2. **Enrollment-Based Calculation** ✅
- **Implemented:** `calculateStudentMonthlyTuition()` function
- **Connects to:** `enrollments` table to automatically calculate what students owe
- **Smart Pricing:** Finds applicable tuition plans based on class definitions

### 3. **Discount Logic Fully Implemented** ✅
- **Multi-Class Discounts:** Automatically applied to 2nd, 3rd+ classes
- **Sibling Discounts:** Detects siblings and applies family discounts
- **Scholarships:** Supported with approval workflow
- **Coupon Codes:** Usage tracking and validation

### 4. **Stripe Subscriptions for Auto-Pay** ✅
- **Old Approach:** Payment intents only
- **New Approach:** Stripe Subscriptions with recurring billing
- **Webhook Integration:** Handles subscription events automatically
- **Retry Logic:** 3 automatic retry attempts for failed payments

### 5. **Scheduled Billing Job** ✅
- **Endpoint Created:** `/api/billing/jobs/generate-monthly-invoices-v2`
- **Auto-Calculation:** Connects to enrollments, calculates tuition, applies discounts
- **Email Delivery:** Sends professional invoice emails automatically

---

## 📋 PREREQUISITES

1. **Supabase Account** with database access
2. **Stripe Account** (test mode is fine)
3. **Mailgun Account** for email delivery
4. **Cron Service** for scheduled jobs (optional but recommended)

---

## 🚀 INSTALLATION STEPS

### Step 1: Apply Database Migration

**Run the REVISED migration** (integrates with existing `ticket_orders`):

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Run the migration file:
supabase/migrations/20250106_tuition_billing_system_v2.sql
```

**What this does:**
- Extends `ticket_orders` table with `order_type` ('ticket' | 'tuition')
- Creates tuition-specific tables (plans, discounts, subscriptions)
- Sets up RLS policies
- Creates database triggers for automatic calculations

**Verify Migration:**
```sql
-- Check that tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tuition_plans',
  'pricing_rules',
  'family_discounts',
  'order_line_items',
  'billing_schedules',
  'payment_methods'
);

-- Check that ticket_orders has new fields
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ticket_orders'
AND column_name IN ('order_type', 'parent_user_id', 'invoice_number', 'due_date');
```

---

### Step 2: Configure Stripe

#### 2.1 Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API keys**
3. Copy your **Secret key** and **Publishable key**

#### 2.2 Set Up Webhook

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. **Events to send:**
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Webhook signing secret**

#### 2.3 Update Environment Variables

```env
# Existing Stripe keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# NEW: Webhook secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

### Step 3: Create Tuition Plans

Use the API or Supabase dashboard to create tuition plans:

**Example API Request:**
```bash
POST /api/billing/tuition-plans
{
  "name": "Monthly Ballet - Beginner",
  "plan_type": "monthly",
  "base_price": 125.00,
  "registration_fee": 50.00,
  "costume_fee": 75.00,
  "effective_from": "2025-01-01",
  "class_definition_id": "uuid-of-ballet-beginner-class",
  "is_active": true
}
```

**Default Plans (Recommended):**
1. **General Monthly Plan** - Applies to any class without a specific plan
2. **Class-Specific Plans** - For classes with special pricing

---

### Step 4: Set Up Scheduled Jobs

**CRITICAL:** The billing system requires 3 scheduled jobs to run automatically.

#### Option A: External Cron Service (Recommended)

Use [cron-job.org](https://cron-job.org) (free):

1. Create account
2. Add 3 jobs:

**Job 1: Monthly Invoice Generation**
- **URL:** `POST https://yourdomain.com/api/billing/jobs/generate-monthly-invoices-v2`
- **Schedule:** `0 6 1 * *` (1st of month at 6:00 AM)
- **Body:** `{"billing_date": "2025-01-01", "dry_run": false}`

**Job 2: Overdue Invoice Processing**
- **URL:** `POST https://yourdomain.com/api/billing/jobs/process-overdue-invoices`
- **Schedule:** `0 8 * * *` (Daily at 8:00 AM)

**Job 3: Payment Reminder Check** (optional)
- **URL:** `POST https://yourdomain.com/api/billing/jobs/send-payment-reminders`
- **Schedule:** `0 10 * * *` (Daily at 10:00 AM)

#### Option B: Supabase Edge Functions

Create edge functions that call the endpoints:

```typescript
// supabase/functions/monthly-billing/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const response = await fetch('https://yourdomain.com/api/billing/jobs/generate-monthly-invoices-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      billing_date: new Date().toISOString().split('T')[0],
      dry_run: false
    })
  })

  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Schedule with pg_cron:
```sql
SELECT cron.schedule(
  'monthly-invoice-generation',
  '0 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://yourdomain.supabase.co/functions/v1/monthly-billing',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);
```

---

### Step 5: Test the Billing Workflow

#### 5.1 Create Test Student with Enrollments

```sql
-- Insert test student
INSERT INTO students (first_name, last_name, parent_id)
VALUES ('Test', 'Student', 'parent-user-id-here');

-- Enroll in classes
INSERT INTO enrollments (student_id, class_instance_id, status)
VALUES
  ('test-student-id', 'class-instance-1', 'active'),
  ('test-student-id', 'class-instance-2', 'active');
```

#### 5.2 Run Dry Run Invoice Generation

```bash
POST /api/billing/jobs/generate-monthly-invoices-v2
{
  "billing_date": "2025-01-01",
  "dry_run": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "invoices_generated": 1,
  "invoices_failed": 0,
  "total_amount_in_cents": 25000,
  "families_processed": 1,
  "message": "Processed 1 families. Generated 1 invoices. 0 failed."
}
```

#### 5.3 Verify Discount Calculation

**Test Multi-Class Discount:**
```bash
# Create 2nd student enrollment
POST /api/parent/enrollments
{
  "student_id": "test-student-id",
  "class_instance_id": "class-instance-3"
}

# Run dry run - should see multi-class discount applied
POST /api/billing/jobs/generate-monthly-invoices-v2
{
  "dry_run": true
}
```

#### 5.4 Test Stripe Subscription (Auto-Pay)

```bash
POST /api/billing/subscriptions/create
{
  "student_id": "test-student-id",
  "payment_method_id": "pm_test_card",
  "billing_day": 1,
  "autopay_discount_percentage": 2
}
```

**Use Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 🎯 HOW IT WORKS (End-to-End)

### Monthly Billing Cycle

1. **Day 1 of Month:** Scheduled job runs
   - Fetches all active enrollments
   - Groups by parent/family
   - Calculates tuition using `calculateFamilyMonthlyTuition()`
     - Finds applicable tuition plans for each enrollment
     - Applies multi-class discounts (2nd class 10% off)
     - Applies sibling discounts (if multiple students)
     - Applies scholarships (if configured)
   - Creates invoice in `ticket_orders` (order_type='tuition')
   - Creates line items in `order_line_items`
   - Sends professional invoice email to parent

2. **Parents with Auto-Pay Enabled:**
   - Stripe Subscription charges payment method automatically
   - Webhook receives `invoice.paid` event
   - System creates order record
   - Sends payment receipt email
   - Updates billing_schedule

3. **Parents without Auto-Pay:**
   - Parent logs into portal
   - Views invoice in `/parent/billing`
   - Clicks "Pay Now"
   - Enters payment method (or uses saved method)
   - Stripe processes payment
   - Invoice marked as paid
   - Receipt sent via email

4. **Overdue Invoices (Daily Check):**
   - Job runs daily at 8:00 AM
   - Marks invoices as overdue
   - Sends escalating reminders:
     - Day 3: "Your payment is 3 days overdue"
     - Day 7: "Your payment is 7 days overdue"
     - Day 14: "Your payment is 14 days overdue"
     - Day 30: "FINAL NOTICE"
   - Applies late fees (after grace period)

---

## 🔍 VERIFICATION CHECKLIST

After setup, verify:

- [ ] Migration applied successfully (all tables exist)
- [ ] `ticket_orders` has `order_type` field
- [ ] Default pricing rules created
- [ ] At least one tuition plan created
- [ ] Stripe webhook configured and receiving events
- [ ] Scheduled job runs successfully (dry run)
- [ ] Test invoice generated with correct discounts
- [ ] Test subscription created successfully
- [ ] Email delivery working (invoice and receipt)

---

## 📊 MONITORING

### Key Metrics to Track

```sql
-- Total outstanding balance
SELECT SUM(total_amount_in_cents) / 100.0 as total_outstanding
FROM ticket_orders
WHERE order_type = 'tuition'
  AND payment_status != 'completed';

-- Auto-pay enrollment rate
SELECT
  COUNT(DISTINCT parent_user_id) as autopay_parents,
  (SELECT COUNT(DISTINCT parent_id) FROM students) as total_parents,
  ROUND(100.0 * COUNT(DISTINCT parent_user_id) / (SELECT COUNT(DISTINCT parent_id) FROM students), 2) as autopay_rate_pct
FROM billing_schedules
WHERE is_active = true;

-- Failed payments (needs attention)
SELECT
  bs.*,
  p.full_name,
  p.email
FROM billing_schedules bs
JOIN profiles p ON p.user_id = bs.parent_user_id
WHERE retry_count >= 3
  AND is_active = false;
```

---

## 🚨 TROUBLESHOOTING

### Invoice Generation Fails

**Check:**
1. Do students have active enrollments?
   ```sql
   SELECT * FROM enrollments WHERE status = 'active';
   ```
2. Are tuition plans configured?
   ```sql
   SELECT * FROM tuition_plans WHERE is_active = true;
   ```
3. Check job logs for errors

### Discounts Not Applied

**Verify:**
1. Pricing rules are active and valid:
   ```sql
   SELECT * FROM pricing_rules WHERE is_active = true;
   ```
2. Family has multiple students (for sibling discount)
3. Student has multiple enrollments (for multi-class discount)

### Stripe Subscription Fails

**Check:**
1. Payment method is valid and not expired
2. Stripe customer ID exists in profiles table
3. Webhook secret is correct in `.env`
4. Webhook endpoint is publicly accessible

### Email Not Sending

**Verify:**
1. Mailgun API key is correct
2. Domain is verified in Mailgun
3. Check Mailgun logs for delivery status

---

## 🎉 SUCCESS CRITERIA

Your billing system is working correctly when:

1. ✅ Monthly invoices generate automatically on Day 1
2. ✅ Discounts calculate correctly (multi-class, sibling, scholarship)
3. ✅ Auto-pay subscriptions charge successfully
4. ✅ Parents receive invoice and receipt emails
5. ✅ Late payment reminders send automatically
6. ✅ Financial reports show accurate data

---

## 📞 SUPPORT

If you encounter issues:

1. Check the logs in your server/Supabase
2. Verify webhook events in Stripe Dashboard
3. Run dry run mode to test without creating real invoices
4. Check email delivery logs in Mailgun
5. Review database triggers and functions

---

**Last Updated:** January 2025
**Version:** 2.0 (Revised - Integration with existing infrastructure)
