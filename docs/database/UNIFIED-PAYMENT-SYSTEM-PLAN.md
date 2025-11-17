# Unified Payment System - Implementation Plan

**Date:** 2025-11-16
**Status:** Planning
**Goal:** Consolidate overlapping payment/billing infrastructure across multiple PRs

---

## Problem Statement

Three PRs are creating duplicate payment infrastructure:
- **Tier 1** (implemented): Recital fees, payment plans, installments
- **PR #6** (pending): Tuition billing, refunds, auto-pay
- **PR #14** (pending): Analytics payment/invoice tracking

This creates:
- Data fragmentation across multiple tables
- Sync complexity
- Multiple "sources of truth"
- Webhook routing confusion
- Code duplication

---

## Unified Architecture

### Core Principle
**One payment system to rule them all** - extend Tier 1's payment infrastructure to support all payment types.

### Payment Types Hierarchy
```
ticket_orders (existing)
├── order_type: 'ticket' (existing)
├── order_type: 'tuition' (NEW)
├── order_type: 'merchandise' (NEW)
└── order_type: 'recital_fee' (NEW - migrate from recital_payment_transactions)
```

---

## Phase 1: Extend Tier 1 Tables (Backward Compatible)

### 1.1 Extend `recital_payment_transactions` → Rename to `payment_transactions`
**Purpose:** Make it universal for ALL payment types

**Changes:**
```sql
-- Rename table
ALTER TABLE recital_payment_transactions RENAME TO payment_transactions;

-- Add order_type column
ALTER TABLE payment_transactions
  ADD COLUMN order_type VARCHAR(50) DEFAULT 'recital_fee'
  CHECK (order_type IN ('recital_fee', 'tuition', 'ticket', 'merchandise', 'other'));

-- Add references to different order systems
ALTER TABLE payment_transactions
  ADD COLUMN ticket_order_id UUID REFERENCES ticket_orders(id),
  ADD COLUMN merchandise_order_id UUID REFERENCES merchandise_orders(id);

-- Keep existing student_fee_id for backward compatibility with recital fees
-- student_fee_id UUID REFERENCES student_recital_fees(id) -- ALREADY EXISTS
```

**Backward Compatibility:**
- Existing recital transactions have `order_type = 'recital_fee'` (default)
- Existing code continues to work
- `student_fee_id` remains populated for recital fees

---

### 1.2 Extend `recital_payment_plans` → Rename to `payment_plans`
**Purpose:** Support payment plans for tuition, not just recitals

**Changes:**
```sql
-- Rename table
ALTER TABLE recital_payment_plans RENAME TO payment_plans;

-- Add plan_type column
ALTER TABLE payment_plans
  ADD COLUMN plan_type VARCHAR(50) DEFAULT 'recital'
  CHECK (plan_type IN ('recital', 'tuition', 'general'));

-- Make recital_id nullable (not all plans are recital-specific)
ALTER TABLE payment_plans ALTER COLUMN recital_id DROP NOT NULL;

-- Add enrollment_id for tuition plans
ALTER TABLE payment_plans
  ADD COLUMN enrollment_id UUID REFERENCES enrollments(id);

-- Add constraint: must have either recital_id OR enrollment_id
ALTER TABLE payment_plans
  ADD CONSTRAINT payment_plan_reference_check
  CHECK (
    (recital_id IS NOT NULL AND enrollment_id IS NULL) OR
    (recital_id IS NULL AND enrollment_id IS NOT NULL)
  );
```

---

### 1.3 Create `payment_methods` Table (from PR #6)
**Purpose:** Store Stripe payment methods for auto-pay
**Status:** NEW - no conflict, this is needed

```sql
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,

  -- Payment method details
  payment_method_type VARCHAR(50) NOT NULL DEFAULT 'card',
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_autopay_enabled BOOLEAN DEFAULT false,
  nickname VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.4 Extend `payment_plan_installments`
**Purpose:** Add auto-pay support

**Changes:**
```sql
-- Add payment method reference
ALTER TABLE payment_plan_installments
  ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id),
  ADD COLUMN auto_pay_enabled BOOLEAN DEFAULT false,
  ADD COLUMN auto_pay_attempted_at TIMESTAMPTZ,
  ADD COLUMN auto_pay_failed_reason TEXT;
```

---

### 1.5 Create `refunds` Table (from PR #6, but universal)
**Purpose:** Track refunds for ALL payment types
**Status:** NEW - replaces refund columns in payment_transactions

```sql
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,

  -- Refund details
  refund_amount_in_cents INTEGER NOT NULL,
  refund_type VARCHAR(50) NOT NULL CHECK (refund_type IN ('full', 'partial', 'pro_rated', 'studio_credit')),
  refund_status VARCHAR(50) DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),

  -- Stripe integration
  stripe_refund_id VARCHAR(255) UNIQUE,

  -- Approval workflow
  reason TEXT NOT NULL,
  internal_notes TEXT,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Processing
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Studio credit
  is_studio_credit BOOLEAN DEFAULT false,
  studio_credit_id UUID REFERENCES studio_credits(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.6 Create `studio_credits` Table (from PR #6)
**Purpose:** Track studio credit balances
**Status:** NEW - no conflict

```sql
CREATE TABLE IF NOT EXISTS studio_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  total_credit_in_cents INTEGER NOT NULL DEFAULT 0,
  used_credit_in_cents INTEGER DEFAULT 0,
  available_credit_in_cents INTEGER GENERATED ALWAYS AS (total_credit_in_cents - used_credit_in_cents) STORED,

  expires_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_credit_id UUID REFERENCES studio_credits(id) ON DELETE CASCADE,

  transaction_type VARCHAR(50) NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  description TEXT,

  refund_id UUID REFERENCES refunds(id),
  payment_transaction_id UUID REFERENCES payment_transactions(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Tuition-Specific Extensions (PR #6)

### 2.1 Create `tuition_plans` Table
**Purpose:** Define tuition pricing structures
**Status:** Keep as-is from PR #6, but integrate with unified payments

```sql
-- From PR #6, no changes needed
CREATE TABLE IF NOT EXISTS tuition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) NOT NULL, -- 'per_class', 'monthly', 'semester', 'annual'
  is_active BOOLEAN DEFAULT true,

  -- Pricing
  base_price_in_cents INTEGER NOT NULL,
  classes_per_week INTEGER,
  registration_fee_in_cents INTEGER DEFAULT 0,

  -- Restrictions
  class_definition_id UUID REFERENCES class_definitions(id),
  class_level_id UUID REFERENCES class_levels(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Create `pricing_rules` & `family_discounts` Tables
**Purpose:** Flexible discounts, scholarships, coupons
**Status:** Keep from PR #6, applies to both tuition and recital fees

---

## Phase 3: Newsletter Integration (PR #15)

### 3.1 Extend `email_campaign_unsubscribes` Table
**Purpose:** Track both studio emails AND blog newsletter preferences

**Changes:**
```sql
-- Add subscription type tracking
ALTER TABLE email_campaign_unsubscribes
  ADD COLUMN unsubscribe_categories TEXT[] DEFAULT ARRAY['all'];
  -- Possible values: 'all', 'studio_updates', 'blog_newsletter', 'marketing', 'recital_updates'

-- Add blog-specific fields
ALTER TABLE email_campaign_unsubscribes
  ADD COLUMN blog_subscriber_since TIMESTAMPTZ,
  ADD COLUMN blog_subscription_source VARCHAR(50); -- 'website_form', 'blog_footer', 'admin_import'
```

### 3.2 Extend `email_campaigns` Table
**Purpose:** Support blog newsletters

**Changes:**
```sql
-- Add campaign_category
ALTER TABLE email_campaigns
  ADD COLUMN campaign_category VARCHAR(50) DEFAULT 'studio_update'
  CHECK (campaign_category IN ('studio_update', 'blog_newsletter', 'marketing', 'recital_announcement', 'emergency'));

-- Add blog post reference
ALTER TABLE email_campaigns
  ADD COLUMN blog_post_id UUID REFERENCES blog_posts(id);
```

### 3.3 NO `newsletter_subscribers` table needed
Instead, use existing infrastructure with filters.

---

## Phase 4: Analytics Views (PR #14)

### 4.1 Create Analytics Views - NO NEW TABLES
**Purpose:** Aggregate data from existing tables for reporting

**Views to Create:**
```sql
-- Unified payment summary
CREATE OR REPLACE VIEW analytics_payment_summary AS
SELECT
  pt.id,
  pt.order_type as payment_type,
  pt.student_id,
  pt.amount_in_cents,
  pt.payment_status,
  pt.transaction_date as payment_date,
  pt.payment_method,
  pt.stripe_charge_id,
  s.first_name || ' ' || s.last_name as student_name,
  CASE
    WHEN pt.order_type = 'recital_fee' THEN r.name
    WHEN pt.order_type = 'ticket' THEN rs.name
    ELSE NULL
  END as event_name
FROM payment_transactions pt
LEFT JOIN students s ON pt.student_id = s.id
LEFT JOIN student_recital_fees srf ON pt.student_fee_id = srf.id
LEFT JOIN recitals r ON srf.recital_id = r.id
LEFT JOIN ticket_orders tor ON pt.ticket_order_id = tor.id
LEFT JOIN recital_shows rs ON tor.recital_show_id = rs.id;

-- Revenue by payment type
CREATE OR REPLACE VIEW analytics_revenue_by_type AS
SELECT
  order_type,
  DATE_TRUNC('month', transaction_date) as month,
  COUNT(*) as transaction_count,
  SUM(amount_in_cents) as total_revenue_cents,
  AVG(amount_in_cents) as avg_transaction_cents
FROM payment_transactions
WHERE payment_status = 'completed'
GROUP BY order_type, DATE_TRUNC('month', transaction_date);

-- Outstanding balances
CREATE OR REPLACE VIEW analytics_outstanding_balances AS
SELECT
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,
  SUM(srf.balance_in_cents) as total_balance_cents,
  COUNT(srf.id) as outstanding_fee_count,
  MIN(srf.due_date) as earliest_due_date
FROM students s
JOIN student_recital_fees srf ON s.id = srf.student_id
WHERE srf.status IN ('pending', 'partial')
GROUP BY s.id, s.first_name, s.last_name;
```

---

## Migration Strategy

### Step 1: Create Backup
```sql
-- Backup existing tables before changes
CREATE TABLE recital_payment_transactions_backup AS
SELECT * FROM recital_payment_transactions;

CREATE TABLE recital_payment_plans_backup AS
SELECT * FROM recital_payment_plans;
```

### Step 2: Apply Schema Changes (in order)
1. ✅ Create new tables first (`payment_methods`, `refunds`, `studio_credits`)
2. ✅ Rename existing tables (`recital_payment_transactions` → `payment_transactions`)
3. ✅ Add new columns to renamed tables
4. ✅ Update existing data (`order_type = 'recital_fee'` for all existing records)
5. ✅ Create views for analytics
6. ✅ Update RLS policies to work with renamed tables

### Step 3: Update Application Code
1. Update API endpoints to use `payment_transactions` instead of `recital_payment_transactions`
2. Update frontend components
3. Add new endpoints for tuition billing
4. Add analytics endpoints using views

### Step 4: Test & Verify
1. Test recital payment flow (ensure backward compatibility)
2. Test tuition billing flow
3. Test analytics views
4. Test Stripe webhooks

---

## Benefits of This Approach

✅ **Single source of truth** for all payments
✅ **Backward compatible** with existing Tier 1 implementation
✅ **No data migration** required for existing recital payments
✅ **Unified Stripe integration** - one webhook handler
✅ **Shared business logic** - refunds, credits, auto-pay work everywhere
✅ **Simplified analytics** - query one set of tables
✅ **Reduced code duplication** - one payment processing system
✅ **Better parent experience** - one payment history view
✅ **Easier testing** - test payment logic once

---

## Next Steps

1. Review and approve this plan
2. Create migration file: `tier1_unified_payment_system.sql`
3. Create migration file: `tier1_tuition_extensions.sql`
4. Create migration file: `tier1_newsletter_integration.sql`
5. Create view file: `analytics_views.sql`
6. Test migrations on development database
7. Update PRs #6, #14, #15 with new migrations
8. Update application code to use unified system
