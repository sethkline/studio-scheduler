# Real-time Seat Updates Documentation

**Feature Story:** Story 4.3 - Real-time Seat Updates
**Status:** ✅ Implemented
**Last Updated:** 2025-11-17

## Overview

The real-time seat updates feature provides instant synchronization of seat availability across all active user sessions. When one customer reserves or purchases a seat, all other customers viewing the same show will immediately see the seat become unavailable without needing to refresh the page.

## Technical Architecture

### Components

#### 1. `useRealtimeSeats` Composable

**Location:** `/composables/useRealtimeSeats.ts`

**Purpose:** Manages Supabase real-time WebSocket subscriptions for seat status changes.

**Key Features:**
- Subscribes to `show_seats` table changes for a specific show
- Handles connection status monitoring
- Automatic reconnection with exponential backoff
- Proper cleanup on component unmount

**API:**

```typescript
const {
  isSubscribed,        // ref<boolean> - Subscription status
  connectionStatus,    // ref<ConnectionStatus> - Current connection state
  reconnectAttempts,   // ref<number> - Number of reconnection attempts
  subscribe,           // (onUpdate, onConnectionChange?) => void
  unsubscribe,         // () => Promise<void>
  reconnect            // () => void - Manual reconnection
} = useRealtimeSeats(showId)
```

**Connection States:**
- `connected` - Active WebSocket connection
- `disconnected` - No connection
- `reconnecting` - Attempting to reconnect
- `error` - Connection failed after max retries

**Reconnection Logic:**
- Maximum 5 reconnection attempts
- Exponential backoff (2s, 4s, 6s, 8s, 10s)
- Automatic retry on connection drop or timeout

#### 2. Enhanced `useSeatSelection` Composable

**Location:** `/composables/useSeatSelection.ts`

**New Methods:**

```typescript
// Handle single seat status update from real-time subscription
handleSeatStatusUpdate(seatId: string, newStatus: SeatStatus): boolean

// Batch update multiple seat statuses (more efficient)
handleBatchSeatUpdates(updates: SeatUpdate[]): string[]

// Update seat data while preserving reactivity
updateSeatInSelection(updatedSeat: Seat): void
```

**Features:**
- Automatically removes seats from selection if they become unavailable
- Protects user's own reservations from being removed
- Batch processing for multiple simultaneous updates

#### 3. SeatSelectionPage Component

**Location:** `/components/recital-public/SeatSelectionPage.vue`

**Real-time Features:**

1. **Automatic Subscription:**
   - Subscribes to seat updates on component mount
   - Unsubscribes on component unmount

2. **Seat Update Handling:**
   - Updates `availableSeats` array when seats change
   - Removes seats from user's selection if taken by others
   - Shows toast notifications for important changes

3. **Connection Status Indicator:**
   - Visual badge showing connection status
   - Green: "Live updates active"
   - Yellow: "Reconnecting..."
   - Red: "Connection lost"

4. **Optimistic UI Updates:**
   - Immediate visual feedback when selecting seats
   - 300ms confirmation delay for smooth UX
   - Rollback on server rejection

### Database Schema

**Table:** `show_seats`

```sql
CREATE TABLE show_seats (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  seat_id UUID NOT NULL,
  status TEXT CHECK (status IN ('available', 'reserved', 'sold', 'held')),
  reserved_by TEXT,
  reserved_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Real-time Subscription Filter:**
```typescript
filter: `show_id=eq.${showId}`
```

## User Experience

### Scenario 1: Seat Taken by Another Customer

**Before Real-time:**
- User A selects Seat B5
- User B selects Seat B5 (race condition)
- Both proceed to checkout
- One fails at payment

**With Real-time:**
- User A selects Seat B5
- Seat B5 status → 'reserved'
- User B sees Seat B5 turn gray instantly
- User B cannot select Seat B5
- Toast notification: "Seat B5-12 was just taken by another customer"

### Scenario 2: Connection Drop Recovery

**What Happens:**
1. User loses internet connection
2. Yellow badge appears: "Reconnecting..."
3. System attempts reconnection (up to 5 times)
4. Connection restored → Green badge: "Reconnected"
5. Full seat data refresh to catch missed updates
6. Toast: "Real-time updates reconnected. Refreshing seat data..."

### Scenario 3: Optimistic Selection

**User Flow:**
1. User clicks on Seat A5
2. **Instant feedback:** Seat turns blue with pulse animation
3. After 300ms: Seat confirms (solid blue)
4. If seat unavailable: Reverts to gray + error toast

## CSS Animations

### Seat Status Transitions

**Available → Selected:**
```css
animation: seatUpdate 0.3s ease-out;
/* Scales from 1 → 1.1 → 1 */
```

**Available → Unavailable:**
```css
animation: seatTaken 0.5s ease-out;
/* Shakes and scales for attention */
```

**Optimistic State:**
```css
animation: pulse 1s infinite;
background-color: #60a5fa; /* Light blue */
opacity: 0.8 → 1 → 0.8
```

### Connection Status Badge

**Location:** Top-right of page header

**States:**
```html
<!-- Connected -->
<div class="text-xs text-green-600 bg-green-50">
  <i class="pi pi-circle-fill"></i> Live updates active
</div>

<!-- Reconnecting -->
<div class="text-xs text-yellow-600 bg-yellow-50">
  <i class="pi pi-spin pi-spinner"></i> Reconnecting...
</div>

<!-- Error -->
<div class="text-xs text-red-600 bg-red-50">
  <i class="pi pi-exclamation-triangle"></i> Connection lost
</div>
```

## Error Handling

### Connection Failures

**Retry Strategy:**
```typescript
maxReconnectAttempts: 5
reconnectDelay: 2000ms (base)
backoff: linear (2s, 4s, 6s, 8s, 10s)
```

**After Max Retries:**
- Toast: "Unable to reconnect to real-time updates. Please refresh the page."
- Connection status: `error`
- Red badge displayed

### Seat Update Conflicts

**Scenario:** User tries to select a seat that was just taken

```typescript
// Check seat availability before allowing selection
const seatInAvailableList = availableSeats.value.find(s => s.id === seat.id);
if (seatInAvailableList && seatInAvailableList.status !== 'available') {
  toast.add({
    severity: 'error',
    summary: 'Seat Unavailable',
    detail: `Seat ${seat.row_name}-${seat.seat_number} is no longer available`
  });
  return;
}
```

## Performance Considerations

### Optimizations

1. **Efficient Updates:**
   - Only subscribe to seats for the current show
   - Filter updates by `show_id` in database
   - Batch process multiple updates

2. **Memory Management:**
   - Automatic unsubscribe on component unmount
   - Clean up event listeners
   - Remove stale subscriptions

3. **Network Efficiency:**
   - WebSocket connection (not polling)
   - Minimal payload (only changed fields)
   - Single channel per show

### Monitoring

**Console Logs:**
```javascript
[useRealtimeSeats] Creating channel: show_seats:abc-123
[useRealtimeSeats] Subscription status: SUBSCRIBED
[SeatSelectionPage] Real-time seat update: UPDATE {...}
[SeatSelectionPage] Connection status changed: connected
```

## Testing Checklist

### Manual Testing

- [ ] Open seating page in two browser tabs
- [ ] Select seat in Tab 1 → Verify seat becomes unavailable in Tab 2
- [ ] Deselect seat in Tab 1 → Verify seat becomes available in Tab 2
- [ ] Complete purchase in Tab 1 → Verify seat status "sold" in Tab 2
- [ ] Disconnect network → Verify "Reconnecting..." badge appears
- [ ] Restore network → Verify "Reconnected" toast and data refresh
- [ ] Close tab → Verify subscription cleanup (no console errors)

### Edge Cases

- [ ] User selects seat at same moment as another user
- [ ] Connection drops during seat selection
- [ ] Reservation expires while viewing page
- [ ] Multiple rapid seat selections
- [ ] All seats become unavailable while viewing

### Performance Testing

- [ ] Test with 100+ seats updating simultaneously
- [ ] Monitor memory usage over 10 minutes
- [ ] Check for memory leaks on tab close
- [ ] Verify no duplicate subscriptions

## Troubleshooting

### Issue: Real-time updates not working

**Check:**
1. Supabase project has Realtime enabled
2. RLS policies allow SELECT on `show_seats` table
3. Browser console for subscription errors
4. Network tab shows WebSocket connection

**Solution:**
```bash
# Check Supabase Realtime status
https://app.supabase.com/project/[PROJECT_ID]/settings/api

# Verify RLS policy
SELECT * FROM pg_policies WHERE tablename = 'show_seats';
```

### Issue: Seats not updating after reconnection

**Cause:** Missed updates during connection drop

**Solution:** Already implemented - automatic data refresh on reconnection:
```typescript
if (status === 'connected' && reconnectAttempts.value > 0) {
  fetchAvailableSeats(); // Refresh all seat data
}
```

### Issue: Multiple subscriptions created

**Cause:** Component remounting without cleanup

**Solution:** Use proper lifecycle hooks:
```typescript
onUnmounted(() => {
  unsubscribe(); // Always cleanup
});
```

## Future Enhancements

### Potential Improvements

1. **Presence Indicators:**
   - Show number of users currently viewing seats
   - Highlight seats being considered by others

2. **Typing Indicators:**
   - Show when another user is selecting seats
   - Real-time counter: "3 other people viewing"

3. **Seat Reservation Queue:**
   - Notify users when preferred seats become available
   - Auto-select seats when they free up

4. **Advanced Notifications:**
   - Browser push notifications for seat availability
   - Email alerts for high-demand shows

5. **Analytics:**
   - Track real-time conversion rates
   - Monitor seat selection patterns
   - A/B test different UI animations

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Story 4.3 Requirements](/docs/feature-stories.md#story-43)
- [Database Schema](/supabase/migrations/)
- [PrimeVue Toast Component](https://primevue.org/toast/)

## Support

For issues or questions:
- Check browser console for error messages
- Review Supabase Realtime logs
- Test with multiple browser tabs
- Verify network connectivity

---

**Last Updated:** 2025-11-17
**Implemented By:** Claude AI Agent
**Story:** 4.3 - Real-time Seat Updates
