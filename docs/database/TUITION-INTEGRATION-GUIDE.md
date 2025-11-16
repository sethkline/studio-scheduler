# Tuition Billing Integration Guide

**PR:** #6 - Tuition & Billing System
**Branch:** `claude/tuition-billing-system-011CUqjDfbLFPRQM9vCKfwp3`
**Status:** Updated to use unified payment system

---

## Changes Made

### ❌ Removed (Use Unified Tables Instead)

1. **`refunds` table** → Use unified `refunds` table from migration 006
2. **`billing_schedules` table** → Use `payment_plans` + `payment_plan_installments`
3. **Separate `studio_credits` table** → Use unified `studio_credits`
4. **Separate `studio_credit_transactions` table** → Use unified version

### ✅ Kept (Tuition-Specific Tables)

All these tables are already in `20251116_007_tuition_billing_extensions.sql`:
- `tuition_plans` - Pricing structures
- `pricing_rules` - Discounts, scholarships, coupons
- `family_discounts` - Individual discount assignments
- `tuition_invoices` - Invoice tracking
- `late_payment_penalties` - Late fee tracking
- `payment_reminders` - Reminder scheduling

### ✅ Added

- `order_line_items` - Detailed invoice breakdowns (added in new migration)
- `parent_tuition_summary` view - Parent billing dashboard

---

## Migration Files

### Required (Run in Order)

1. ✅ `20251116_006_unified_payment_system.sql` - Core unified system
2. ✅ `20251116_007_tuition_billing_extensions.sql` - Tuition-specific tables
3. ✅ `20251116_tuition_billing_integrated.sql` - Order line items + views

### Deprecated (DO NOT USE)

- ❌ `20250106_tuition_billing_system_v2.sql` - Has duplicate tables

---

## Code Migration Examples

### Creating a Tuition Invoice

**OLD WAY (separate system):**
```typescript
// Don't do this anymore
const { data: order } = await supabase
  .from('ticket_orders')
  .insert({
    order_type: 'tuition',
    user_id: parent.user_id,
    total_in_cents: amount,
    ...
  })
```

**NEW WAY (unified system):**
```typescript
// 1. Create tuition invoice
const { data: invoice } = await supabase
  .from('tuition_invoices')
  .insert({
    student_id: student.id,
    enrollment_id: enrollment.id,
    guardian_id: guardian.id,
    invoice_number: await generateInvoiceNumber(),
    tuition_amount_in_cents: tuitionAmount,
    total_amount_in_cents: tuitionAmount + fees,
    balance_in_cents: tuitionAmount + fees,
    due_date: dueDate,
    status: 'sent'
  })
  .select()
  .single()

// 2. Add line items
await supabase
  .from('order_line_items')
  .insert([
    {
      tuition_invoice_id: invoice.id,
      description: 'Monthly Tuition - Ballet Level 2',
      unit_price_in_cents: tuitionAmount,
      amount_in_cents: tuitionAmount,
      enrollment_id: enrollment.id,
      tuition_plan_id: plan.id
    },
    {
      tuition_invoice_id: invoice.id,
      description: 'Registration Fee',
      unit_price_in_cents: registrationFee,
      amount_in_cents: registrationFee
    }
  ])

// Invoice total is automatically calculated by trigger
```

### Processing a Payment

**OLD WAY:**
```typescript
// Don't create separate payment records
```

**NEW WAY:**
```typescript
// Create payment transaction (automatically updates invoice)
const { data: payment } = await supabase
  .from('payment_transactions')
  .insert({
    order_type: 'tuition',
    student_id: student.id,
    guardian_id: guardian.id,
    amount_in_cents: paymentAmount,
    payment_method: 'stripe',
    payment_status: 'completed',
    stripe_charge_id: charge.id,
    transaction_date: new Date().toISOString(),
    description: `Payment for Invoice ${invoice.invoice_number}`
  })
  .select()
  .single()

// Trigger automatically:
// - Updates tuition_invoices.amount_paid_in_cents
// - Updates tuition_invoices.balance_in_cents
// - Sets status to 'paid' when balance reaches zero
```

### Creating a Payment Plan

**OLD WAY (billing_schedules):**
```typescript
// Don't use billing_schedules anymore
```

**NEW WAY (payment_plans):**
```typescript
// 1. Create payment plan
const { data: plan } = await supabase
  .from('payment_plans')
  .insert({
    plan_type: 'tuition', // ← Important!
    student_id: student.id,
    enrollment_id: enrollment.id,
    guardian_id: guardian.id,
    plan_name: '4-Month Payment Plan',
    total_amount_in_cents: totalAmount,
    number_of_installments: 4,
    installment_amount_in_cents: Math.ceil(totalAmount / 4),
    frequency: 'monthly',
    balance_in_cents: totalAmount,
    start_date: startDate,
    next_payment_date: firstInstallmentDate,
    auto_pay_enabled: hasAutoPay
  })
  .select()
  .single()

// 2. Create installments
const installments = Array.from({ length: 4 }, (_, i) => ({
  payment_plan_id: plan.id,
  installment_number: i + 1,
  amount_in_cents: Math.ceil(totalAmount / 4),
  due_date: addMonths(firstInstallmentDate, i),
  status: 'scheduled',
  auto_pay_enabled: hasAutoPay,
  payment_method_id: paymentMethod?.id
}))

await supabase
  .from('payment_plan_installments')
  .insert(installments)
```

### Processing a Refund

**OLD WAY:**
```typescript
// Don't create separate refund table entries
```

**NEW WAY:**
```typescript
// 1. Create refund request
const { data: refund } = await supabase
  .from('refunds')
  .insert({
    payment_transaction_id: payment.id,
    refund_amount_in_cents: refundAmount,
    refund_type: 'partial', // or 'full', 'pro_rated', 'studio_credit'
    refund_status: 'pending',
    reason: 'Student withdrew from class',
    requested_by: auth.user.id,
    is_studio_credit: true // If converting to studio credit
  })
  .select()
  .single()

// 2. When approved (staff action)
await supabase
  .from('refunds')
  .update({
    refund_status: 'approved',
    approved_by: staff.user_id,
    approved_at: new Date().toISOString()
  })
  .eq('id', refund.id)

// 3. Process refund (after Stripe processes)
await supabase
  .from('refunds')
  .update({
    refund_status: 'completed',
    stripe_refund_id: stripeRefund.id,
    processed_at: new Date().toISOString(),
    completed_at: new Date().toISOString()
  })
  .eq('id', refund.id)

// If is_studio_credit = true, trigger automatically:
// - Creates studio_credits record
// - Adds studio_credit_transactions entry
// - Links refund to studio_credit_id
```

### Querying Parent Billing Summary

**NEW (use view):**
```typescript
// Get all billing info for a parent
const { data: summary } = await supabase
  .from('parent_tuition_summary')
  .select('*')
  .eq('user_id', parent.user_id)

// Returns:
// {
//   guardian_id, student_id, student_name,
//   total_invoices,
//   outstanding_amount_cents,
//   balance_due_cents,
//   next_due_date,
//   active_payment_plans,
//   payment_plan_balance_cents,
//   has_autopay_enabled
// }
```

---

## API Endpoint Updates

### Update Invoice Creation

**File:** `server/api/billing/invoices/create.post.ts`

```typescript
// OLD - Don't extend ticket_orders
// NEW - Use tuition_invoices

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getSupabaseClient()

  // Generate invoice number
  const { data: invoiceNumber } = await client
    .rpc('generate_tuition_invoice_number')

  // Create invoice
  const { data: invoice, error } = await client
    .from('tuition_invoices')
    .insert({
      student_id: body.student_id,
      enrollment_id: body.enrollment_id,
      guardian_id: body.guardian_id,
      invoice_number: invoiceNumber,
      tuition_amount_in_cents: body.tuition_amount,
      additional_fees_in_cents: body.additional_fees || 0,
      discount_amount_in_cents: body.discount_amount || 0,
      total_amount_in_cents: calculateTotal(body),
      balance_in_cents: calculateTotal(body),
      due_date: body.due_date,
      status: 'draft',
      line_items: body.line_items // JSONB
    })
    .select()
    .single()

  // Create detailed line items
  if (body.line_items && body.line_items.length > 0) {
    await client
      .from('order_line_items')
      .insert(
        body.line_items.map(item => ({
          tuition_invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price_in_cents: item.unit_price,
          amount_in_cents: item.amount,
          enrollment_id: body.enrollment_id,
          tuition_plan_id: item.tuition_plan_id,
          discount_amount_in_cents: item.discount || 0
        }))
      )
  }

  return { invoice }
})
```

### Update Payment Processing

**File:** `server/api/billing/payments/create-intent.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getSupabaseClient()

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: body.amount_in_cents,
    currency: 'usd',
    metadata: {
      student_id: body.student_id,
      tuition_invoice_id: body.tuition_invoice_id,
      order_type: 'tuition'
    }
  })

  // Create pending payment transaction
  const { data: payment } = await client
    .from('payment_transactions')
    .insert({
      order_type: 'tuition',
      student_id: body.student_id,
      guardian_id: body.guardian_id,
      amount_in_cents: body.amount_in_cents,
      payment_method: 'stripe',
      payment_status: 'pending',
      payment_intent_id: paymentIntent.id,
      description: `Payment for Invoice #${body.invoice_number}`
    })
    .select()
    .single()

  return {
    client_secret: paymentIntent.client_secret,
    payment_id: payment.id
  }
})
```

### Update Stripe Webhook

**File:** `server/api/webhooks/stripe.post.ts`

```typescript
// Update to handle tuition payments
case 'payment_intent.succeeded':
  const paymentIntent = event.data.object

  // Update payment transaction
  await client
    .from('payment_transactions')
    .update({
      payment_status: 'completed',
      stripe_charge_id: paymentIntent.latest_charge,
      transaction_date: new Date().toISOString()
    })
    .eq('payment_intent_id', paymentIntent.id)

  // Trigger automatically updates tuition_invoices balance
  break
```

---

## Testing Checklist

- [ ] Create tuition invoice
- [ ] Add line items to invoice
- [ ] Process payment (updates invoice automatically)
- [ ] Create payment plan with installments
- [ ] Process installment payment
- [ ] Enable auto-pay on payment plan
- [ ] Request refund
- [ ] Approve and process refund
- [ ] Convert refund to studio credit
- [ ] Apply studio credit to new payment
- [ ] View parent tuition summary
- [ ] Late payment penalty application
- [ ] Payment reminder scheduling

---

## Benefits of Integration

✅ One payment system for recital fees, tuition, tickets, merchandise
✅ Parents see unified payment history
✅ Shared refund and credit system
✅ One Stripe integration
✅ Consistent data model
✅ Real-time balance updates via triggers
✅ Better reporting (analytics views work across all payment types)

---

## Questions?

See:
- [UNIFIED-PAYMENT-SYSTEM-PLAN.md](./UNIFIED-PAYMENT-SYSTEM-PLAN.md)
- [SCHEMA-FIX-SUMMARY.md](./SCHEMA-FIX-SUMMARY.md)
