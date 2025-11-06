# Tuition & Billing System Documentation

## Overview

The Tuition & Billing System is a comprehensive financial management solution for dance studios. It handles all aspects of tuition billing, payment processing, discounts, scholarships, refunds, and financial reporting.

## Features

### 1. Tuition Plan Management
- Multiple pricing models: per-class, monthly, semester, annual
- Class-specific and general pricing plans
- Registration fees, costume fees, and recital fees
- Effective date ranges for historical pricing

### 2. Automated Monthly Billing
- Automatic invoice generation based on active enrollments
- Multi-class and sibling discounts applied automatically
- Email delivery with professional invoice layout
- Scheduled job infrastructure for monthly billing

### 3. Payment Processing
- Stripe integration for credit card payments
- Secure payment intent-based processing
- Automatic receipt generation and email delivery
- Payment allocation across multiple invoices
- Support for partial payments

### 4. Auto-Pay Enrollment
- Parents can save payment methods for automatic billing
- Optional auto-pay discount to incentivize enrollment
- Automatic retry logic for failed payments (3 attempts)
- Daily scheduled job for processing auto-pay

### 5. Discount & Scholarship Management
- Percentage or fixed-amount discounts
- Multi-class discounts (10% off 2nd class, 15% off 3rd, etc.)
- Sibling discounts
- Early registration discounts
- Coupon codes with usage limits
- Scholarship programs with approval workflow

### 6. Refund Management
- Full, partial, and pro-rated refunds
- Stripe integration for automated refund processing
- Studio credit as alternative to cash refund
- Approval workflow for refund requests

### 7. Late Payment Tracking
- Automatic overdue invoice marking
- Escalating payment reminders (3, 7, 14, 30 days)
- Late fee calculation and application
- Grace period configuration
- Email reminder templates

### 8. Financial Reporting
- Revenue summary by month
- Outstanding balance report by family
- Aging report (30, 60, 90+ days overdue)
- Payment method breakdown
- Export capabilities

## Database Schema

### Core Tables

#### `tuition_plans`
Defines pricing models for classes.

**Key Fields:**
- `plan_type`: 'per_class' | 'monthly' | 'semester' | 'annual'
- `base_price`: Base tuition amount
- `registration_fee`, `costume_fee`, `recital_fee`: Additional fees
- `effective_from`, `effective_to`: Date range for pricing
- `class_definition_id`: Optional link to specific class

#### `pricing_rules`
Defines discount rules and coupon codes.

**Key Fields:**
- `discount_type`: 'percentage' | 'fixed_amount'
- `discount_scope`: 'multi_class' | 'sibling' | 'early_registration' | 'scholarship' | 'coupon'
- `coupon_code`: Optional coupon code
- `max_uses`, `current_uses`: Usage tracking

#### `invoices`
Monthly tuition invoices.

**Key Fields:**
- `invoice_number`: Unique identifier (INV-YYYYMM-XXXXX)
- `status`: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial_paid' | 'overdue' | 'cancelled' | 'refunded'
- `total_amount`, `amount_paid`, `amount_due`: Financial tracking
- `late_fee_applied`: Late fee amount

#### `invoice_line_items`
Individual charges on an invoice.

**Key Fields:**
- `description`: Line item description
- `quantity`, `unit_price`, `amount`: Pricing
- `enrollment_id`: Link to class enrollment
- `discount_amount`, `discount_description`: Applied discounts

#### `payments`
Payment records.

**Key Fields:**
- `payment_status`: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
- `stripe_payment_intent_id`, `stripe_charge_id`: Stripe references
- `confirmation_number`: User-facing confirmation
- `payment_method_type`: 'card' | 'cash' | 'check' | 'bank_transfer'

#### `payment_methods`
Saved payment methods (via Stripe).

**Key Fields:**
- `stripe_payment_method_id`, `stripe_customer_id`: Stripe references
- `card_last4`, `card_exp_month`, `card_exp_year`: Card details
- `is_default`, `is_autopay_enabled`: Settings

#### `billing_schedules`
Auto-pay configurations.

**Key Fields:**
- `billing_day`: Day of month (1-28)
- `autopay_discount_percentage`: Discount for auto-pay enrollment
- `next_billing_date`, `last_billing_date`: Scheduling
- `retry_count`, `last_failure_reason`: Failure handling

#### `refunds`
Refund requests and processing.

**Key Fields:**
- `refund_type`: 'full' | 'partial' | 'pro_rated' | 'studio_credit'
- `refund_status`: 'pending' | 'approved' | 'processing' | 'completed' | 'failed'
- `approved_by`, `approved_at`: Approval workflow
- `stripe_refund_id`: Stripe reference

## API Endpoints

### Tuition Plans

#### `GET /api/billing/tuition-plans`
List all tuition plans with optional filtering.

**Query Parameters:**
- `is_active`: Filter by active status
- `plan_type`: Filter by plan type
- `class_definition_id`: Filter by class
- `effective_date`: Filter by effective date range

#### `POST /api/billing/tuition-plans`
Create a new tuition plan.

**Request Body:**
```json
{
  "name": "Monthly Ballet - Beginner",
  "plan_type": "monthly",
  "base_price": 125.00,
  "registration_fee": 50.00,
  "costume_fee": 75.00,
  "effective_from": "2025-01-01",
  "class_definition_id": "uuid",
  "is_active": true
}
```

#### `PUT /api/billing/tuition-plans/[id]`
Update a tuition plan.

#### `DELETE /api/billing/tuition-plans/[id]`
Archive a tuition plan (soft delete).

### Pricing Rules

#### `GET /api/billing/pricing-rules`
List pricing rules (discounts).

#### `POST /api/billing/pricing-rules`
Create a new pricing rule.

**Example - Multi-Class Discount:**
```json
{
  "name": "Second Class Discount",
  "discount_type": "percentage",
  "discount_scope": "multi_class",
  "discount_percentage": 10.00,
  "applies_to_class_number": 2,
  "is_active": true
}
```

**Example - Coupon Code:**
```json
{
  "name": "Early Bird Special",
  "discount_type": "percentage",
  "discount_scope": "coupon",
  "discount_percentage": 15.00,
  "coupon_code": "EARLYBIRD2025",
  "max_uses": 50,
  "valid_from": "2025-01-01",
  "valid_to": "2025-01-31"
}
```

#### `POST /api/billing/pricing-rules/validate-coupon`
Validate a coupon code.

**Request Body:**
```json
{
  "coupon_code": "EARLYBIRD2025"
}
```

### Family Discounts

#### `GET /api/billing/family-discounts`
List family-specific discounts and scholarships.

#### `POST /api/billing/family-discounts`
Apply a discount or scholarship to a student.

**Example - Scholarship:**
```json
{
  "student_id": "uuid",
  "pricing_rule_id": "uuid",
  "is_scholarship": true,
  "scholarship_percentage": 50.00,
  "scholarship_notes": "50% scholarship for financial need",
  "valid_from": "2025-01-01",
  "valid_to": "2025-12-31"
}
```

### Invoices

#### `GET /api/billing/invoices`
List invoices with filtering.

**Query Parameters:**
- `parent_user_id`: Filter by parent
- `student_id`: Filter by student
- `status`: Filter by status (can be array)
- `overdue`: Filter overdue invoices ('true')
- `start_date`, `end_date`: Date range
- `page`, `limit`: Pagination

#### `POST /api/billing/invoices`
Create a manual invoice.

**Request Body:**
```json
{
  "parent_user_id": "uuid",
  "student_id": "uuid",
  "issue_date": "2025-01-01",
  "due_date": "2025-01-15",
  "line_items": [
    {
      "description": "Ballet - January Tuition",
      "quantity": 1,
      "unit_price": 125.00,
      "enrollment_id": "uuid",
      "tuition_plan_id": "uuid"
    }
  ],
  "notes": "First month tuition"
}
```

#### `GET /api/billing/invoices/[id]`
Get invoice details with line items.

#### `POST /api/billing/invoices/[id]/send`
Send invoice to parent via email.

### Payments

#### `POST /api/billing/payments/create-intent`
Create a Stripe payment intent for invoice payment.

**Request Body:**
```json
{
  "invoice_id": "uuid",
  "amount": 125.00,
  "save_payment_method": true
}
```

#### `POST /api/billing/payments/confirm`
Confirm a payment after Stripe processing.

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxxxxxxxxxxxx"
}
```

### Refunds

#### `POST /api/billing/refunds`
Request a refund.

**Request Body:**
```json
{
  "payment_id": "uuid",
  "refund_amount": 125.00,
  "refund_type": "full",
  "reason": "Student withdrew from class",
  "is_studio_credit": false
}
```

#### `POST /api/billing/refunds/[id]/approve`
Approve and process a refund (Admin/Staff only).

### Scheduled Jobs

#### `POST /api/billing/jobs/generate-monthly-invoices`
Generate monthly invoices for all active enrollments.

**Request Body:**
```json
{
  "billing_date": "2025-01-01",
  "dry_run": true
}
```

**Response:**
```json
{
  "success": true,
  "invoices_generated": 45,
  "invoices_failed": 2,
  "total_amount": 5625.00,
  "errors": []
}
```

#### `POST /api/billing/jobs/process-autopay`
Process auto-pay billing schedules.

**Run:** Daily

#### `POST /api/billing/jobs/process-overdue-invoices`
Mark overdue invoices and send payment reminders.

**Run:** Daily

### Financial Reports

#### `GET /api/billing/reports/revenue-summary`
Get revenue summary by month.

**Query Parameters:**
- `start_date`, `end_date`: Date range

#### `GET /api/billing/reports/outstanding-balances`
Get outstanding balances by family.

#### `GET /api/billing/reports/aging-report`
Get aging report (30, 60, 90+ days overdue).

## Scheduled Jobs Setup

The billing system requires three scheduled jobs to run automatically:

### 1. Monthly Invoice Generation
**Frequency:** Monthly (e.g., 1st of each month at 6:00 AM)
**Endpoint:** `POST /api/billing/jobs/generate-monthly-invoices`
**Description:** Generates invoices for all active enrollments

### 2. Auto-Pay Processing
**Frequency:** Daily (e.g., every day at 3:00 AM)
**Endpoint:** `POST /api/billing/jobs/process-autopay`
**Description:** Charges payment methods for families enrolled in auto-pay

### 3. Overdue Invoice Processing
**Frequency:** Daily (e.g., every day at 8:00 AM)
**Endpoint:** `POST /api/billing/jobs/process-overdue-invoices`
**Description:** Marks overdue invoices and sends payment reminders

### Setup Options

#### Option 1: External Cron Service (Recommended)
Use a service like [Cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create an account
2. Add three scheduled jobs with the endpoints above
3. Set authentication headers if needed
4. Configure retry logic and notifications

#### Option 2: Server-Side Cron
If you have server access:

```bash
# Add to crontab
0 6 1 * * curl -X POST https://yourdomain.com/api/billing/jobs/generate-monthly-invoices
0 3 * * * curl -X POST https://yourdomain.com/api/billing/jobs/process-autopay
0 8 * * * curl -X POST https://yourdomain.com/api/billing/jobs/process-overdue-invoices
```

#### Option 3: Supabase pg_cron (Advanced)
Enable pg_cron extension in Supabase and create scheduled functions.

## Configuration

### Environment Variables

The billing system uses existing Stripe environment variables:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### Billing Configuration

Create a billing configuration in the studio profile or as a separate settings table:

```typescript
interface BillingConfiguration {
  late_fee_percentage: number         // e.g., 5 (for 5%)
  late_fee_flat_amount: number        // e.g., 10.00
  late_fee_grace_period_days: number  // e.g., 3
  autopay_discount_percentage: number // e.g., 2 (for 2% discount)
  tax_rate: number                    // e.g., 0 (no tax) or 7.5
  invoice_due_days: number            // e.g., 14 (due in 14 days)
  payment_retry_attempts: number      // e.g., 3
  payment_retry_interval_days: number // e.g., 3
}
```

## Workflow Examples

### 1. Monthly Billing Workflow

1. **Day 1 of Month:** Scheduled job runs `generate-monthly-invoices`
   - System fetches all active enrollments
   - Groups enrollments by parent
   - Applies tuition plans and calculates totals
   - Applies multi-class and sibling discounts automatically
   - Applies family-specific scholarships
   - Creates invoices with line items
   - Sends invoice emails to parents

2. **Throughout Month:** Auto-pay processing
   - Daily job runs `process-autopay`
   - Charges families enrolled in auto-pay on their billing day
   - Sends payment receipts
   - Retries failed payments

3. **Throughout Month:** Late payment tracking
   - Daily job runs `process-overdue-invoices`
   - Marks invoices as overdue
   - Sends payment reminders (3, 7, 14, 30 days)
   - Applies late fees after grace period

### 2. Parent Payment Workflow

1. Parent receives invoice email
2. Parent logs into parent portal
3. Parent views invoice details
4. Parent clicks "Pay Now"
5. System creates Stripe payment intent
6. Parent enters payment details
7. Stripe processes payment
8. System confirms payment and updates invoice
9. Parent receives payment receipt email

### 3. Scholarship Application Workflow

1. Admin creates scholarship pricing rule
2. Admin applies scholarship to specific student
3. System stores family discount record
4. During invoice generation:
   - System detects active scholarship
   - Applies discount to line items for that student
   - Shows discount on invoice

### 4. Refund Workflow

1. Parent or admin requests refund
2. System creates refund record with "pending" status
3. Admin reviews refund request
4. Admin approves refund
5. System processes refund:
   - **Cash Refund:** Creates Stripe refund
   - **Studio Credit:** Adds to parent's credit balance
6. System adjusts invoice balance
7. Parent receives confirmation

## Security & Permissions

### Role-Based Access Control

- **Admin/Staff:**
  - Full access to all billing features
  - Create/edit tuition plans and pricing rules
  - Approve refunds
  - View all financial reports

- **Parents:**
  - View their own invoices and payments
  - Make payments
  - Request refunds
  - Manage payment methods
  - Enroll in auto-pay

- **Teachers:**
  - No billing access by default

### Row-Level Security (RLS)

All billing tables use Supabase RLS policies to ensure:
- Parents can only see their own financial data
- Admin/Staff can see all data
- Proper authentication is enforced

## Testing

### Test Scenarios

1. **Invoice Generation:**
   - Test with various enrollment combinations
   - Verify discount calculations
   - Test dry_run mode

2. **Payment Processing:**
   - Use Stripe test cards (4242 4242 4242 4242)
   - Test failed payments (4000 0000 0000 0002)
   - Test partial payments

3. **Auto-Pay:**
   - Create test billing schedule
   - Manually trigger auto-pay job
   - Verify retry logic with failed payments

4. **Refunds:**
   - Test full and partial refunds
   - Test studio credit option
   - Verify Stripe refund processing

5. **Late Fees:**
   - Create backdated invoice
   - Manually trigger overdue job
   - Verify late fee calculation

## Troubleshooting

### Common Issues

**Issue:** Invoices not generating automatically
**Solution:** Check scheduled job configuration and logs

**Issue:** Payment failing with Stripe
**Solution:** Verify Stripe API keys, check Stripe dashboard for errors

**Issue:** Emails not sending
**Solution:** Verify Mailgun configuration, check email service logs

**Issue:** Discounts not applying
**Solution:** Check pricing rule active status and date ranges

**Issue:** Auto-pay not processing
**Solution:** Verify payment method is active and not expired

## Future Enhancements

Potential features for future development:

1. **Payment Plans:** Installment payment options for large balances
2. **Automatic Tax Calculation:** Integration with tax services
3. **Multiple Currency Support:** For international studios
4. **Invoice Customization:** Custom invoice templates and branding
5. **Batch Payment Processing:** Process multiple invoices in one payment
6. **Parent Portal Enhancements:** Payment history charts and analytics
7. **SMS Reminders:** Text message payment reminders
8. **Quickbooks Integration:** Export to accounting software
9. **Bank Transfer Support:** ACH/bank account payments
10. **Recurring Subscription Model:** Alternative to monthly invoicing

## Support

For questions or issues with the billing system, please:

1. Check this documentation
2. Review the code comments in the implementation files
3. Check the database schema and views
4. Test in a development environment first
5. Contact the development team

---

**Last Updated:** January 2025
**Version:** 1.0.0
