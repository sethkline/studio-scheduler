# Schema Fixes Needed for show_seats Endpoints

## Overview

Multiple API endpoints are trying to SELECT columns from `show_seats` table that don't exist in the database schema. This will cause runtime errors when these endpoints are called.

## Root Cause

The `show_seats` table schema is:

```sql
CREATE TABLE show_seats (
  id UUID PRIMARY KEY,
  show_id UUID REFERENCES recital_shows(id),
  seat_id UUID REFERENCES seats(id),  -- ← FK to seats table
  status TEXT CHECK (status IN ('available', 'reserved', 'sold', 'held')),
  price_in_cents INTEGER NOT NULL,
  reserved_by TEXT,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key insight**: `show_seats` is a **link table** that connects shows to actual seats via the `seat_id` foreign key. Seat details (section, row, number, type) are stored in the `seats` table, not in `show_seats`.

## Non-Existent Columns Being Referenced

These columns do NOT exist in `show_seats`:
- ❌ `section`
- ❌ `section_type`
- ❌ `row_name`
- ❌ `seat_number`
- ❌ `seat_type`
- ❌ `handicap_access`

These should come from:
- ✅ `seats.row_name` (from seats table)
- ✅ `seats.seat_number` (from seats table)
- ✅ `seats.seat_type` (from seats table - 'regular' | 'ada' | 'house' | 'blocked')
- ✅ `venue_sections.name` (from seats → venue_sections join)
- ✅ Derive `handicap_access` from `seats.seat_type = 'ada'`

## Correct Query Pattern

### ❌ WRONG (Current Pattern):
```typescript
const { data } = await client
  .from('show_seats')
  .select(`
    id,
    section,          // ← Doesn't exist!
    section_type,     // ← Doesn't exist!
    row_name,         // ← Doesn't exist!
    seat_number,      // ← Doesn't exist!
    seat_type,        // ← Doesn't exist!
    handicap_access,  // ← Doesn't exist!
    status,
    price_in_cents
  `)
  .eq('show_id', showId)
```

### ✅ CORRECT (With Joins):
```typescript
const { data } = await client
  .from('show_seats')
  .select(`
    id,
    show_id,
    seat_id,
    status,
    price_in_cents,
    reserved_by,
    reserved_until,
    seat:seats (
      id,
      row_name,
      seat_number,
      seat_type,
      x_position,
      y_position,
      section:venue_sections (
        id,
        name,
        display_order
      ),
      price_zone:price_zones (
        id,
        name,
        color
      )
    )
  `)
  .eq('show_id', showId)
  .order('seat(section(display_order))')
  .order('seat(row_name)')
  .order('seat(seat_number)')
```

Then in your response transformation:
```typescript
const transformedSeats = data.map(showSeat => ({
  id: showSeat.id,
  show_id: showSeat.show_id,
  seat_id: showSeat.seat_id,
  status: showSeat.status,
  price_in_cents: showSeat.price_in_cents,
  reserved_until: showSeat.reserved_until,

  // From joined seat data:
  row_name: showSeat.seat.row_name,
  seat_number: showSeat.seat.seat_number,
  seat_type: showSeat.seat.seat_type,
  x_position: showSeat.seat.x_position,
  y_position: showSeat.seat.y_position,

  // From joined section:
  section: showSeat.seat.section?.name,
  section_id: showSeat.seat.section?.id,

  // Derived:
  handicap_access: showSeat.seat.seat_type === 'ada'
}))
```

## Files That Need Fixing

### Priority 1: Critical (Public-facing, will error on use)

1. **`server/api/public/recital-shows/[id]/seats/index.get.ts`**
   - Used by: Public ticket purchase page
   - Issue: Selects non-existent columns
   - Fix: Add joins to seats and venue_sections tables

2. **`server/api/public/recital-shows/[id]/seats/suggested.ts`**
   - Used by: Seat suggestion feature for consecutive seats
   - Issue: Tries to read section, row_name, seat_number
   - Fix: Join with seats table

3. **`server/api/public/orders/[id]/index.get.ts`**
   - Used by: Order confirmation page
   - Issue: Returns seat details without proper joins
   - Fix: Join show_seats → seats → venue_sections

4. **`server/api/public/tickets/[code]/index.get.ts`**
   - Used by: Ticket lookup page
   - Issue: Shows seat details (row, number, section)
   - Fix: Add proper joins

5. **`server/api/public/tickets/[code]/download.get.ts`**
   - Used by: PDF ticket generation
   - Issue: Needs seat details for ticket display
   - Fix: Join to get seat information

### Priority 2: Admin/Staff (Will error but not public-facing)

6. **`server/api/recital-shows/[id]/seats/index.get.ts`**
   - Used by: Admin seat management
   - Issue: Lines 17-28 select non-existent columns
   - Fix: Update to use joins

7. **`server/api/recital-shows/[id]/seats/available.ts`**
   - Used by: Check seat availability
   - Fix: Join with seats table

8. **`server/api/recital-shows/[id]/seats/suggested.ts`**
   - Used by: Admin seat suggestion
   - Fix: Same as public version

9. **`server/api/recital-shows/[id]/seats/reserve.ts`**
   - Used by: Seat reservation
   - Issue: May try to validate section/row
   - Fix: Use seat_id lookups

10. **`server/api/recital-shows/[id]/seats/[seatId].put.ts`**
    - Used by: Update seat status
    - Fix: Verify if it references non-existent columns

### Priority 3: Reservation/Ticket Management

11. **`server/api/reservations/[token].ts`**
    - Used by: Reservation management
    - Fix: Check for schema mismatches

12. **`server/api/public/seat-reservations/[token].get.ts`**
    - Used by: Reservation lookup
    - Fix: Add joins if needed

13. **`server/api/tickets/index.get.ts`**
    - Used by: Admin ticket list
    - Fix: Verify seat detail queries

## Migration Strategy

### Option 1: Database Views (Recommended)

Create a database view that pre-joins show_seats with seats:

```sql
CREATE OR REPLACE VIEW show_seats_with_details AS
SELECT
  ss.id,
  ss.show_id,
  ss.seat_id,
  ss.status,
  ss.price_in_cents,
  ss.reserved_by,
  ss.reserved_until,
  ss.created_at,
  ss.updated_at,

  -- From seats table
  s.row_name,
  s.seat_number,
  s.seat_type,
  s.x_position,
  s.y_position,
  s.section_id,

  -- From venue_sections
  vs.name as section_name,
  vs.display_order as section_order,

  -- From price_zones
  pz.name as price_zone_name,
  pz.color as price_zone_color,

  -- Derived fields
  CASE WHEN s.seat_type = 'ada' THEN true ELSE false END as handicap_access

FROM show_seats ss
INNER JOIN seats s ON ss.seat_id = s.id
LEFT JOIN venue_sections vs ON s.section_id = vs.id
LEFT JOIN price_zones pz ON s.price_zone_id = pz.id;

-- Add RLS policies to the view
ALTER VIEW show_seats_with_details SET (security_invoker = on);
```

Then update endpoints to:
```typescript
const { data } = await client
  .from('show_seats_with_details')
  .select('*')
  .eq('show_id', showId)
```

### Option 2: Update Each Endpoint

Update each endpoint individually to use proper joins (see correct pattern above).

### Option 3: Create Helper Function

Create a composable/utility function that standardizes show_seats queries:

```typescript
// server/utils/showSeats.ts
export async function getShowSeatsWithDetails(
  client: SupabaseClient,
  showId: string,
  filters?: {
    section?: string
    status?: string
    handicapAccess?: boolean
  }
) {
  let query = client
    .from('show_seats')
    .select(`
      id,
      show_id,
      seat_id,
      status,
      price_in_cents,
      reserved_by,
      reserved_until,
      seat:seats (
        row_name,
        seat_number,
        seat_type,
        x_position,
        y_position,
        section:venue_sections (
          id,
          name,
          display_order
        ),
        price_zone:price_zones (
          name,
          color
        )
      )
    `)
    .eq('show_id', showId)

  // Apply filters...
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  // etc...

  return query
}
```

## Testing Plan

After fixing endpoints:

1. **Test seat generation**:
   ```bash
   POST /api/recital-shows/{showId}/seats/generate
   # Should create show_seats linked to venue's seats
   ```

2. **Test public seat viewing**:
   ```bash
   GET /api/public/recital-shows/{showId}/seats
   # Should return seats with section, row, number
   ```

3. **Test reservations**:
   ```bash
   POST /api/recital-shows/{showId}/seats/reserve
   # Should reserve by seat_id
   ```

4. **Test ticket display**:
   ```bash
   GET /api/public/tickets/{code}
   # Should show full seat details
   ```

## Recommended Approach

**For immediate fix**: Option 1 (Database View)
- Fastest to implement
- Single point of change
- Backwards compatible
- Can add computed fields (handicap_access)

**For long-term**: Combine Option 1 + Option 3
- Use view for read operations
- Use helper functions for complex queries
- Gradually migrate endpoints to use standardized patterns

## Security Notes

All fixed endpoints should:
1. Use `serverSupabaseClient(event)` NOT `getSupabaseClient()`
2. Add appropriate authentication checks:
   - Public endpoints: Can be unauthenticated
   - Admin endpoints: Require `requireAdminOrStaff(event)`
3. Validate show_id and seat_id existence
4. Check seat ownership in reservation/purchase flows

## Status

- [x] **FIXED**: `server/api/recital-shows/[id]/seats/generate.post.ts` - Now uses database function
- [ ] 13 endpoints still need fixing (listed above)
- [ ] Database view not yet created
- [ ] Helper functions not yet created

## Next Steps

1. Create `show_seats_with_details` view migration
2. Test view with one endpoint (e.g., public seats index)
3. Update remaining endpoints one by one
4. Add integration tests for seat reservation flow
5. Update TypeScript types to match corrected schema
