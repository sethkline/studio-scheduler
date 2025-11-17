# Recital Fees & Payment Tracking - Setup Guide

Complete setup instructions for the Recital Fees & Payment Tracking feature (Tier 1, Feature #2).

## ✅ What's Already Complete

The following have been implemented and are ready to use:

1. **Database Schema** ✅
   - Tables: `recital_fee_types`, `student_recital_fees`, `recital_payment_transactions`, `recital_payment_plans`
   - Migrations applied to Supabase (see IMPLEMENTATION-COMPLETION-REPORT.md)
   - RLS policies configured
   - Triggers for automatic balance calculations

2. **TypeScript Types** ✅
   - `types/tier1-features.ts` - All fee and payment-related interfaces
   - Exported from `types/index.ts`

3. **Design System** ✅
   - `lib/design-system.ts` - Typography, colors, components
   - Reusable UI components in `components/common/`

4. **UI Components** ✅
   - `components/fees/FeeTypesListPage.vue` - Fee type management with statistics
   - `components/fees/CreateFeeTypeModal.vue` - Create/edit fee types with pricing
   - `components/fees/PaymentDashboardPage.vue` - Payment tracking dashboard
   - `components/fees/RecordPaymentModal.vue` - Record payment form
   - `components/fees/AssignFeesModal.vue` - Bulk fee assignment to students
   - `components/fees/ParentPaymentPortalPage.vue` - Parent-facing payment portal

5. **API Endpoints** ✅
   - 13 endpoints for fee types, student fees, payments, and Stripe integration
   - See `server/api/fees/README.md` for complete documentation

6. **Nuxt Pages** ✅
   - `/pages/recitals/[id]/fees/index.vue` - Parent payment portal (with role-based redirect)
   - `/pages/recitals/[id]/fees/types.vue` - Fee types management (staff/admin)
   - `/pages/recitals/[id]/fees/payments.vue` - Payment dashboard (staff/admin)

7. **Navigation** ✅
   - Added "Fees & Payments" link to RecitalQuickLinks component

---

## ⚙️ Required Setup Steps

### 1. Verify Database Tables

Ensure all fee and payment tables exist in your Supabase database.

**Run verification query:**

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'recital_fee_types',
    'student_recital_fees',
    'recital_payment_transactions',
    'recital_payment_plans'
  )
ORDER BY table_name;
```

**Expected result:** 4 tables

If tables are missing, refer to `DATABASE-IMPLEMENTATION-GUIDE.md` to create them.

---

### 2. Configure Stripe (Optional for Credit Card Payments)

If you want to accept online credit card payments, configure Stripe.

**Steps:**

1. **Sign up for Stripe:** https://dashboard.stripe.com/register
2. **Get API keys:** Dashboard → Developers → API keys
3. **Add to `.env`:**
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   ```
4. **For production:** Use live keys (`sk_live_xxx` and `pk_live_xxx`)

**Note:** Stripe is optional. You can still use cash, check, and bank transfer payment methods without Stripe.

---

### 3. Configure Stripe Webhooks (For Automated Payment Recording)

To automatically record payments when they complete in Stripe, set up webhooks.

**Steps:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-domain.com/api/payments/stripe-webhook`
4. **Events to listen for:**
   - `payment_intent.succeeded`
   - `checkout.session.completed`
5. Copy the webhook signing secret
6. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

**Note:** You'll need to implement the webhook handler at `/server/api/payments/stripe-webhook.post.ts` (not yet created).

---

### 4. Set Up RLS Policies (If Not Already Applied)

Ensure Row Level Security policies are configured to protect fee data.

**Navigate to:** Supabase Dashboard → Authentication → Policies

**Policy 1: Staff Can Manage Fee Types**
```sql
CREATE POLICY "Staff can manage fee types"
ON recital_fee_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);
```

**Policy 2: Staff Can View All Student Fees**
```sql
CREATE POLICY "Staff can view all student fees"
ON student_recital_fees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff', 'teacher')
  )
);
```

**Policy 3: Parents Can View Their Children's Fees**
```sql
CREATE POLICY "Parents can view their children's fees"
ON student_recital_fees
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students
    WHERE parent_id = auth.uid()
  )
);
```

**Policy 4: Staff Can Record Payments**
```sql
CREATE POLICY "Staff can record payments"
ON recital_payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);
```

---

### 5. Restart Development Server

After configuring environment variables:

```bash
npm run dev
```

---

## 🧪 Testing the Implementation

### Test Checklist

**1. Navigation**
- [ ] Navigate to `/recitals/[id]/hub`
- [ ] Click "Fees & Payments" in Quick Actions
- [ ] Should load payment dashboard (for staff/admin) or payment portal (for parents)

**2. Create Fee Type**
- [ ] Go to `/recitals/[id]/fees/types`
- [ ] Click "Create Fee Type" button
- [ ] Fill in required fields (name, type, default amount, due date)
- [ ] Set early bird pricing (optional)
- [ ] Set late fee penalty (optional)
- [ ] Click "Create Fee Type"
- [ ] Should see success and new fee type in list

**3. View Fee Types Statistics**
- [ ] Fee type cards show default amount, due date
- [ ] Summary cards show total fee types, active fees, total assigned, total collected
- [ ] Can filter by fee type category
- [ ] Can search fee types by name

**4. Edit Fee Type**
- [ ] Click "Edit" on a fee type card
- [ ] Update pricing or due date
- [ ] Click "Update Fee Type"
- [ ] Changes should be saved

**5. Assign Fees to Students**
- [ ] On fee types page, click "Assign" on a fee type
- [ ] Should see list of students participating in recital
- [ ] Students already assigned should be marked/disabled
- [ ] Select multiple students
- [ ] Optionally set custom amount or due date
- [ ] Click "Assign to X Students"
- [ ] Should see success message

**6. Payment Dashboard**
- [ ] Go to `/recitals/[id]/fees/payments`
- [ ] Summary cards show: Total Expected, Total Collected, Outstanding, Collection Rate, Students Owing
- [ ] Student fees table shows all assigned fees
- [ ] Can filter by payment status (pending, partial, paid, overdue, waived)
- [ ] Can filter by fee type
- [ ] Can search by student name
- [ ] Click "Apply Filters" - results update

**7. Record Cash/Check Payment**
- [ ] From payment dashboard, click "Record Payment" on a student fee
- [ ] Modal opens showing student and fee details
- [ ] Outstanding balance displayed prominently
- [ ] Enter payment amount (cannot exceed balance)
- [ ] Select "Cash" or "Check" payment method
- [ ] If check, enter check number (required)
- [ ] Select payment date
- [ ] Add optional notes
- [ ] Click "Record Payment"
- [ ] Should see success and dashboard updates

**8. Record Credit Card Payment (Stripe)**
- [ ] Click "Record Payment" on a student fee
- [ ] Select "Credit Card (Stripe)" payment method
- [ ] Should see Stripe notice
- [ ] Click "Process Payment"
- [ ] Should initiate Stripe payment flow (or show placeholder if not configured)

**9. Parent Payment Portal**
- [ ] Log in as a parent user
- [ ] Go to `/recitals/[id]/fees`
- [ ] Should see all children with assigned fees
- [ ] Each fee shows: total amount, paid amount, balance, due date, status
- [ ] Payment history displayed for fees with payments
- [ ] Early bird notice shown if applicable
- [ ] Late fee notice shown if overdue
- [ ] "Pay Now" button on unpaid fees
- [ ] "Pay All" button at top to pay all outstanding balances

**10. Stripe Checkout (Parent Portal)**
- [ ] From parent portal, click "Pay Now" on a fee
- [ ] Should create Stripe checkout session
- [ ] Should redirect to Stripe checkout page
- [ ] Complete payment with test card: `4242 4242 4242 4242`
- [ ] Should redirect back to success page
- [ ] Payment should be recorded (requires webhook implementation)

**11. Fee Status Updates**
- [ ] When partial payment recorded, status changes to "partial"
- [ ] When full balance paid, status changes to "paid"
- [ ] Balance should always equal total - paid
- [ ] Collection rate should update in summary

**12. Permissions**
- [ ] Parents can only see their children's fees
- [ ] Parents cannot access fee types or payment dashboard pages
- [ ] Staff/admin can see all fees and manage everything
- [ ] Teachers can view fees but not modify (depending on permissions)

---

## 🔍 Troubleshooting

### "Failed to fetch fee types" Error

**Cause:** Database connection issue or RLS policy blocking access

**Fix:**
1. Check browser console for detailed error
2. Verify RLS policies allow your user role to access fee types
3. Check Supabase Dashboard → Table Editor → recital_fee_types
4. Ensure recital_show_id matches an existing recital

---

### "Cannot assign fees" Error

**Cause:** No students found or all already assigned

**Fix:**
1. Ensure recital has performances with student assignments
2. Check if students are already assigned this fee type
3. Verify `/api/recitals/[id]/students-for-fees` endpoint returns students

---

### "Payment amount exceeds balance" Error

**Cause:** Trying to record payment larger than outstanding balance

**Fix:**
1. Check current balance before recording payment
2. Use exact balance amount for final payment
3. For overpayment scenarios, record balance amount then handle overpayment separately

---

### Stripe Not Working

**Cause:** Stripe not configured or keys incorrect

**Fix:**
1. Verify `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `.env`
2. Check keys are for correct environment (test vs. live)
3. Restart dev server after adding keys
4. Check server console for Stripe initialization errors
5. Use cash/check payments until Stripe is configured

---

### Parent Sees No Fees

**Cause:** No fees assigned to their children or RLS blocking access

**Fix:**
1. Verify parent has children linked (students table with `parent_id`)
2. Verify fees are assigned to those students for this recital
3. Check RLS policies allow parent to view student fees
4. Check browser console and server logs for errors

---

### Collection Rate Shows 0%

**Cause:** No payments recorded yet

**Fix:**
1. This is expected if no payments have been recorded
2. Record a test payment to see collection rate update
3. Collection rate = (total collected / total expected) * 100

---

## 📊 Database Verification

Run these queries to verify everything is set up:

```sql
-- Check fee types table
SELECT COUNT(*) as fee_type_count FROM recital_fee_types;

-- Check student fees table
SELECT COUNT(*) as student_fee_count FROM student_recital_fees;

-- Check payments table
SELECT COUNT(*) as payment_count FROM recital_payment_transactions;

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'recital_fee_types',
  'student_recital_fees',
  'recital_payment_transactions'
)
ORDER BY tablename, policyname;

-- View sample fee types
SELECT
  id,
  name,
  fee_type,
  default_amount_in_cents,
  due_date,
  is_active
FROM recital_fee_types
WHERE recital_show_id = 'YOUR_RECITAL_ID'
ORDER BY created_at DESC
LIMIT 5;

-- View payment summary
SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount_in_cents) as total_expected,
  SUM(amount_paid_in_cents) as total_paid,
  SUM(balance_in_cents) as total_balance
FROM student_recital_fees
WHERE recital_show_id = 'YOUR_RECITAL_ID'
GROUP BY status;
```

---

## 🚀 Next Steps

Once Fees & Payment Tracking is working:

1. **Assign Fees to All Students**
   - Create all necessary fee types
   - Bulk assign fees to students participating in the recital
   - Verify amounts and due dates are correct

2. **Test Payment Workflows**
   - Record test cash/check payments
   - Test partial payments
   - Test full payment completion
   - Verify status updates and balance calculations

3. **Configure Stripe for Production**
   - Switch to live Stripe keys
   - Set up webhook endpoint
   - Test with real payments in small amounts
   - Monitor Stripe dashboard for transactions

4. **Train Staff**
   - Show how to create fee types
   - Train on bulk fee assignment
   - Demonstrate recording payments
   - Explain payment dashboard and filters

5. **Communicate with Parents**
   - Send email with portal link
   - Explain early bird discounts and due dates
   - Provide instructions for online payment
   - Offer alternative payment methods (cash/check)

6. **Monitor Financial Metrics**
   - Check collection rate regularly
   - Follow up on overdue payments
   - Generate payment reports
   - Reconcile with accounting software

---

## 📚 Related Documentation

- [DATABASE-IMPLEMENTATION-GUIDE.md](./DATABASE-IMPLEMENTATION-GUIDE.md) - Database schema and verification
- [server/api/fees/README.md](../../server/api/fees/README.md) - Complete API documentation
- [UX-UI-REVIEW-AND-RECOMMENDATIONS.md](./UX-UI-REVIEW-AND-RECOMMENDATIONS.md) - UX guidelines
- [Stripe Documentation](https://stripe.com/docs) - Official Stripe integration docs

---

## 💡 Tips and Best Practices

### Fee Structure Recommendations

1. **Keep it Simple:** Start with 1-2 fee types (e.g., Participation + Costume)
2. **Clear Names:** Use descriptive names like "Participation Fee - Spring 2025"
3. **Consistent Pricing:** Use same amounts for all students unless special circumstances
4. **Early Bird Discounts:** Set deadline 2-4 weeks before final due date
5. **Late Fees:** Apply 2 weeks after due date, reasonable amount ($10-25)

### Payment Collection Tips

1. **Multiple Payment Methods:** Accept cash, check, credit card, and bank transfer
2. **Payment Plans:** Offer installment plans for large fees (3-4 installments)
3. **Reminders:** Send email reminders 1 week before due date
4. **Follow-up:** Contact parents 1 week after due date for unpaid fees
5. **Receipts:** Always provide receipts for all payments (email or printed)

### Financial Management

1. **Daily Reconciliation:** Review payment dashboard daily during peak collection periods
2. **Weekly Reports:** Generate payment status reports for studio owner
3. **Track Trends:** Monitor collection rate over time
4. **Identify Issues Early:** Follow up quickly on students with balances
5. **Accounting Integration:** Export payment data for QuickBooks/accounting software

### Security Best Practices

1. **Stripe Only for Credit Cards:** Never store credit card details in your database
2. **PCI Compliance:** Use Stripe's hosted checkout page (not custom forms)
3. **SSL Certificate:** Ensure your site uses HTTPS for all payment pages
4. **Regular Backups:** Back up payment data regularly
5. **Access Control:** Only grant payment recording access to trusted staff

---

## 🆘 Support

If you encounter issues:

1. Check this setup guide
2. Review API documentation in `server/api/fees/README.md`
3. Check Supabase Dashboard for database errors
4. Review browser console and server logs
5. Verify RLS policies and permissions
6. Test with different user roles (admin, staff, parent)

**Common issues are documented in the Troubleshooting section above.**

---

## 🔐 Security Checklist

Before going to production:

- [ ] All RLS policies are enabled and tested
- [ ] Stripe webhook secret is configured
- [ ] Environment variables are secure (not in git)
- [ ] HTTPS is enabled on production domain
- [ ] Webhook endpoint validates Stripe signatures
- [ ] Payment amounts are validated server-side
- [ ] Parent users can only see their own children's fees
- [ ] Staff users cannot modify completed payments
- [ ] Audit log for all payment transactions
- [ ] Regular database backups are configured

---

## 📈 Feature Roadmap

Future enhancements to consider:

- [ ] Automated payment reminders via email
- [ ] Automated late fee application
- [ ] Automated early bird discount expiration
- [ ] Payment plan management with automatic installments
- [ ] Refund processing workflow
- [ ] Financial reports and analytics
- [ ] Export to QuickBooks/Xero
- [ ] SMS payment reminders
- [ ] Payment receipt generation (PDF)
- [ ] Payment history export
- [ ] Fee waivers and scholarships
- [ ] Sibling discounts
- [ ] Group payment processing
