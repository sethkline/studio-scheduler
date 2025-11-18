# Security Fixes Implementation Status

**Created:** 2025-11-17
**Branch:** `security/critical-fixes-phase-1`
**Status:** Phase 1 Complete ✅ | Phase 2 Ready

---

## ✅ Phase 1: Infrastructure Complete

### Accomplishments

1. **✅ PR Analysis Complete**
   - Analyzed all 14 open pull requests
   - Identified 10 PRs with critical security issues
   - Documented findings in `/docs/PR_ANALYSIS_REPORT.md`
   - Estimated 5-6 days total fix time

2. **✅ Documentation PRs Merged**
   - PR #44: Ticketing analysis & revenue features ✅ MERGED
   - PR #43: Ticketing audit reports ✅ MERGED
   - PR #42: Integration test suite (TDD specs) ✅ MERGED

3. **✅ Security Comments Added**
   - PR #14: Analytics authentication issues
   - PR #10: Email security + webhook bugs
   - PR #6: Stripe version + idempotency
   - PR #8: Concurrency + transactions
   - PR #4: Client pricing vulnerability
   - PR #7: Choreography authentication
   - PR #5: Lesson plan authentication
   - PR #16: Parent permission schema bugs
   - PR #12: Date/timezone handling
   - PR #11: Photo privacy + reliability

4. **✅ Authentication Infrastructure Created**
   - Enhanced `server/utils/auth.ts` with 4 new functions
   - Added permissions to `types/auth.ts`
   - Reusable utilities ready for all PRs

---

## 🔧 New Security Utilities

### Function: `requirePermission(event, permission)`
**Purpose:** Granular permission checking based on user role
**Fixes:** All endpoints missing permission checks
**Usage:**
```typescript
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'canViewAnalytics')
  // User has permission, proceed...
})
```

### Function: `requireParentStudentAccess(event, studentId)`
**Purpose:** Verify parent has access to specific student
**Fixes:** PR #16 (evaluations), PR #12 (payments/schedule)
**Schema:** Uses correct two-step check (guardians → student_guardian_relationships)
**Usage:**
```typescript
export default defineEventHandler(async (event) => {
  const studentId = getRouterParam(event, 'id')
  const { guardianId } = await requireParentStudentAccess(event, studentId)
  // Parent has access to this student...
})
```

### Function: `getParentStudentIds(event)`
**Purpose:** Get all student IDs accessible to current parent
**Fixes:** Filtering queries in PR #16, #12
**Usage:**
```typescript
const studentIds = await getParentStudentIds(event)
const evaluations = await client
  .from('evaluations')
  .select('*')
  .in('student_id', studentIds)
```

### Function: `requireTeacherClassAccess(event, classId)`
**Purpose:** Verify teacher owns/teaches specific class
**Fixes:** PR #7 (choreography), PR #5 (lesson plans), PR #16 (assessments)
**Usage:**
```typescript
export default defineEventHandler(async (event) => {
  const { class_id } = await readBody(event)
  const { teacherId } = await requireTeacherClassAccess(event, class_id)
  // Teacher owns this class...
})
```

---

## 📋 New Permissions Added

| Permission | Admin | Staff | Teacher | Parent | Student |
|------------|-------|-------|---------|--------|---------|
| `canViewAnalytics` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canExportAnalytics` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canSendEmails` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageEmailTemplates` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canManageChoreography` | ✅ | ✅ | ✅* | ❌ | ❌ |
| `canManageLessonPlans` | ✅ | ✅ | ✅* | ❌ | ❌ |
| `canManageAssessments` | ✅ | ✅ | ✅* | ❌ | ❌ |

*\* Teachers can only manage for their own classes (verified by `requireTeacherClassAccess`)*

---

## 🎯 Phase 2: Apply Fixes to Endpoints

### Priority 1: Authentication Fixes (6 hours total)

#### PR #14: Analytics Dashboard
**Endpoints to Fix (6 files):**
- `server/api/analytics/revenue.get.ts`
- `server/api/analytics/enrollment.get.ts`
- `server/api/analytics/retention.get.ts`
- `server/api/analytics/class-performance.get.ts`
- `server/api/analytics/teacher-metrics.get.ts`

**Fix Pattern:**
```typescript
export default defineEventHandler(async (event) => {
  // ADD THIS LINE:
  await requirePermission(event, 'canViewAnalytics')

  // Existing code...
})
```

**Time:** 1 hour

---

#### PR #10: Email System
**Endpoints to Fix (2 files):**
- `server/api/email/send.post.ts` - Add authentication
- `server/utils/emailService.ts:356-362` - Fix webhook verification

**Fix 1: Email Send (30min)**
```typescript
export default defineEventHandler(async (event) => {
  // ADD THESE LINES:
  await requirePermission(event, 'canSendEmails')

  // Existing code...
})
```

**Fix 2: Webhook Verification (30min)**
```typescript
// WRONG:
const signature = crypto
  .createHmac('sha256', process.env.MAILGUN_API_KEY)

// CORRECT:
const signature = crypto
  .createHmac('sha256', process.env.MAILGUN_SIGNING_KEY)
```

**Time:** 1 hour

---

#### PR #7: Choreography Notes
**Endpoint to Fix:**
- `server/api/choreography/index.post.ts`

**Fix:**
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // ADD THESE LINES:
  const { teacherId } = await requireTeacherClassAccess(event, body.class_id)

  // Existing code... (use teacherId in insert)
})
```

**Time:** 30 minutes

---

#### PR #5: Lesson Planning
**Endpoint to Fix:**
- `server/api/lesson-plans/add.post.ts`

**Fix:**
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // ADD THESE LINES:
  const { teacherId } = await requireTeacherClassAccess(event, body.class_id)

  // Existing code... (use teacherId in insert)
})
```

**Time:** 30 minutes

---

### Priority 2: Parent Permission Fixes (4 hours total)

#### PR #16: Student Assessments
**Endpoints to Fix (4 files):**
- `server/api/evaluations/[id]/pdf.get.ts`
- `server/api/evaluations/[id].get.ts`
- `server/api/evaluations/index.get.ts`
- `server/api/evaluations/student-history.get.ts`

**Current Code (WRONG):**
```typescript
const { data } = await client
  .from('guardians')
  .select('student_id')
  .eq('guardian_id', user.id)  // These fields don't exist!
```

**Fixed Code:**
```typescript
// For single student access:
await requireParentStudentAccess(event, evaluation.student_id)

// For filtering multiple:
const studentIds = await getParentStudentIds(event)
const evaluations = await client
  .from('evaluations')
  .select('*')
  .in('student_id', studentIds)
```

**Time:** 2 hours

---

#### PR #12: Payment History
**Endpoints to Fix (2 files):**
- `server/api/parent/payments/index.get.ts` - Fix parent filtering
- `server/api/parent/schedule/export.get.ts` - Fix ICS export bugs

**Fix 1: Payment Filtering (1 hour)**
```typescript
// Get parent's students correctly
const studentIds = await getParentStudentIds(event)

// Filter payments by student
const { data: payments } = await client
  .from('payments')
  .select('*')
  .in('student_id', studentIds)
```

**Fix 2: ICS Export (1 hour)**
```typescript
// Fix last payment date
const sortedPayments = payments.sort((a, b) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
)
const lastPaymentDate = sortedPayments[0]?.created_at

// Fix timezone
DTSTART;TZID=${studioTimezone}:${startDateTime}

// Fix recurrence
RRULE:FREQ=WEEKLY;UNTIL=${class.term_end_date}

// Fix UID
const uid = `class-${classId}-${studentId}-${dayOfWeek}@${domain}`
```

**Time:** 2 hours

---

### Priority 3: Payment Security Fixes (1.5 days total)

#### PR #6: Tuition & Billing
**Issues:**
1. Invalid Stripe API version
2. Missing idempotency

**Fix 1: Stripe Version (30min)**
```typescript
// WRONG:
const stripe = new Stripe(apiKey, { apiVersion: '2024-11-20.acacia' })

// CORRECT:
const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' })
```

**Fix 2: Idempotency (1 day)**
```typescript
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // CHECK FOR EXISTING ORDER
  const existing = await client
    .from('ticket_orders')
    .select('id')
    .eq('stripe_payment_intent_id', invoice.payment_intent)
    .single()

  if (existing.data) {
    console.log('Order already processed')
    return  // SKIP duplicate
  }

  // Create order...
}
```

**Time:** 1 day

---

#### PR #4: Merchandise Store
**Issue:** Trusts client-supplied pricing

**Fix (6 hours):**
```typescript
export default defineEventHandler(async (event) => {
  const { items } = await readBody(event)

  // RECALCULATE prices from database
  const validatedItems = await Promise.all(
    items.map(async (item) => {
      const product = await client
        .from('merchandise_products')
        .select('price_in_cents, stock_quantity')
        .eq('id', item.product_id)
        .single()

      if (!product.data) {
        throw createError({ statusCode: 404 })
      }

      if (product.data.stock_quantity < item.quantity) {
        throw createError({ statusCode: 400, message: 'Insufficient stock' })
      }

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_in_cents: product.data.price_in_cents,  // FROM DB!
        total: product.data.price_in_cents * item.quantity
      }
    })
  )

  // Use transaction for inventory update
  await client.rpc('create_order_with_inventory_update', {
    items: validatedItems
  })
})
```

**Time:** 6 hours

---

### Priority 4: Concurrency Fixes (1 day)

#### PR #8: Class Enrollment
**Issue:** Race conditions in approval workflow

**Fix:** Create Postgres function with row locking
```sql
CREATE OR REPLACE FUNCTION approve_enrollment_request(
  request_id uuid,
  staff_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_class_id uuid;
  v_student_id uuid;
  v_max_capacity int;
  v_current_count int;
  v_result jsonb;
BEGIN
  -- Get request details
  SELECT class_id, student_id INTO v_class_id, v_student_id
  FROM enrollment_requests
  WHERE id = request_id;

  -- Lock the class row
  SELECT max_capacity INTO v_max_capacity
  FROM class_instances
  WHERE id = v_class_id
  FOR UPDATE;  -- LOCK

  -- Check current enrollment
  SELECT COUNT(*) INTO v_current_count
  FROM class_enrollments
  WHERE class_id = v_class_id AND status = 'active';

  -- Check capacity
  IF v_current_count >= v_max_capacity THEN
    -- Add to waitlist
    UPDATE enrollment_requests
    SET status = 'waitlisted',
        waitlist_position = (SELECT COALESCE(MAX(waitlist_position), 0) + 1
                            FROM enrollment_requests
                            WHERE class_id = v_class_id AND status = 'waitlisted')
    WHERE id = request_id;

    v_result = jsonb_build_object('status', 'waitlisted');
  ELSE
    -- Approve enrollment
    INSERT INTO class_enrollments (student_id, class_id, status)
    VALUES (v_student_id, v_class_id, 'active');

    UPDATE enrollment_requests
    SET status = 'approved', approved_by = staff_user_id
    WHERE id = request_id;

    v_result = jsonb_build_object('status', 'approved');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

**Time:** 1 day

---

## 📊 Implementation Timeline

### Week 1 (Current)
- [x] Day 1-2: Analysis & documentation
- [x] Day 3: Infrastructure creation
- [ ] Day 4: Apply authentication fixes (Priority 1)
- [ ] Day 5: Apply parent permission fixes (Priority 2)

### Week 2
- [ ] Day 6-7: Apply payment security fixes (Priority 3)
- [ ] Day 8: Apply concurrency fixes (Priority 4)
- [ ] Day 9: Testing & validation
- [ ] Day 10: Code review & merge

---

## ✅ Success Criteria

### Phase 1 (Complete) ✅
- [x] All PRs analyzed
- [x] Security issues documented
- [x] Comments added to all problematic PRs
- [x] Documentation PRs merged
- [x] Authentication utilities created
- [x] Permissions added to type system

### Phase 2 (In Progress)
- [ ] All authentication issues fixed
- [ ] All parent permission issues fixed
- [ ] All payment security issues fixed
- [ ] All concurrency issues fixed
- [ ] All endpoints tested
- [ ] Security audit passed

### Phase 3 (Testing)
- [ ] Unit tests for auth utilities
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] No security vulnerabilities remaining

### Phase 4 (Deployment)
- [ ] PR created with all fixes
- [ ] Code review approved
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Verified in production

---

## 📁 Files Changed

### Phase 1 (Complete)
- ✅ `docs/PR_ANALYSIS_REPORT.md` - Created
- ✅ `server/utils/auth.ts` - Enhanced
- ✅ `types/auth.ts` - Enhanced

### Phase 2 (Pending)
- [ ] `server/api/analytics/*.get.ts` (5 files)
- [ ] `server/api/email/send.post.ts`
- [ ] `server/utils/emailService.ts`
- [ ] `server/api/choreography/index.post.ts`
- [ ] `server/api/lesson-plans/add.post.ts`
- [ ] `server/api/evaluations/*.ts` (4 files)
- [ ] `server/api/parent/payments/index.get.ts`
- [ ] `server/api/parent/schedule/export.get.ts`
- [ ] `server/api/webhooks/stripe.post.ts`
- [ ] `server/api/merchandise/orders/index.post.ts`
- [ ] `server/database/functions/` (new enrollment function)

**Total:** ~20 files to fix

---

## 🚀 Next Steps

1. **Apply Authentication Fixes** (Day 4)
   - Fix all analytics endpoints
   - Fix email send endpoint
   - Fix choreography endpoint
   - Fix lesson plans endpoint
   - Estimated: 6 hours

2. **Apply Parent Permission Fixes** (Day 5)
   - Fix evaluation endpoints
   - Fix payment history
   - Fix schedule export
   - Estimated: 4 hours

3. **Apply Payment Security Fixes** (Day 6-7)
   - Fix Stripe integration
   - Add idempotency
   - Fix client pricing trust
   - Estimated: 1.5 days

4. **Apply Concurrency Fixes** (Day 8)
   - Create database function
   - Update enrollment endpoints
   - Add row locking
   - Estimated: 1 day

5. **Testing & Validation** (Day 9)
   - Test all fixed endpoints
   - Verify permissions work correctly
   - Check error handling
   - Security audit

6. **Code Review & Merge** (Day 10)
   - Create PR with all fixes
   - Request reviews
   - Address feedback
   - Merge to main

---

## 📝 Notes

- All utilities are backward compatible
- Existing endpoints using old auth patterns still work
- New utilities should be used for all new endpoints
- Gradual migration recommended for legacy endpoints

---

**Last Updated:** 2025-11-17
**Next Review:** After Phase 2 complete
