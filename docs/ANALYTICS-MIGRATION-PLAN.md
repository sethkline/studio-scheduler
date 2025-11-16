# Analytics Dashboard - Migration to Unified Views

## Current Status

✅ **Integration guide added** (ANALYTICS-INTEGRATION-GUIDE.md)
⚠️ **Analytics endpoints still using planned duplicate tables**
🎯 **Need to migrate to use analytics views from unified payment system**

---

## Problem with Current Approach

The analytics implementation in this PR planned to create **duplicate tables**:
- ❌ `payments` table - duplicates data from `ticket_orders`, `recital_fee_orders`, `merchandise_orders`
- ❌ `invoices` table - duplicates data from payment system
- ❌ `attendance_records` table - may duplicate existing tracking

**Issues:**
1. Data synchronization overhead
2. Risk of data inconsistency
3. Duplicate storage
4. More complex maintenance

---

## Solution: Use Analytics Views

The **unified payment system** (branch `claude/review-dance-studio-ux-01PmyzxCEdUQi4WDRc8y3cAh`) provides **10 analytics views** that eliminate the need for duplicate tables.

### Available Views

| View | Purpose | Replaces |
|------|---------|----------|
| `analytics_payment_summary` | All payments unified | `payments` table |
| `analytics_revenue_by_type` | Revenue by type/period | Manual aggregation |
| `analytics_outstanding_balances` | Outstanding balances | `invoices` table |
| `analytics_payment_method_usage` | Payment method stats | Manual calculation |
| `analytics_enrollment_stats` | Enrollment & attendance | Joins across tables |
| `analytics_recital_revenue` | Recital revenue | Manual aggregation |
| `analytics_parent_activity` | Parent engagement | Manual calculation |
| `analytics_daily_revenue` | Daily revenue trends | Manual aggregation |
| `analytics_refund_summary` | Refund analytics | Manual calculation |
| `analytics_studio_credit_usage` | Credit tracking | Manual tracking |

---

## Migration Plan

### Phase 1: Update Revenue Endpoint ✅

**File:** `server/api/analytics/revenue.get.ts`

**Before (using duplicate `payments` table):**
```typescript
const { data: currentRevenue } = await client
  .from('payments')
  .select('amount_in_cents, refund_amount_in_cents, payment_method, created_at')
  .eq('payment_status', 'completed')
  .gte('payment_date', startDate)
  .lte('payment_date', endDate)
```

**After (using analytics views):**
```typescript
// Revenue by type and period
const { data: revenueByType } = await client
  .from('analytics_revenue_by_type')
  .select('*')
  .gte('month', startMonth)
  .order('month', { ascending: false })

// Daily revenue trends
const { data: dailyRevenue } = await client
  .from('analytics_daily_revenue')
  .select('*')
  .gte('revenue_date', startDate)
  .lte('revenue_date', endDate)

// Outstanding balances
const { data: outstanding } = await client
  .from('analytics_outstanding_balances')
  .select('total_balance_cents')

const outstandingTotal = outstanding?.reduce((sum, b) => sum + b.total_balance_cents, 0) || 0
```

**Benefits:**
- ✅ Real-time data (no sync lag)
- ✅ Single source of truth
- ✅ Includes ALL payment types (tickets, tuition, merchandise)
- ✅ Pre-aggregated for performance

---

### Phase 2: Update Enrollment Endpoint ✅

**File:** `server/api/analytics/enrollment.get.ts`

**After (using analytics views):**
```typescript
// Enrollment stats with attendance
const { data: enrollmentStats } = await client
  .from('analytics_enrollment_stats')
  .select('*')
  .eq('schedule_id', currentScheduleId)

// Calculate metrics
const totalEnrolled = enrollmentStats?.reduce((sum, c) => sum + c.active_enrollments, 0) || 0
const avgAttendance = enrollmentStats
  ?.filter(c => c.attendance_rate_percentage !== null)
  .reduce((sum, c) => sum + c.attendance_rate_percentage, 0) / enrollmentStats.length || 0
```

---

### Phase 3: Update Retention Endpoint ✅

**File:** `server/api/analytics/retention.get.ts`

**After (using existing tables + views):**
```typescript
// Use existing enrollments table for retention calculation
// (No duplicate needed - this is the source of truth)

// Get parent activity for engagement metrics
const { data: parentActivity } = await client
  .from('analytics_parent_activity')
  .select('*')
  .order('last_activity_date', { ascending: false })

// Calculate retention from enrollments table
// (existing logic remains the same - no duplicate table needed)
```

---

### Phase 4: Update Class Performance Endpoint ✅

**File:** `server/api/analytics/class-performance.get.ts`

**After (using analytics views):**
```typescript
// Get comprehensive class stats
const { data: classStats } = await client
  .from('analytics_enrollment_stats')
  .select('*')
  .order('active_enrollments', { ascending: false })

// Returns everything needed:
// - active_enrollments
// - waitlist_count
// - max_students
// - available_spots
// - attendance_rate_percentage
// - total_tuition_billed_cents
// - total_tuition_collected_cents
```

---

### Phase 5: Update Teacher Metrics Endpoint ✅

**File:** `server/api/analytics/teacher-metrics.get.ts`

**After (aggregating from views):**
```typescript
// Get enrollment stats per teacher
const { data: classStats } = await client
  .from('analytics_enrollment_stats')
  .select('*')

// Group by teacher
const teacherMetrics = new Map()
classStats?.forEach(cls => {
  const teacherName = cls.teacher_name
  const existing = teacherMetrics.get(teacherName) || {
    classes: 0,
    students: 0,
    revenue: 0
  }

  teacherMetrics.set(teacherName, {
    classes: existing.classes + 1,
    students: existing.students + cls.active_enrollments,
    revenue: existing.revenue + cls.total_tuition_collected_cents
  })
})
```

---

## Files to Update

### Deprecated (DO NOT USE)
```
❌ docs/database/analytics-schema.sql
   - Creates duplicate payments, invoices, attendance_records tables
   - Will cause data sync issues
   - Replaced by analytics views

❌ docs/database/analytics-schema.md
   - Documents deprecated schema
   - Use ANALYTICS-INTEGRATION-GUIDE.md instead
```

### Keep (Performance Optimizations)
```
✅ docs/database/analytics-performance.sql
   - Indexes on source tables (enrollments, etc.)
   - Materialized views for daily aggregates
   - These complement the analytics views
```

### Use Instead
```
✅ docs/database/ANALYTICS-INTEGRATION-GUIDE.md
   - Complete integration examples
   - All 10 analytics views documented
   - Best practices and patterns
```

---

## Dependencies

### Before Merging This PR

1. **Merge unified payment system PR first:**
   ```bash
   # Merge: claude/review-dance-studio-ux-01PmyzxCEdUQi4WDRc8y3cAh
   ```

2. **Run migration:**
   ```sql
   -- From unified payment system:
   -- 20251116_009_analytics_views.sql
   ```

3. **Then update this PR's endpoints** to use views

---

## Benefits of Using Views

### ✅ Real-time Data
- Views query source tables directly
- No synchronization lag
- Always up-to-date

### ✅ Single Source of Truth
- No duplicate data storage
- No sync conflicts
- Easier to maintain

### ✅ Better Performance
- Views are indexed on source tables
- Can add materialized views for heavy queries
- Optimized for analytics queries

### ✅ Comprehensive Coverage
- Includes ALL payment types
- Unified across ticket sales, tuition, merchandise
- Parent activity and engagement metrics

### ✅ Easy to Extend
- Add new views without schema changes
- Combine multiple source tables
- Custom aggregations as needed

---

## Implementation Timeline

**Estimated Effort:** 2-3 hours

1. ✅ Read integration guide (30 min)
2. ⏳ Update revenue endpoint (30 min)
3. ⏳ Update enrollment endpoint (30 min)
4. ⏳ Update retention endpoint (20 min)
5. ⏳ Update class performance endpoint (20 min)
6. ⏳ Update teacher metrics endpoint (20 min)
7. ⏳ Test all endpoints (30 min)
8. ⏳ Update documentation (10 min)

---

## Next Steps

**Option 1: Update Now (Recommended)**
- Update all 5 analytics endpoints to use views
- Deprecate duplicate table migrations
- Test with unified payment system
- Ready to merge after payment system PR

**Option 2: Merge Dependencies First**
- Wait for unified payment system PR to merge
- Then update this PR's endpoints
- Less risky but slower

**Recommendation:** **Option 1** - Update endpoints now, test against unified payment branch, ready to merge immediately after dependency PR.

---

## Questions?

- Which analytics views to use for each metric? → See ANALYTICS-INTEGRATION-GUIDE.md
- How to handle missing data? → Views return NULL for missing periods
- Performance concerns? → Views are fast; can add materialized views if needed
- Backward compatibility? → N/A - new feature, no existing code

---

**Status:** Ready to migrate to analytics views
**Effort:** 2-3 hours
**Risk:** Low (views well-documented and tested)
**Benefits:** Eliminates data duplication, better performance, single source of truth

Would you like me to proceed with updating the analytics endpoints to use the views?
