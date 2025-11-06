# Real-Time Features Documentation

## Overview

The Recital Management Hub now includes **real-time updates** using Supabase Realtime subscriptions. Changes to tickets, tasks, and volunteers automatically appear across all connected users without manual refresh.

---

## 🔴 Live Data Indicators

### Visual Feedback

When real-time subscriptions are active, users see:

1. **Live Badge** - Green badge with dot indicator showing "Live" status
2. **Pulse Animation** - Badge pulses briefly when new data arrives
3. **Auto-Refresh** - Data updates automatically without page reload

---

## 📊 Real-Time Dashboard (`/recitals/[id]/hub`)

### Subscriptions Active

The hub dashboard subscribes to:

1. **Ticket Sales** (`tickets` table)
   - New ticket purchases
   - Ticket cancellations/refunds
   - Status changes

2. **Task Completions** (`recital_tasks` table)
   - Tasks marked complete
   - New tasks added
   - Task assignments changed
   - Due dates updated

3. **Volunteer Signups** (`volunteer_signups` table)
   - New volunteer signups
   - Signup cancellations
   - Check-ins recorded

### What Updates in Real-Time

- ✅ **Ticket count** increases when someone purchases tickets
- ✅ **Revenue total** updates with each sale
- ✅ **Task completion percentage** changes when tasks are completed
- ✅ **Volunteer spots filled** updates when someone signs up
- ✅ **Activity feed** shows new completions instantly
- ✅ **At-risk items** appear/disappear based on current status

### Visual Indicators

```vue
<!-- Live badge appears when subscribed -->
<span class="live-badge" :class="{ 'pulse': recentUpdate }">
  <i class="pi pi-circle-fill"></i>
  Live
</span>
```

---

## 💰 Real-Time Sales Analytics (`/recitals/[id]/sales`)

### Subscriptions Active

The sales analytics page subscribes to:

1. **Tickets** (`tickets` table)
   - All ticket changes for this recital's shows

2. **Orders** (`orders` table)
   - Order status changes
   - New orders placed
   - Order modifications

### What Updates in Real-Time

- ✅ **Total tickets sold** increases with each purchase
- ✅ **Revenue metrics** update instantly
- ✅ **Sales velocity chart** reflects latest data
- ✅ **Channel breakdown** updates by sales source
- ✅ **Seat availability** changes as seats are purchased
- ✅ **Show breakdown** table refreshes automatically

---

## 🔧 Technical Implementation

### Subscription Setup

```typescript
// Set up real-time subscriptions
const setupRealtimeSubscriptions = async () => {
  // Get show IDs for this recital
  const { data: shows } = await supabase
    .from('recital_shows')
    .select('id')
    .eq('recital_id', recitalId)

  const showIds = shows?.map(s => s.id) || []

  // Subscribe to ticket sales
  ticketChannel = supabase
    .channel('ticket-sales-updates')
    .on('postgres_changes', {
      event: '*', // Listen to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'tickets',
      filter: `show_id=in.(${showIds.join(',')})`
    }, async (payload) => {
      console.log('Ticket update:', payload)
      await loadDashboard()
      triggerUpdateIndicator()
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isLive.value = true
      }
    })
}
```

### Channel Cleanup

Subscriptions are properly cleaned up when component unmounts:

```typescript
const cleanupRealtimeSubscriptions = () => {
  if (ticketChannel) {
    supabase.removeChannel(ticketChannel)
    ticketChannel = null
  }
  isLive.value = false
}

onUnmounted(() => {
  cleanupRealtimeSubscriptions()
})
```

---

## 🧪 Testing Real-Time Updates

### Test Scenario 1: Ticket Purchase

1. **Open hub dashboard** in Browser A
2. **Open ticket purchase page** in Browser B
3. **Purchase a ticket** in Browser B
4. **Watch hub dashboard** in Browser A
   - ✅ "Live" badge should pulse
   - ✅ Ticket count increases
   - ✅ Revenue updates
   - ✅ Activity feed shows new sale

### Test Scenario 2: Task Completion

1. **Open hub dashboard** in Browser A
2. **Open tasks page** in Browser B
3. **Mark a task complete** in Browser B
4. **Watch hub dashboard** in Browser A
   - ✅ "Live" badge should pulse
   - ✅ Task completion percentage increases
   - ✅ Progress bar advances
   - ✅ Activity feed shows task completion

### Test Scenario 3: Volunteer Signup

1. **Open hub dashboard** in Browser A
2. **Open volunteers page** in Browser B (or use parent portal)
3. **Sign up for a shift** in Browser B
4. **Watch hub dashboard** in Browser A
   - ✅ "Live" badge should pulse
   - ✅ Volunteer spots filled increases
   - ✅ Progress bar advances
   - ✅ Activity feed shows signup

### Test Scenario 4: Multiple Users

1. **Open sales dashboard** in 3+ browsers
2. **Purchase tickets** from different browsers
3. **All browsers** should show:
   - ✅ Live badge pulsing
   - ✅ Metrics updating simultaneously
   - ✅ Charts refreshing with new data

---

## 🔒 Supabase Realtime Requirements

### Database Configuration

Supabase Realtime requires proper configuration:

1. **Enable Realtime** on tables:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
   ALTER PUBLICATION supabase_realtime ADD TABLE orders;
   ALTER PUBLICATION supabase_realtime ADD TABLE recital_tasks;
   ALTER PUBLICATION supabase_realtime ADD TABLE volunteer_signups;
   ```

2. **Row Level Security (RLS)** must be configured:
   - Users can only receive updates for data they have permission to view
   - RLS policies automatically filter realtime events

### Connection Requirements

- WebSocket connection to Supabase
- Active authentication session
- Proper RLS policies on subscribed tables

---

## ⚡ Performance Considerations

### Optimizations

1. **Filtered Subscriptions**
   - Only subscribe to shows for current recital
   - Filter by `recital_id` to reduce noise

2. **Debouncing Updates**
   - Visual indicator pulses for 2 seconds
   - Prevents excessive re-renders

3. **Channel Cleanup**
   - Channels removed on component unmount
   - Prevents memory leaks

### Network Usage

- **Minimal bandwidth** - Only changed rows are sent
- **Efficient filtering** - Server-side filtering reduces client load
- **Auto-reconnect** - Supabase handles connection drops

---

## 🐛 Troubleshooting

### "Live" Badge Doesn't Appear

**Possible causes:**
1. Realtime not enabled on table in Supabase
2. WebSocket connection blocked by firewall
3. RLS policies preventing access

**Solution:**
```typescript
// Check browser console for subscription status
.subscribe((status) => {
  console.log('Subscription status:', status)
  // Should see 'SUBSCRIBED' if successful
})
```

### Updates Not Appearing

**Possible causes:**
1. Filter not matching changed rows
2. RLS policy blocking updates
3. Different recital/show ID

**Solution:**
```typescript
// Add logging to verify updates received
.on('postgres_changes', {
  // ...
}, (payload) => {
  console.log('Update received:', payload)
  // Verify payload.new matches your filters
})
```

### Multiple Refreshes

**Possible causes:**
1. Multiple components subscribing to same table
2. Subscription not cleaned up properly

**Solution:**
- Ensure `cleanupRealtimeSubscriptions()` is called in `onUnmounted()`
- Use unique channel names

---

## 📚 Related Documentation

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Table Usage Verification](./table-usage-verification.md)

---

## ✅ Feature Compliance

**Story 2.1.1 (Recital Hub Dashboard):**
- ✅ Real-time ticket sales updates
- ✅ Real-time task completion updates
- ✅ Real-time volunteer signup updates
- ✅ Visual indicators (live badge, pulse animation)

**Story 2.1.3 (Ticket Sales Dashboard):**
- ✅ Real-time sales counter
- ✅ Real-time revenue tracking
- ✅ Live analytics updates
- ✅ Visual indicators

**All PR requirements met! ✅**
