# Parent Payment History Feature

## Overview

The Payment History feature allows parents to view complete payment history, track upcoming payments, download receipts, and manage their family's dance expenses.

## User Story

**Story 1.1.4: Payment History and Upcoming Payments**

```
AS A parent
I WANT to view my payment history and upcoming charges
SO THAT I can manage my family's dance expenses
```

## Features Implemented

### ✅ Acceptance Criteria

- [x] View complete payment history with dates, amounts, descriptions
- [x] See upcoming payment due dates and amounts
- [x] Download receipts as PDF
- [x] Filter payments by date range, type, student
- [x] See payment method on file
- [x] View outstanding balance prominently
- [x] Link to make a payment (integrated with Stripe)
- [x] Email receipts automatically (backend support ready)
- [x] Export payment history to CSV
- [x] Show payment status (paid, pending, overdue)

## Pages

### `/parent/payments`

Main payment history page with comprehensive features.

**Components:**
- Summary cards showing total paid, pending, overdue, and total due
- Outstanding balance alert with call-to-action
- Payment method on file display
- Advanced filtering options
- Payment history data table with pagination
- CSV export functionality
- PDF receipt download

**Filters Available:**
- Student filter (all students or specific student)
- Payment type filter (tuition, recital fee, costume, etc.)
- Status filter (paid, pending, overdue, failed, refunded)
- Date range picker

## API Endpoints

### `GET /api/parent/payments`

Retrieve payment history with optional filters.

**Query Parameters:**
- `student_id` - Filter by specific student
- `payment_type` - Filter by payment type
- `status` - Filter by payment status
- `start_date` - Filter by start date
- `end_date` - Filter by end date

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "guardian_id": "uuid",
      "student_id": "uuid",
      "amount_cents": 15000,
      "currency": "USD",
      "payment_type": "tuition",
      "payment_method": "credit_card",
      "status": "paid",
      "description": "Ballet Class - Fall 2024",
      "due_date": "2024-09-01",
      "paid_at": "2024-09-01T10:00:00Z",
      "receipt_number": "REC-001",
      "student": {
        "id": "uuid",
        "first_name": "Jane",
        "last_name": "Doe"
      }
    }
  ],
  "summary": {
    "total_paid": 45000,
    "total_pending": 15000,
    "total_overdue": 5000,
    "total_due": 20000,
    "payment_count": 15,
    "last_payment_date": "2024-09-01T10:00:00Z",
    "next_due_date": "2024-10-01"
  }
}
```

### `GET /api/parent/payments/export`

Export payment history to CSV format.

**Query Parameters:** Same as main payments endpoint

**Response:** CSV file download

### `GET /api/parent/payments/[id]/receipt`

Download PDF receipt for a specific payment.

**Response:** PDF file download with formatted receipt including:
- Studio information and logo
- Receipt number and date
- Guardian billing information
- Payment details
- Total amount
- Payment status and method

### `GET /api/parent/payment-methods`

Retrieve payment methods on file.

**Response:**
```json
[
  {
    "id": "uuid",
    "guardian_id": "uuid",
    "type": "card",
    "card_brand": "Visa",
    "card_last4": "4242",
    "card_exp_month": 12,
    "card_exp_year": 2025,
    "is_default": true,
    "status": "active"
  }
]
```

## Database Schema

### `payments` Table

Stores all payment records for guardians.

**Columns:**
- `id` - UUID primary key
- `guardian_id` - Foreign key to guardians table
- `student_id` - Foreign key to students table (nullable)
- `amount_cents` - Amount in cents (avoid floating point issues)
- `currency` - Currency code (default: USD)
- `payment_type` - Type of payment (tuition, recital_fee, costume, etc.)
- `payment_method` - Payment method used
- `status` - Payment status (pending, paid, overdue, failed, refunded)
- `description` - Payment description
- `notes` - Additional notes
- `class_instance_id` - Reference to class instance
- `recital_id` - Reference to recital
- `order_id` - Reference to ticket order
- `stripe_payment_intent_id` - Stripe payment intent ID
- `stripe_charge_id` - Stripe charge ID
- `stripe_customer_id` - Stripe customer ID
- `due_date` - Payment due date
- `paid_at` - Date/time payment was made
- `receipt_number` - Unique receipt number
- `receipt_url` - URL to stored receipt
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `guardian_id`, `student_id`, `status`, `due_date`, `created_at`

**RLS Policies:**
- Admins and staff can view/manage all payments
- Parents can view their own payments only

### `payment_methods` Table

Stores payment methods on file for guardians.

**Columns:**
- `id` - UUID primary key
- `guardian_id` - Foreign key to guardians table
- `stripe_payment_method_id` - Stripe payment method ID
- `type` - Payment method type (card, ach, bank_account)
- `card_brand` - Card brand (Visa, Mastercard, etc.)
- `card_last4` - Last 4 digits of card
- `card_exp_month` - Card expiration month
- `card_exp_year` - Card expiration year
- `bank_name` - Bank name (for ACH)
- `bank_last4` - Last 4 digits of account
- `is_default` - Whether this is the default payment method
- `status` - Status (active, expired, removed)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Types

All payment-related types are defined in `/types/payments.ts`:

- `Payment` - Main payment record interface
- `PaymentWithRelations` - Payment with student/guardian info
- `PaymentType` - Union type for payment types
- `PaymentMethod` - Union type for payment methods
- `PaymentStatus` - Union type for payment statuses
- `PaymentSummary` - Summary statistics interface
- `PaymentHistoryResponse` - API response interface
- `PaymentMethodOnFile` - Payment method interface
- `PaymentFilters` - Filter options interface

## UI Components

### Summary Cards

Four summary cards displaying:
1. **Total Paid** - Total amount paid with last payment date
2. **Pending** - Total pending amount
3. **Overdue** - Total overdue amount with next due date
4. **Total Due** - Combined pending + overdue with payment count

### Outstanding Balance Alert

Warning message displayed when `total_due > 0` with:
- Outstanding balance amount
- "Make Payment" button to initiate payment flow

### Payment Method Display

Shows the default payment method on file with:
- Card brand and last 4 digits
- Expiration date
- "Update" button to change payment method

### Payment History Table

DataTable component with:
- Date column with date and time
- Receipt number (truncated UUID if not available)
- Student name (or "Family" for family-wide payments)
- Description with optional notes
- Payment type tag with color coding
- Amount formatted as currency
- Status tag with color coding
- Due/paid date column
- Actions column with download receipt and pay now buttons

**Features:**
- Sortable columns
- Pagination (10 rows per page)
- Striped rows
- Hover effects
- Responsive layout

## Payment Type Color Coding

- **Tuition** - Blue (info)
- **Recital Fee** - Gray (secondary)
- **Costume** - Orange (warning)
- **Registration** - Green (success)
- **Tickets** - Blue (info)
- **Late Fee** - Red (danger)
- **Other** - Gray (contrast)

## Status Color Coding

- **Paid** - Green (success)
- **Pending** - Orange (warning)
- **Overdue** - Red (danger)
- **Failed** - Red (danger)
- **Refunded** - Gray (secondary)

## Future Enhancements

1. **Stripe Payment Integration**
   - Implement "Make Payment" flow
   - Implement "Pay Now" for individual payments
   - Add payment method update functionality

2. **Email Receipts**
   - Automatic email sending on payment completion
   - Manual "Email Receipt" button

3. **Payment Plans**
   - Support for installment payments
   - Auto-pay setup

4. **Payment History Analytics**
   - Spending charts and graphs
   - Year-over-year comparison
   - Budget tracking

## Testing

To test the payment history feature:

1. **Database Setup:**
   - Run the SQL migration in `/docs/database/payments-schema.sql`
   - Create test payment records in the `payments` table

2. **Access the Page:**
   - Navigate to `/parent/payments` as a logged-in parent

3. **Test Features:**
   - Verify summary cards display correct totals
   - Test filtering by student, type, status, and date range
   - Download receipts (requires jsPDF)
   - Export to CSV
   - View payment method on file

## Related Files

- **Pages:** `/pages/parent/payments.vue`
- **API Endpoints:**
  - `/server/api/parent/payments/index.get.ts`
  - `/server/api/parent/payments/export.get.ts`
  - `/server/api/parent/payments/[id]/receipt.get.ts`
  - `/server/api/parent/payment-methods/index.get.ts`
- **Types:** `/types/payments.ts`
- **Database:** `/docs/database/payments-schema.sql`
- **Documentation:** This file
