# Recital Fees & Payments API

Complete API documentation for the Recital Fees & Payment Tracking feature (Tier 1, Feature #2).

## Overview

This API provides endpoints for managing recital fees, assigning them to students, tracking payments, and processing online payments through Stripe.

**Total Endpoints:** 13

---

## Table of Contents

- [Fee Types Management](#fee-types-management)
- [Student Fee Assignment](#student-fee-assignment)
- [Payment Processing](#payment-processing)
- [Parent Portal](#parent-portal)
- [Error Handling](#error-handling)

---

## Fee Types Management

### Create Fee Type

**POST** `/api/recitals/:id/fee-types`

Creates a new fee type for a recital show.

**Request Body:**
```json
{
  "name": "Participation Fee",
  "fee_type": "participation",
  "description": "Base fee for participating in the recital",
  "default_amount_in_cents": 7500,
  "due_date": "2025-05-01",
  "early_bird_amount_in_cents": 6500,
  "early_bird_deadline": "2025-04-01",
  "late_fee_amount_in_cents": 1000,
  "late_fee_start_date": "2025-05-15",
  "is_required": true,
  "is_active": true
}
```

**Response:**
```json
{
  "message": "Fee type created successfully",
  "feeType": {
    "id": "uuid",
    "recital_show_id": "uuid",
    "name": "Participation Fee",
    "fee_type": "participation",
    "default_amount_in_cents": 7500,
    ...
  }
}
```

**Validation:**
- `name` is required and must not be empty
- `fee_type` must be one of: `participation`, `costume`, `makeup`, `other`
- `default_amount_in_cents` must be a positive number
- Early bird: both amount and deadline required together
- Late fee: both amount and start date required together

---

### List Fee Types

**GET** `/api/recitals/:id/fee-types`

Retrieves all fee types for a recital with statistics.

**Query Parameters:**
- `fee_type` (optional): Filter by type (`participation`, `costume`, etc.)
- `is_active` (optional): Filter by active status (`true` or `false`)

**Response:**
```json
{
  "feeTypes": [
    {
      "id": "uuid",
      "name": "Participation Fee",
      "fee_type": "participation",
      "default_amount_in_cents": 7500,
      "assigned_count": 45,
      "collected_amount": 292500,
      ...
    }
  ],
  "summary": {
    "total_fee_types": 4,
    "active_fee_types": 3,
    "total_assigned": 180,
    "total_collected": 1350000
  }
}
```

---

### Get Fee Type

**GET** `/api/fee-types/:id`

Retrieves a single fee type by ID.

**Response:**
```json
{
  "id": "uuid",
  "recital_show_id": "uuid",
  "name": "Participation Fee",
  "fee_type": "participation",
  "default_amount_in_cents": 7500,
  "due_date": "2025-05-01",
  ...
}
```

---

### Update Fee Type

**PUT** `/api/fee-types/:id`

Updates a fee type. Only include fields you want to update.

**Request Body:**
```json
{
  "name": "Updated Fee Name",
  "default_amount_in_cents": 8000,
  "is_active": false
}
```

**Response:**
```json
{
  "message": "Fee type updated successfully",
  "feeType": {
    "id": "uuid",
    "name": "Updated Fee Name",
    ...
  }
}
```

---

### Delete Fee Type

**DELETE** `/api/fee-types/:id`

Deletes a fee type. Only allowed if no student fees have been assigned.

**Response:**
```json
{
  "message": "Fee type deleted successfully"
}
```

**Error Response (if assigned):**
```json
{
  "statusCode": 400,
  "statusMessage": "Cannot delete fee type that has been assigned to students. Remove all assignments first."
}
```

---

## Student Fee Assignment

### Get Students for Fee Assignment

**GET** `/api/recitals/:id/students-for-fees`

Retrieves all students participating in a recital with assignment status.

**Query Parameters:**
- `fee_type_id` (optional): Include to check which students already have this fee

**Response:**
```json
[
  {
    "id": "uuid",
    "first_name": "Emma",
    "last_name": "Johnson",
    "email": "emma@example.com",
    "already_assigned": false
  },
  {
    "id": "uuid",
    "first_name": "Olivia",
    "last_name": "Smith",
    "email": "olivia@example.com",
    "already_assigned": true
  }
]
```

---

### Assign Fees to Students

**POST** `/api/recitals/:id/assign-fees`

Assigns a fee type to multiple students.

**Request Body:**
```json
{
  "fee_type_id": "uuid",
  "student_ids": ["uuid1", "uuid2", "uuid3"],
  "custom_amount_in_cents": 8000,
  "custom_due_date": "2025-05-15"
}
```

**Response:**
```json
{
  "message": "Successfully assigned fees to 3 students",
  "assigned_count": 3,
  "student_fees": [
    {
      "id": "uuid",
      "student_id": "uuid1",
      "fee_type_id": "uuid",
      "total_amount_in_cents": 8000,
      "amount_paid_in_cents": 0,
      "balance_in_cents": 8000,
      "status": "pending",
      ...
    }
  ]
}
```

**Business Logic:**
- Skips students who already have this fee assigned
- Uses custom amount/due date if provided, otherwise uses fee type defaults
- Initial status is `pending`
- Initial balance equals total amount

---

### List Student Fees

**GET** `/api/recitals/:id/student-fees`

Retrieves all student fees for a recital with filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `partial`, `paid`, `waived`, `overdue`)
- `fee_type` (optional): Filter by fee type
- `search` (optional): Search by student name

**Response:**
```json
{
  "fees": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "fee_type_id": "uuid",
      "total_amount_in_cents": 7500,
      "amount_paid_in_cents": 2500,
      "balance_in_cents": 5000,
      "status": "partial",
      "due_date": "2025-05-01",
      "student": {
        "id": "uuid",
        "first_name": "Emma",
        "last_name": "Johnson"
      },
      "fee_type": {
        "id": "uuid",
        "name": "Participation Fee",
        "fee_type": "participation"
      }
    }
  ],
  "summary": {
    "total_expected": 337500,
    "total_collected": 112500,
    "total_outstanding": 225000,
    "collection_rate": 33,
    "students_with_balance": 28
  }
}
```

---

### Get Student Fee

**GET** `/api/student-fees/:id`

Retrieves a single student fee by ID with all related data.

**Response:**
```json
{
  "id": "uuid",
  "student_id": "uuid",
  "total_amount_in_cents": 7500,
  "amount_paid_in_cents": 2500,
  "balance_in_cents": 5000,
  "status": "partial",
  "student": {
    "id": "uuid",
    "first_name": "Emma",
    "last_name": "Johnson"
  },
  "fee_type": {
    "id": "uuid",
    "name": "Participation Fee"
  },
  "payment_plan": {
    "id": "uuid",
    "number_of_installments": 3,
    "installment_amount_in_cents": 2500,
    "next_payment_date": "2025-04-01"
  }
}
```

---

## Payment Processing

### Record Payment

**POST** `/api/payments/record`

Records a payment for a student fee (cash, check, bank transfer, etc.).

**Request Body:**
```json
{
  "student_fee_id": "uuid",
  "amount_in_cents": 2500,
  "payment_method": "check",
  "check_number": "12345",
  "payment_date": "2025-03-15",
  "notes": "First installment payment"
}
```

**Payment Methods:**
- `credit_card` - Online credit card payment (Stripe)
- `cash` - Cash payment
- `check` - Check payment (requires `check_number`)
- `bank_transfer` - Bank transfer (can include `transaction_id`)
- `other` - Other payment method

**Response:**
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "id": "uuid",
    "student_fee_id": "uuid",
    "amount_in_cents": 2500,
    "payment_method": "check",
    "check_number": "12345",
    "payment_date": "2025-03-15",
    "payment_status": "completed"
  },
  "updated_fee": {
    "id": "uuid",
    "amount_paid_in_cents": 5000,
    "balance_in_cents": 2500,
    "status": "partial"
  }
}
```

**Business Logic:**
- Payment amount cannot exceed outstanding balance
- Automatically updates student fee balances
- Updates status: `pending` → `partial` → `paid`
- Check number required for check payments

---

### Create Stripe Payment Intent

**POST** `/api/payments/create-fee-intent`

Creates a Stripe payment intent for credit card payments.

**Request Body:**
```json
{
  "student_fee_id": "uuid",
  "amount_in_cents": 5000,
  "notes": "Payment for participation fee"
}
```

**Response:**
```json
{
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "payment_intent_id": "pi_xxxxx"
}
```

**Usage:**
1. Call this endpoint to get `client_secret`
2. Use Stripe Elements with the client secret
3. After successful payment, call `/api/payments/record` with `stripe_payment_intent_id`

---

### Create Stripe Checkout Session

**POST** `/api/payments/create-checkout-session`

Creates a Stripe checkout session for one or more fees (used in parent portal).

**Request Body:**
```json
{
  "fee_ids": ["uuid1", "uuid2"],
  "success_url": "https://example.com/payment/success",
  "cancel_url": "https://example.com/payment/cancelled"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/xxxxx",
  "session_id": "cs_xxxxx"
}
```

**Usage:**
1. Call this endpoint with fee IDs and redirect URLs
2. Redirect user to the returned `url`
3. User completes payment on Stripe
4. User redirected to `success_url` or `cancel_url`
5. Implement Stripe webhook to record payment

**Business Logic:**
- Creates line items for each fee using current balance
- Metadata includes all fee IDs for webhook processing
- Supports multiple fees in single transaction

---

## Parent Portal

### Get Parent Fees

**GET** `/api/recitals/:id/parent-fees`

Retrieves all fees for the current user's children for a specific recital.

**Authentication:** Required (parent user)

**Response:**
```json
{
  "recital": {
    "id": "uuid",
    "name": "Spring Recital 2025"
  },
  "children": [
    {
      "student_id": "uuid",
      "student_name": "Emma Johnson",
      "student": {
        "id": "uuid",
        "first_name": "Emma",
        "last_name": "Johnson",
        "email": "emma@example.com"
      },
      "fees": [
        {
          "id": "uuid",
          "total_amount_in_cents": 7500,
          "amount_paid_in_cents": 2500,
          "balance_in_cents": 5000,
          "status": "partial",
          "due_date": "2025-05-01",
          "fee_type": {
            "name": "Participation Fee",
            "description": "Base fee for participating",
            "early_bird_amount_in_cents": 6500,
            "early_bird_deadline": "2025-04-01"
          },
          "payment_plan": null,
          "payments": [
            {
              "id": "uuid",
              "amount_in_cents": 2500,
              "payment_method": "check",
              "payment_date": "2025-03-15",
              "payment_status": "completed"
            }
          ]
        }
      ]
    }
  ]
}
```

**Business Logic:**
- Only returns fees for children linked to authenticated parent
- Includes complete payment history for each fee
- Includes payment plan details if applicable
- Returns empty array if no children or no fees

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "statusCode": 400,
  "statusMessage": "Descriptive error message"
}
```

### Common Error Codes

- **400 Bad Request:** Invalid input, validation errors
- **401 Unauthorized:** Authentication required
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **500 Internal Server Error:** Server-side error

### Example Error Responses

**Validation Error:**
```json
{
  "statusCode": 400,
  "statusMessage": "Payment amount exceeds outstanding balance"
}
```

**Not Found:**
```json
{
  "statusCode": 404,
  "statusMessage": "Fee type not found"
}
```

**Permission Error:**
```json
{
  "statusCode": 400,
  "statusMessage": "Cannot delete fee type that has been assigned to students"
}
```

---

## Status Values

### Fee Status
- `pending` - No payments made
- `partial` - Partial payment received
- `paid` - Fully paid
- `waived` - Fee waived/forgiven
- `overdue` - Past due date with balance

### Payment Status
- `pending` - Payment initiated but not completed
- `completed` - Payment successfully processed
- `failed` - Payment failed
- `refunded` - Payment refunded

### Fee Types
- `participation` - Base participation fee
- `costume` - Costume rental/purchase
- `makeup` - Professional makeup service
- `other` - Other fees

---

## Database Tables

### recital_fee_types
Defines the types of fees available for a recital.

### student_recital_fees
Individual fee assignments to students.

### recital_payment_transactions
All payment records.

### recital_payment_plans
Optional installment payment plans.

---

## Integration Notes

### Stripe Integration

1. **Environment Variables:**
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   ```

2. **Webhook Endpoint:**
   Implement `/api/payments/stripe-webhook` to handle:
   - `payment_intent.succeeded`
   - `checkout.session.completed`

3. **Metadata Usage:**
   All Stripe objects include metadata with fee IDs for webhook processing.

### RLS Policies

Supabase RLS policies should be configured to:
- Allow staff/admin full access to all endpoints
- Allow parents to view only their children's fees
- Prevent unauthorized fee modifications

---

## Testing Checklist

- [ ] Create fee types with early bird pricing
- [ ] Create fee types with late fees
- [ ] Assign fees to students individually
- [ ] Assign fees to students in bulk
- [ ] Record cash payment
- [ ] Record check payment (with check number)
- [ ] Record partial payment
- [ ] Record payment that completes a fee
- [ ] Test parent portal view
- [ ] Test Stripe payment flow
- [ ] Test payment exceeding balance (should fail)
- [ ] Test deleting fee type with assignments (should fail)
- [ ] Test filtering student fees by status
- [ ] Test searching students by name

---

## Performance Considerations

- Fee listings include aggregated statistics (assigned count, collected amount)
- Student fee queries join with students and fee types
- Parent portal queries are scoped to authenticated user's children
- Consider pagination for large student lists
- Stripe operations are async and can take 2-3 seconds

---

## Future Enhancements

- Payment plans with automatic installment schedules
- Email receipts after payment
- Automated late fee application
- Automated early bird discount application
- Refund processing
- Payment reminders
- Financial reporting and analytics
- Export to QuickBooks/accounting software
