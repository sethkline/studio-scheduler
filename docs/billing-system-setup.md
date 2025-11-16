## Tuition & Billing System - Setup Guide (REVISED)

This document provides step-by-step instructions for setting up the comprehensive tuition and billing system, addressing all code review feedback.

---

## ✅ CODE REVIEW FIXES IMPLEMENTED

### 1. **Database Migration Fixed** ✅
- **Old Approach:** Created separate `invoices` and `payments` tables
- **New Approach:** Uses unified payment system with `tuition_invoices` and `payment_transactions`
- **Integration:** Consolidates all payment infrastructure across recitals, tuition, and tickets

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
- **New Approach:** Stripe Subscriptions with `payment_plans` table for tuition type
- **Webhook Integration:** Handles subscription events, creates `payment_transactions`
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

**Run the unified payment system migrations:**

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Run the migration files in order:
1. supabase/migrations/20251116_006_unified_payment_system.sql
2. supabase/migrations/20251116_007_tuition_billing_extensions.sql
```

**What this does:**
- Creates unified `payment_transactions` table for all payment types (recital, tuition, ticket, merchandise)
- Creates `payment_plans` table for recurring payments and installments
- Creates tuition-specific tables (`tuition_plans`, `tuition_invoices`, `pricing_rules`, `family_discounts`)
- Creates `guardians` table and `student_guardian_relationships` for family management
- Sets up RLS policies for secure access
- Creates database triggers for automatic calculations

**Verify Migration:**
```sql
-- Check that unified system tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_transactions',
  'payment_plans',
  'payment_methods',
  'tuition_plans',
  'tuition_invoices',
  'pricing_rules',
  'family_discounts',
  'guardians',
  'student_guardian_relationships',
  'refunds',
  'studio_credits'
);

-- Check that payment_transactions has transaction_type field
SELECT column_name FROM information_schema.columns
WHERE table_name = 'payment_transactions'
AND column_name = 'transaction_type';
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
   - Fetches all active enrollments through `student_guardian_relationships`
   - Groups by guardian/family
   - Calculates tuition using `calculateFamilyMonthlyTuition(guardianId)`
     - Finds applicable tuition plans for each enrollment
     - Applies multi-class discounts (2nd class 10% off)
     - Applies sibling discounts (if multiple students)
     - Applies scholarships (if configured)
   - Creates invoice in `tuition_invoices` table
   - Creates line items in `tuition_invoice_line_items`
   - Sends professional invoice email to guardian

2. **Guardians with Auto-Pay Enabled:**
   - Stripe Subscription (linked to `payment_plans` with plan_type='tuition') charges automatically
   - Webhook receives `invoice.paid` event
   - System creates `payment_transaction` record (transaction_type='tuition')
   - Updates `payment_plans` with next payment date
   - Sends payment receipt email

3. **Guardians without Auto-Pay:**
   - Guardian logs into parent portal
   - Views invoice in `/parent/billing`
   - Clicks "Pay Now"
   - Enters payment method (or uses saved method)
   - Stripe processes payment
   - Creates `payment_transaction` record
   - Invoice marked as paid in `tuition_invoices`
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

- [ ] Unified payment system migrations applied successfully
- [ ] All required tables exist: `payment_transactions`, `payment_plans`, `tuition_invoices`, `guardians`
- [ ] `payment_transactions` has `transaction_type` field with 'tuition' option
- [ ] `payment_plans` has `plan_type` field with 'tuition' option
- [ ] Default pricing rules created in `pricing_rules` table
- [ ] At least one tuition plan created in `tuition_plans` table
- [ ] Guardian relationships established in `student_guardian_relationships`
- [ ] Stripe webhook configured and receiving events
- [ ] Scheduled job runs successfully (dry run)
- [ ] Test invoice generated in `tuition_invoices` with correct discounts
- [ ] Test subscription created with `payment_plan` record (plan_type='tuition')
- [ ] Email delivery working (invoice and receipt)

---

## 📊 MONITORING

### Key Metrics to Track

```sql
-- Total outstanding balance
SELECT SUM(total_amount_in_cents - amount_paid_in_cents) / 100.0 as total_outstanding
FROM tuition_invoices
WHERE status IN ('pending', 'overdue');

-- Auto-pay enrollment rate
SELECT
  COUNT(DISTINCT guardian_id) as autopay_guardians,
  (SELECT COUNT(*) FROM guardians) as total_guardians,
  ROUND(100.0 * COUNT(DISTINCT guardian_id) / (SELECT COUNT(*) FROM guardians), 2) as autopay_rate_pct
FROM payment_plans
WHERE plan_type = 'tuition'
  AND status = 'active';

-- Failed payments (needs attention)
SELECT
  pp.*,
  g.first_name,
  g.last_name,
  p.email
FROM payment_plans pp
JOIN guardians g ON g.id = pp.guardian_id
JOIN profiles p ON p.user_id = g.user_id
WHERE pp.plan_type = 'tuition'
  AND pp.retry_count >= 3
  AND pp.status = 'suspended';

-- Monthly revenue from tuition payments
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(amount_in_cents) / 100.0 as total_revenue
FROM payment_transactions
WHERE transaction_type = 'tuition'
  AND status = 'completed'
GROUP BY month
ORDER BY month DESC;
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

**Last Updated:** November 2025
**Version:** 3.0 (Unified Payment System - Consolidates all payment infrastructure)
