# Recital Fees & Payment Tracking System - Implementation Guide

## Overview

The Recital Fees & Payment Tracking System allows studio administrators to define, assign, and track all recital-related fees including participation fees, costume rental fees, and other charges. It includes payment plan support, balance tracking, and parent-facing payment portal.

**Priority:** Tier 1 - Critical for Next Recital

---

## Business Requirements

### User Stories

**As an Admin/Staff member, I want to:**
- Define fee types for each recital (participation, costume, etc.)
- Assign fees to students automatically or manually
- Track payment status per student
- Accept payments via Stripe, cash, or check
- Offer payment plans with installments
- Waive fees when appropriate
- Generate financial reports
- Send payment reminders
- Process refunds when needed

**As a Parent, I want to:**
- See all fees for my children in one place
- View payment history and balance
- Pay online via credit card
- Set up payment plans
- Receive receipts automatically
- Get reminders for upcoming payments
- Track which fees are for which performance

---

## Database Schema

### Tables to Create

#### 1. `recital_fee_types`
Defines available fee types for a recital.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals |
| fee_name | varchar(255) | "Participation Fee", "Costume Rental" |
| description | text | What this fee covers |
| fee_type | varchar(50) | 'participation', 'costume', 'registration', 'ticket', 'other' |
| amount_in_cents | integer | Default fee amount |
| applies_to | varchar(50) | 'all', 'per_student', 'per_performance', 'per_family' |
| is_required | boolean | Must be paid? |
| is_refundable | boolean | Can be refunded? |
| due_date | date | Payment deadline |
| early_bird_deadline | date | Early payment deadline |
| early_bird_amount_in_cents | integer | Discounted amount if paid early |
| late_fee_amount_in_cents | integer | Penalty for late payment |
| late_fee_start_date | date | When late fee applies |
| is_active | boolean | Currently accepting payments |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_id

**Example Records:**
```json
{
  "fee_name": "Recital Participation Fee",
  "fee_type": "participation",
  "amount_in_cents": 7500, // $75.00
  "applies_to": "per_student",
  "due_date": "2025-04-30",
  "early_bird_deadline": "2025-03-31",
  "early_bird_amount_in_cents": 6500 // $65.00
}
```

---

#### 2. `student_recital_fees`
Individual fee assignments to students.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | FK to students |
| recital_id | uuid | FK to recitals |
| fee_type_id | uuid | FK to recital_fee_types |
| fee_name | varchar(255) | Snapshot of fee name |
| description | text | Snapshot of description |
| amount_in_cents | integer | Amount charged (may differ from fee_type) |
| quantity | integer | Number of items (e.g., 3 costumes) |
| total_amount_in_cents | integer | amount * quantity |
| recital_performance_id | uuid | FK to recital_performances (if per-performance fee) |
| status | varchar(50) | 'pending', 'partial', 'paid', 'waived', 'refunded' |
| amount_paid_in_cents | integer | How much has been paid |
| balance_in_cents | integer | Remaining balance |
| due_date | date | When payment is due |
| paid_in_full_date | timestamptz | When fully paid |
| is_waived | boolean | Fee waived? |
| waived_by | uuid | FK to profiles (admin who waived) |
| waived_at | timestamptz | When waived |
| waiver_reason | text | Why waived |
| discount_amount_in_cents | integer | Discount applied |
| discount_reason | text | Why discounted |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- student_id
- recital_id
- status
- due_date

**Calculated Fields:**
- `balance_in_cents = total_amount_in_cents - amount_paid_in_cents - discount_amount_in_cents`
- `status` updated automatically based on payment

---

#### 3. `recital_payment_transactions`
Individual payment records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_fee_id | uuid | FK to student_recital_fees |
| student_id | uuid | FK to students |
| amount_in_cents | integer | Payment amount |
| payment_method | varchar(50) | 'stripe', 'cash', 'check', 'transfer', 'waiver' |
| payment_status | varchar(50) | 'pending', 'completed', 'failed', 'refunded' |
| payment_intent_id | varchar(255) | Stripe payment intent ID |
| stripe_charge_id | varchar(255) | Stripe charge ID |
| check_number | varchar(100) | Check number if applicable |
| guardian_id | uuid | FK to guardians (who paid) |
| paid_by_name | varchar(255) | Name on payment |
| transaction_date | timestamptz | When payment made |
| processed_by | uuid | FK to profiles (staff who recorded) |
| notes | text | Payment notes |
| receipt_url | text | Link to receipt PDF |
| receipt_sent_at | timestamptz | When receipt emailed |
| refund_amount_in_cents | integer | Amount refunded |
| refunded_at | timestamptz | When refunded |
| refund_reason | text | Why refunded |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- student_fee_id
- student_id
- guardian_id
- payment_status
- transaction_date

---

#### 4. `recital_payment_plans`
Payment plan configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | FK to students |
| recital_id | uuid | FK to recitals |
| guardian_id | uuid | FK to guardians |
| plan_name | varchar(255) | Custom plan name |
| total_amount_in_cents | integer | Total to be paid |
| number_of_installments | integer | How many payments |
| installment_amount_in_cents | integer | Amount per installment |
| frequency | varchar(50) | 'weekly', 'biweekly', 'monthly' |
| status | varchar(50) | 'active', 'completed', 'cancelled', 'defaulted' |
| amount_paid_in_cents | integer | Total paid so far |
| balance_in_cents | integer | Remaining balance |
| start_date | date | First payment date |
| next_payment_date | date | Next due date |
| final_payment_date | date | Last payment date |
| auto_pay_enabled | boolean | Automatic payments? |
| auto_pay_method_id | varchar(255) | Stripe payment method ID |
| created_by | uuid | FK to profiles |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- student_id
- recital_id
- status
- next_payment_date

---

#### 5. `payment_plan_installments`
Individual installment tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| payment_plan_id | uuid | FK to recital_payment_plans |
| installment_number | integer | 1, 2, 3, etc. |
| amount_in_cents | integer | Amount due for this installment |
| due_date | date | When due |
| status | varchar(50) | 'scheduled', 'paid', 'overdue', 'skipped' |
| paid_amount_in_cents | integer | Amount paid |
| paid_date | timestamptz | When paid |
| transaction_id | uuid | FK to recital_payment_transactions |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- payment_plan_id
- due_date
- status

---

## API Endpoints

### Admin/Staff Endpoints

#### `POST /api/recitals/[id]/fee-types`
Create a new fee type for the recital.

**Request:**
```json
{
  "fee_name": "Recital Participation Fee",
  "description": "Covers venue rental, program printing, and production costs",
  "fee_type": "participation",
  "amount_in_cents": 7500,
  "applies_to": "per_student",
  "is_required": true,
  "due_date": "2025-04-30",
  "early_bird_deadline": "2025-03-31",
  "early_bird_amount_in_cents": 6500
}
```

---

#### `GET /api/recitals/[id]/fee-types`
List all fee types for recital.

---

#### `POST /api/recitals/[id]/assign-fees`
Assign fees to students (bulk operation).

**Request:**
```json
{
  "fee_type_id": "uuid",
  "student_ids": ["uuid1", "uuid2"],
  "amount_override_in_cents": null, // Use default or override
  "due_date_override": null
}
```

**Response:**
```json
{
  "assigned_count": 45,
  "student_fees": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "fee_id": "uuid",
      "amount_in_cents": 7500,
      "status": "pending"
    }
  ]
}
```

---

#### `GET /api/recitals/[id]/fees`
Get all fee assignments for recital.

**Query Params:**
- `status` - Filter by payment status
- `student_id` - Filter by student
- `overdue` - Show only overdue

**Response:**
```json
{
  "summary": {
    "total_fees": 120,
    "total_amount_in_cents": 900000,
    "amount_paid_in_cents": 750000,
    "balance_in_cents": 150000,
    "paid_count": 95,
    "pending_count": 20,
    "overdue_count": 5
  },
  "fees": [
    {
      "id": "uuid",
      "student_name": "Emma Smith",
      "guardian_name": "Jane Smith",
      "fee_name": "Participation Fee",
      "total_amount_in_cents": 7500,
      "amount_paid_in_cents": 7500,
      "balance_in_cents": 0,
      "status": "paid",
      "due_date": "2025-04-30",
      "paid_in_full_date": "2025-03-15T14:30:00Z"
    }
  ]
}
```

---

#### `GET /api/students/[id]/fees`
Get all fees for a specific student.

---

#### `POST /api/fees/[id]/record-payment`
Record a payment for a fee.

**Request:**
```json
{
  "amount_in_cents": 7500,
  "payment_method": "stripe",
  "payment_intent_id": "pi_xxxxx",
  "guardian_id": "uuid",
  "notes": "Full payment via online portal"
}
```

---

#### `POST /api/fees/[id]/waive`
Waive a fee (full or partial).

**Request:**
```json
{
  "waive_amount_in_cents": 7500,
  "waiver_reason": "Financial hardship - approved by director"
}
```

---

#### `POST /api/fees/[id]/apply-discount`
Apply a discount to a fee.

**Request:**
```json
{
  "discount_amount_in_cents": 1000,
  "discount_reason": "Sibling discount"
}
```

---

#### `POST /api/students/[id]/payment-plan`
Create a payment plan for a student.

**Request:**
```json
{
  "recital_id": "uuid",
  "total_amount_in_cents": 22500,
  "number_of_installments": 3,
  "frequency": "monthly",
  "start_date": "2025-03-01",
  "auto_pay_enabled": false
}
```

**Response:**
```json
{
  "payment_plan": {
    "id": "uuid",
    "installment_amount_in_cents": 7500,
    "start_date": "2025-03-01",
    "final_payment_date": "2025-05-01",
    "installments": [
      {
        "installment_number": 1,
        "amount_in_cents": 7500,
        "due_date": "2025-03-01",
        "status": "scheduled"
      },
      {
        "installment_number": 2,
        "amount_in_cents": 7500,
        "due_date": "2025-04-01",
        "status": "scheduled"
      },
      {
        "installment_number": 3,
        "amount_in_cents": 7500,
        "due_date": "2025-05-01",
        "status": "scheduled"
      }
    ]
  }
}
```

---

#### `GET /api/recitals/[id]/financial-report`
Generate financial report for recital.

**Response:**
```json
{
  "recital_id": "uuid",
  "recital_name": "Spring Recital 2025",
  "report_date": "2025-03-16",
  "summary": {
    "total_revenue_in_cents": 900000,
    "total_collected_in_cents": 750000,
    "total_outstanding_in_cents": 150000,
    "total_waived_in_cents": 25000,
    "total_refunded_in_cents": 5000,
    "collection_rate": 83.33
  },
  "by_fee_type": [
    {
      "fee_type": "participation",
      "count": 100,
      "total_in_cents": 750000,
      "collected_in_cents": 625000
    }
  ],
  "payment_methods": [
    {
      "method": "stripe",
      "count": 85,
      "total_in_cents": 637500
    },
    {
      "method": "cash",
      "count": 10,
      "total_in_cents": 75000
    }
  ]
}
```

---

### Parent Endpoints

#### `GET /api/parent/fees`
Get all fees for parent's children.

**Response:**
```json
{
  "summary": {
    "total_balance_in_cents": 22500,
    "students_with_balance": 2,
    "next_due_date": "2025-04-15"
  },
  "by_student": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "fees": [
        {
          "id": "uuid",
          "fee_name": "Participation Fee",
          "total_amount_in_cents": 7500,
          "amount_paid_in_cents": 0,
          "balance_in_cents": 7500,
          "due_date": "2025-04-30",
          "status": "pending"
        }
      ],
      "total_balance_in_cents": 7500
    }
  ],
  "payment_history": [
    {
      "date": "2025-03-01",
      "amount_in_cents": 7500,
      "method": "stripe",
      "receipt_url": "/receipts/xxx.pdf"
    }
  ]
}
```

---

#### `POST /api/parent/fees/pay`
Make a payment (creates Stripe payment intent).

**Request:**
```json
{
  "fee_ids": ["uuid1", "uuid2"],
  "payment_method": "stripe"
}
```

**Response:**
```json
{
  "payment_intent_client_secret": "pi_xxx_secret_xxx",
  "amount_in_cents": 15000,
  "fees": [...]
}
```

---

#### `GET /api/parent/payment-plans`
Get active payment plans.

---

#### `POST /api/parent/payment-plans/[id]/make-payment`
Make an installment payment.

---

## UI Components & Pages

### Admin Pages

#### `/recitals/[id]/fees`
Main fee management page.

**Tabs:**
1. **Fee Types** - Define fee types
2. **Student Fees** - View/manage individual fees
3. **Transactions** - Payment history
4. **Payment Plans** - Manage plans
5. **Reports** - Financial reporting

**Components:**
- `RecitalFeeTypesTable.vue`
- `StudentFeesTable.vue`
- `PaymentTransactionsTable.vue`
- `PaymentPlansTable.vue`
- `FinancialReportDashboard.vue`

---

#### `/recitals/[id]/fees/create-fee-type`
Create new fee type dialog.

**Form Fields:**
- Fee name
- Description
- Fee type (dropdown)
- Amount
- Applies to (radio)
- Required? (checkbox)
- Due date (date picker)
- Early bird options (expandable)
- Late fee options (expandable)

**Component:**
- `CreateFeeTypeDialog.vue`

---

#### `/recitals/[id]/fees/assign`
Bulk fee assignment page.

**Features:**
- Select fee type
- Select students (with filters)
- Override amount (optional)
- Override due date (optional)
- Preview before assigning
- Bulk assign button

**Component:**
- `BulkFeeAssignment.vue`

---

#### `/students/[id]/fees`
Student-specific fee view.

**Displays:**
- All fees for this student
- Total balance
- Payment history
- Payment plan (if exists)
- Quick actions: Record payment, Waive, Apply discount

**Component:**
- `StudentFeesDashboard.vue`

---

#### Record Payment Dialog
Modal for recording cash/check payments.

**Fields:**
- Amount
- Payment method (dropdown: cash, check, transfer)
- Check number (if applicable)
- Date
- Notes
- Generate receipt? (checkbox)

**Component:**
- `RecordPaymentDialog.vue`

---

### Parent Pages

#### `/parent/payments`
Parent payment dashboard.

**Sections:**
1. **Balance Summary Card**
   - Total balance across all children
   - Next due date
   - Overdue alert (if any)

2. **Fees by Child**
   - Expandable cards per child
   - Each fee listed with status
   - Pay button per fee

3. **Payment History**
   - Table of past payments
   - Download receipt links

4. **Payment Plans**
   - Active plans
   - Upcoming installments
   - Pay installment button

**Components:**
- `ParentPaymentDashboard.vue`
- `PaymentBalanceSummary.vue`
- `StudentFeesCard.vue`
- `PaymentHistoryTable.vue`
- `PaymentPlanCard.vue`

---

#### Payment Checkout Flow

**Step 1: Select Fees**
- Checkboxes to select which fees to pay
- Show total

**Step 2: Payment Method**
- Stripe card input
- Or select saved card

**Step 3: Review & Submit**
- Confirm amount
- Process payment

**Step 4: Confirmation**
- Payment successful message
- Receipt download
- Email sent confirmation

**Component:**
- `ParentPaymentCheckout.vue`

---

## User Flows

### Flow 1: Admin Creates and Assigns Participation Fee

1. Admin goes to `/recitals/spring-2025/fees`
2. Clicks "Create Fee Type"
3. Fills in form:
   - Name: "Recital Participation Fee"
   - Type: Participation
   - Amount: $75.00
   - Applies to: Per Student
   - Required: Yes
   - Due: April 30, 2025
   - Early bird: March 31 at $65.00
4. Clicks "Create"
5. System creates fee type
6. Admin clicks "Assign Fees" tab
7. Selects "Participation Fee" from dropdown
8. System shows list of all students in recital (105 students)
9. Admin clicks "Select All"
10. Clicks "Preview Assignment"
11. Reviews: 105 students × $75 = $7,875 total
12. Clicks "Assign Fees"
13. System creates 105 student_recital_fees records
14. Shows success: "105 fees assigned"
15. System sends email notification to parents (future)

---

### Flow 2: Parent Makes Online Payment

1. Parent logs into portal
2. Sees alert: "You have $150 in outstanding fees"
3. Clicks "View & Pay Fees"
4. Sees fees for both children:
   - Emma: $75 Participation Fee (due Apr 30)
   - Sophia: $75 Participation Fee (due Apr 30)
5. Checks both boxes
6. Clicks "Pay $150"
7. Redirected to payment page
8. Enters credit card info (Stripe)
9. Reviews total: $150.00
10. Clicks "Pay Now"
11. Stripe processes payment
12. System:
    - Creates 2 payment_transactions records
    - Updates both fees to status: 'paid'
    - Generates receipt PDF
    - Sends receipt email
13. Parent sees success message
14. Can download receipt
15. Balance updated to $0

---

### Flow 3: Admin Sets Up Payment Plan

1. Admin goes to `/students/emma-smith/fees`
2. Sees total balance: $225 (participation + 3 costumes)
3. Parent requested payment plan
4. Admin clicks "Create Payment Plan"
5. Fills in form:
   - Total: $225
   - Installments: 3
   - Frequency: Monthly
   - Start: March 1
6. System calculates: $75/month
7. Shows schedule:
   - Payment 1: Mar 1 - $75
   - Payment 2: Apr 1 - $75
   - Payment 3: May 1 - $75
8. Admin reviews and clicks "Create Plan"
9. System:
   - Creates payment_plan record
   - Creates 3 installment records
   - Updates fees to link to plan
10. Admin sees plan active
11. System sends email to parent with plan details
12. Parent can view plan in portal
13. On due dates, parent gets reminder emails

---

## Implementation Steps

### Phase 1: Database & Core API (Week 1)

1. Create database migration (5 tables)
2. Create TypeScript types (`/types/payments.ts`)
3. Build fee type CRUD endpoints
4. Build student fee assignment logic
5. Build payment recording endpoint
6. Test with Postman

---

### Phase 2: Admin Fee Management (Week 2)

1. Build fee types management page
2. Build bulk fee assignment UI
3. Build student fees table with filters
4. Build record payment dialog
5. Build waive/discount dialogs
6. Build payment plan creation

---

### Phase 3: Parent Payment Portal (Week 3)

1. Build parent payment dashboard
2. Integrate Stripe checkout
3. Build payment confirmation flow
4. Build receipt generation
5. Build payment history view
6. Build payment plan display

---

### Phase 4: Reporting & Automation (Week 4)

1. Build financial reports
2. Build payment reminders (email)
3. Build overdue alerts
4. Build auto-charge for payment plans
5. Build refund processing
6. Analytics dashboard

---

## Stripe Integration

### Setup Required

1. **Stripe Account**
   - Already configured in project
   - Use existing `STRIPE_SECRET_KEY`

2. **Payment Intents**
   - Create payment intent when parent initiates payment
   - Return client secret to frontend
   - Frontend uses Stripe.js to collect card

3. **Webhooks**
   - Listen for `payment_intent.succeeded`
   - Update transaction status
   - Send receipt email

4. **Payment Methods (Future)**
   - Save cards for payment plans
   - Auto-charge on due dates

---

## Email Notifications

### Templates Needed

1. **Fee Assigned**
   - Subject: "Recital Fees for [Student Name]"
   - Content: List of fees, amounts, due dates

2. **Payment Received**
   - Subject: "Payment Receipt - [Student Name]"
   - Content: Amount paid, remaining balance, receipt PDF

3. **Payment Reminder**
   - Subject: "Reminder: Payment Due [Date]"
   - Content: Balance, due date, pay now link

4. **Overdue Notice**
   - Subject: "Overdue Payment - Action Required"
   - Content: Overdue amount, late fees, contact info

5. **Payment Plan Created**
   - Subject: "Payment Plan Confirmation"
   - Content: Plan details, installment schedule

6. **Installment Reminder**
   - Subject: "Payment Plan Installment Due [Date]"
   - Content: Installment amount, due date

---

## Security Considerations

1. **PCI Compliance**
   - Never store credit card numbers
   - Use Stripe.js to tokenize cards
   - Server only handles payment intent IDs

2. **Authorization**
   - Parents can only view their children's fees
   - Only admins/staff can waive fees
   - Only admins/staff can record cash payments

3. **Audit Trail**
   - Log all payment actions
   - Track who waived fees and why
   - Maintain refund history

---

## Testing Checklist

### Database
- [ ] All tables created
- [ ] Balance auto-calculates correctly
- [ ] Payment triggers update fees
- [ ] RLS policies work for each role

### API
- [ ] Create fee type works
- [ ] Bulk assign fees creates correct records
- [ ] Record payment updates balance
- [ ] Payment plan creates installments
- [ ] Financial report calculates correctly
- [ ] Parent can only see their fees

### Stripe
- [ ] Payment intent created
- [ ] Card charged successfully
- [ ] Webhook updates transaction
- [ ] Test mode works
- [ ] Error handling works

### UI - Admin
- [ ] Fee type creation validates
- [ ] Bulk assignment works
- [ ] Payment recording updates instantly
- [ ] Reports display correctly
- [ ] Filters work properly

### UI - Parent
- [ ] Balance displays correctly
- [ ] Payment checkout works
- [ ] Receipt downloads
- [ ] Payment history accurate
- [ ] Payment plans show installments

---

## Success Metrics

- **Payment Collection Rate:** 95%+ fees collected by due date
- **Online Payment Adoption:** 70%+ payments made online
- **Admin Time Savings:** 80% reduction in manual tracking
- **Parent Satisfaction:** 85%+ satisfaction with payment portal
- **Dispute Rate:** <2% payment disputes

---

## Future Enhancements

1. **Auto-payment for Plans**
   - Save payment methods
   - Auto-charge on due dates

2. **Early Payment Incentives**
   - Automated discounts
   - Tracking and reporting

3. **Family Discounts**
   - Multi-child discounts
   - Sibling fee reductions

4. **Financial Aid Applications**
   - Online application form
   - Approval workflow
   - Automatic fee waivers

5. **Installment Flexibility**
   - Custom payment schedules
   - Parent-initiated plans

6. **Mobile Payments**
   - Apple Pay / Google Pay
   - Text-to-pay

---

## Questions for Stakeholders

1. What payment methods should we accept? (Stripe, cash, check, Venmo?)
2. Should parents be able to create their own payment plans?
3. What is the policy for late payments and fees?
4. Should we send automated reminders? How many days before due date?
5. What is the refund policy?
6. Should we offer financial aid applications?
7. Are sibling discounts automatic or manual?
8. Do we need to track tax-deductible donations separately?

---

## Estimated Effort

- **Database & Core API:** 20 hours
- **Admin Fee Management:** 32 hours
- **Parent Payment Portal:** 28 hours
- **Stripe Integration:** 16 hours
- **Reporting:** 12 hours
- **Testing & Bug Fixes:** 16 hours
- **Documentation:** 8 hours

**Total:** ~132 hours (~16-17 days for one developer)

---

## Dependencies

- Existing Stripe integration
- Email service (Mailgun)
- PDF generation (for receipts)
- Student/guardian relationship data

---

## Related Features

- **Parent Portal** - Display fees and payments
- **Email System** - Send payment notifications
- **Reporting** - Financial analytics
- **Costume Management** - Costume rental fees integration
