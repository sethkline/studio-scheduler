# Analytics Dashboard Integration Guide

**PR:** #14 - Analytics Reporting Dashboard
**Branch:** `claude/analytics-reporting-dashboard-011CUqjLjYuT1EQiUqY8teEA`
**Status:** Updated to use analytics views instead of duplicate tables

---

## Changes Made

### ❌ Removed (Use Analytics Views Instead)

1. **`payments` table** → Use `analytics_payment_summary` view
2. **`invoices` table** → Use `analytics_outstanding_balances` view
3. **`attendance` table** (if creating separate) → Use existing attendance tracking

### ✅ Use These Analytics Views

All views are in `20251116_009_analytics_views.sql`:

1. **analytics_payment_summary** - All payments across all types
2. **analytics_revenue_by_type** - Revenue aggregated by type/period
3. **analytics_outstanding_balances** - Outstanding balances per family
4. **analytics_payment_method_usage** - Payment method statistics
5. **analytics_enrollment_stats** - Class enrollment and attendance
6. **analytics_recital_revenue** - Recital-specific revenue
7. **analytics_parent_activity** - Parent engagement metrics
8. **analytics_daily_revenue** - Daily revenue with running totals
9. **analytics_refund_summary** - Refund analytics
10. **analytics_studio_credit_usage** - Studio credit tracking

---

## Migration File

### Required

✅ `20251116_009_analytics_views.sql` - All 10 analytics views

### Deprecated (DO NOT USE)

❌ `docs/database/analytics-schema.sql` - Creates duplicate tables

---

## Code Migration Examples

### Revenue Analytics

**OLD WAY (duplicate payments table):**
```typescript
// Don't query separate payments table
const { data } = await supabase
  .from('payments')
  .select('*')
  .gte('payment_date', startDate)
```

**NEW WAY (use view):**
```typescript
// Query analytics view
const { data: revenue } = await supabase
  .from('analytics_revenue_by_type')
  .select('*')
  .gte('month', startOfMonth)
  .order('month', { ascending: false })

// Returns:
// {
//   order_type: 'tuition' | 'recital_fee' | 'ticket' | 'merchandise',
//   month: '2025-01-01',
//   week: '2025-01-06',
//   day: '2025-01-15',
//   transaction_count: 45,
//   total_revenue_cents: 125000,
//   avg_transaction_cents: 2777,
//   completed_revenue_cents: 120000,
//   failed_count: 2,
//   refunded_cents: 5000
// }
```

### Outstanding Balances

**OLD WAY (duplicate invoices table):**
```typescript
// Don't query separate invoices table
const { data } = await supabase
  .from('invoices')
  .select('*')
  .in('status', ['sent', 'overdue'])
```

**NEW WAY (use view):**
```typescript
// Query analytics view
const { data: balances } = await supabase
  .from('analytics_outstanding_balances')
  .select('*')
  .order('total_balance_cents', { ascending: false })

// Returns:
// {
//   student_id, student_name,
//   guardian_id, guardian_name, guardian_email, guardian_phone,
//   recital_balance_cents,
//   outstanding_recital_fee_count,
//   earliest_recital_due_date,
//   tuition_balance_cents,
//   outstanding_tuition_count,
//   earliest_tuition_due_date,
//   total_balance_cents,  // Combined total
//   earliest_due_date,    // Earliest across all types
//   has_overdue_recital_fees,
//   has_overdue_tuition
// }
```

### Payment History

**OLD WAY:**
```typescript
// Don't create duplicate payment records
```

**NEW WAY:**
```typescript
// Get unified payment history
const { data: payments } = await supabase
  .from('analytics_payment_summary')
  .select('*')
  .eq('student_id', studentId)
  .order('payment_date', { ascending: false })

// Returns:
// {
//   payment_id,
//   payment_type: 'recital_fee' | 'tuition' | 'ticket' | 'merchandise',
//   student_id, student_name,
//   amount_in_cents,
//   payment_status,
//   payment_method,
//   payment_date,
//   stripe_charge_id,
//   guardian_id, guardian_name,
//   event_name,  // Recital/show/class name
//   refund_amount_in_cents,
//   refund_status,
//   created_at, transaction_date
// }
```

### Enrollment Statistics

**NEW WAY (use view):**
```typescript
// Get class performance metrics
const { data: stats } = await supabase
  .from('analytics_enrollment_stats')
  .select('*')
  .eq('schedule_id', currentScheduleId)
  .order('active_enrollments', { ascending: false })

// Returns:
// {
//   class_definition_id, class_name,
//   dance_style, class_level, teacher_name,
//   schedule_id, schedule_name,
//   active_enrollments,
//   waitlist_count,
//   dropped_count,
//   max_students,
//   available_spots,
//   attendance_rate_percentage,
//   total_tuition_billed_cents,
//   total_tuition_collected_cents
// }
```

### Parent Engagement

**NEW WAY (use view):**
```typescript
// Get parent activity metrics
const { data: activity } = await supabase
  .from('analytics_parent_activity')
  .select('*')
  .order('last_activity_date', { ascending: false })
  .limit(50)

// Returns:
// {
//   guardian_id, user_id, guardian_name, email,
//   student_count,
//   total_payments,
//   total_paid_cents,
//   last_payment_date,
//   total_balance_cents,
//   active_enrollments,
//   last_activity_date
// }
```

### Daily Revenue Dashboard

**NEW WAY (use view):**
```typescript
// Get last 30 days revenue
const { data: dailyRevenue } = await supabase
  .from('analytics_daily_revenue')
  .select('*')
  .gte('revenue_date', thirtyDaysAgo)
  .order('revenue_date', { ascending: false })

// Returns:
// {
//   revenue_date: '2025-01-15',
//   order_type: 'tuition',
//   payment_status: 'completed',
//   transaction_count: 12,
//   total_amount_cents: 45000,
//   running_total_cents: 1250000  // Cumulative for this order_type
// }

// Perfect for charts!
const chartData = dailyRevenue.map(d => ({
  date: d.revenue_date,
  revenue: d.total_amount_cents / 100
}))
```

### Refund Analytics

**NEW WAY (use view):**
```typescript
// Get refund trends
const { data: refunds } = await supabase
  .from('analytics_refund_summary')
  .select('*')
  .order('month', { ascending: false })

// Returns:
// {
//   month: '2025-01',
//   order_type: 'tuition',
//   refund_type: 'partial' | 'full' | 'pro_rated' | 'studio_credit',
//   refund_status: 'completed' | 'pending' | 'failed',
//   refund_count: 5,
//   total_refunded_cents: 25000,
//   avg_refund_cents: 5000,
//   completed_count: 4,
//   failed_count: 1,
//   avg_approval_time_days: 1.5
// }
```

### Studio Credit Tracking

**NEW WAY (use view):**
```typescript
// Get studio credit metrics
const { data: credits } = await supabase
  .from('analytics_studio_credit_usage')
  .select('*')
  .order('month', { ascending: false })

// Returns:
// {
//   month: '2025-01',
//   transaction_type: 'credit_added' | 'credit_used' | 'credit_expired',
//   transaction_count: 10,
//   total_amount_cents: 50000,
//   total_active_credits_cents: 125000,  // Current balance across all accounts
//   accounts_with_balance: 25            // Number of accounts with credits
// }
```

---

## API Endpoint Updates

### Update Revenue Endpoint

**File:** `server/api/analytics/revenue.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = getSupabaseClient()

  // Get revenue by type
  let queryBuilder = client
    .from('analytics_revenue_by_type')
    .select('*')

  if (query.period === 'daily') {
    queryBuilder = queryBuilder
      .gte('day', query.startDate)
      .lte('day', query.endDate)
      .order('day', { ascending: false })
  } else if (query.period === 'weekly') {
    queryBuilder = queryBuilder
      .gte('week', query.startDate)
      .order('week', { ascending: false })
  } else {
    // Monthly by default
    queryBuilder = queryBuilder
      .gte('month', query.startDate)
      .order('month', { ascending: false })
  }

  const { data, error } = await queryBuilder

  if (error) throw createError({
    statusCode: 500,
    message: error.message
  })

  return { revenue: data }
})
```

### Update Outstanding Balances Endpoint

**File:** `server/api/analytics/balances.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = getSupabaseClient()

  let queryBuilder = client
    .from('analytics_outstanding_balances')
    .select('*')
    .order('total_balance_cents', { ascending: false })

  // Filter by overdue
  if (query.overdue === 'true') {
    queryBuilder = queryBuilder.or(
      'has_overdue_recital_fees.eq.true,has_overdue_tuition.eq.true'
    )
  }

  // Filter by minimum balance
  if (query.min_balance) {
    queryBuilder = queryBuilder.gte(
      'total_balance_cents',
      parseInt(query.min_balance)
    )
  }

  const { data, error } = await queryBuilder

  if (error) throw createError({
    statusCode: 500,
    message: error.message
  })

  return { balances: data }
})
```

### Update Enrollment Stats Endpoint

**File:** `server/api/analytics/enrollment.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = getSupabaseClient()

  let queryBuilder = client
    .from('analytics_enrollment_stats')
    .select('*')

  if (query.schedule_id) {
    queryBuilder = queryBuilder.eq('schedule_id', query.schedule_id)
  }

  if (query.teacher_id) {
    // Need to join with class_instances to filter by teacher
    // Or add teacher_id to the view
  }

  queryBuilder = queryBuilder.order('active_enrollments', { ascending: false })

  const { data, error } = await queryBuilder

  if (error) throw createError({
    statusCode: 500,
    message: error.message
  })

  return { stats: data }
})
```

### Add Payment History Endpoint

**File:** `server/api/analytics/payment-history.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = getSupabaseClient()

  let queryBuilder = client
    .from('analytics_payment_summary')
    .select('*')
    .order('payment_date', { ascending: false })

  // Filter by student
  if (query.student_id) {
    queryBuilder = queryBuilder.eq('student_id', query.student_id)
  }

  // Filter by guardian
  if (query.guardian_id) {
    queryBuilder = queryBuilder.eq('guardian_id', query.guardian_id)
  }

  // Filter by payment type
  if (query.payment_type) {
    queryBuilder = queryBuilder.eq('payment_type', query.payment_type)
  }

  // Filter by date range
  if (query.start_date) {
    queryBuilder = queryBuilder.gte('payment_date', query.start_date)
  }
  if (query.end_date) {
    queryBuilder = queryBuilder.lte('payment_date', query.end_date)
  }

  // Pagination
  const page = parseInt(query.page) || 1
  const limit = parseInt(query.limit) || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  queryBuilder = queryBuilder.range(from, to)

  const { data, error, count } = await queryBuilder

  if (error) throw createError({
    statusCode: 500,
    message: error.message
  })

  return {
    payments: data,
    pagination: {
      page,
      limit,
      total: count
    }
  }
})
```

---

## Frontend Component Examples

### Revenue Chart Component

```vue
<script setup lang="ts">
const { data: revenueData } = await useFetch('/api/analytics/revenue', {
  query: {
    period: 'monthly',
    startDate: startOfYear
  }
})

const chartData = computed(() => {
  return revenueData.value?.revenue.map(r => ({
    month: format(new Date(r.month), 'MMM yyyy'),
    tuition: r.order_type === 'tuition' ? r.completed_revenue_cents / 100 : 0,
    recitals: r.order_type === 'recital_fee' ? r.completed_revenue_cents / 100 : 0,
    tickets: r.order_type === 'ticket' ? r.completed_revenue_cents / 100 : 0,
    merchandise: r.order_type === 'merchandise' ? r.completed_revenue_cents / 100 : 0
  }))
})
</script>

<template>
  <Card>
    <template #header>
      <h2>Revenue by Type</h2>
    </template>
    <Chart type="bar" :data="chartData" :options="chartOptions" />
  </Card>
</template>
```

### Outstanding Balances Table

```vue
<script setup lang="ts">
const { data: balances } = await useFetch('/api/analytics/balances', {
  query: { overdue: 'true' }
})

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}
</script>

<template>
  <DataTable :value="balances?.balances" paginator :rows="25">
    <Column field="student_name" header="Student" sortable />
    <Column field="guardian_name" header="Guardian" sortable />
    <Column field="guardian_email" header="Email" />
    <Column field="total_balance_cents" header="Balance" sortable>
      <template #body="{ data }">
        {{ formatCurrency(data.total_balance_cents) }}
      </template>
    </Column>
    <Column field="earliest_due_date" header="Due Date" sortable />
    <Column header="Overdue">
      <template #body="{ data }">
        <Tag v-if="data.has_overdue_recital_fees || data.has_overdue_tuition"
             severity="danger">
          Overdue
        </Tag>
      </template>
    </Column>
  </DataTable>
</template>
```

---

## Benefits of Using Views

✅ **Real-time data** - Always current, no sync delays
✅ **Single source of truth** - Data from actual payment tables
✅ **No data duplication** - Reduced storage and maintenance
✅ **Easier to modify** - Can update views without data migration
✅ **Better performance** - Views use indexes from source tables
✅ **Data integrity** - Impossible to have conflicting data
✅ **Flexible reporting** - Easy to create new views for new reports

---

## Testing Checklist

- [ ] Revenue analytics by payment type
- [ ] Outstanding balances report
- [ ] Payment history by student/guardian
- [ ] Enrollment statistics by class
- [ ] Parent activity metrics
- [ ] Daily revenue dashboard
- [ ] Refund analytics
- [ ] Studio credit tracking
- [ ] Export reports to CSV/Excel
- [ ] Performance test with large datasets

---

## Questions?

See:
- [UNIFIED-PAYMENT-SYSTEM-PLAN.md](./UNIFIED-PAYMENT-SYSTEM-PLAN.md)
- [SCHEMA-FIX-SUMMARY.md](./SCHEMA-FIX-SUMMARY.md)
- Migration file: `supabase/migrations/20251116_009_analytics_views.sql`
