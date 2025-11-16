# Merchandise Store Security Guide

## Overview

The merchandise store implements critical security measures to prevent common e-commerce vulnerabilities, particularly around pricing manipulation and inventory fraud.

## Security Measures

### 1. Server-Side Price Validation

**Problem**: A malicious user could modify client-side code to submit arbitrary prices (e.g., paying $0.01 instead of $100).

**Solution**: All prices are **recalculated from the database** on the server side. The client can only submit:
- `variant_id` (which product they want)
- `quantity` (how many they want)

The actual price is fetched from the database and used for the order.

**Implementation**:
```typescript
// ❌ WRONG - Never trust client pricing
const subtotal = items.reduce((sum, item) => {
  return sum + (item.unit_price_in_cents * item.quantity) // Client can lie about price!
}, 0)

// ✅ CORRECT - Fetch prices from database
const { data: variants } = await client
  .from('merchandise_variants')
  .select('*, product:merchandise_products(*)')
  .in('id', variantIds)

const unitPrice = variant.product.base_price_in_cents + variant.price_adjustment_in_cents
```

### 2. Inventory Validation and Atomicity

**Problem**: Multiple users could simultaneously purchase the last item, causing overselling.

**Solution**: Two approaches are provided:

#### Approach A: Optimistic Locking (Current Implementation)

File: `server/api/merchandise/orders/index.post.ts`

1. Fetch current inventory with stock levels
2. Validate availability
3. Create order
4. Update inventory with conditional check:
   ```sql
   UPDATE inventory
   SET quantity_reserved = quantity_reserved + ?
   WHERE variant_id = ?
     AND quantity_reserved = ? -- Ensure it hasn't changed
   ```
5. If update fails (someone else reserved it), rollback the order

**Pros**:
- Works with standard Supabase client
- No need for custom database functions

**Cons**:
- Requires manual rollback logic
- Multiple round-trips to database

#### Approach B: Database Transaction (Recommended)

File: `server/api/merchandise/orders/create-transactional.post.ts`
Migration: `supabase/migrations/merchandise_order_transaction.sql`

1. Call PostgreSQL function `create_merchandise_order()`
2. Function uses `FOR UPDATE` row-level locks
3. All operations (validate, create, reserve) happen atomically
4. Automatic rollback on any error

**Pros**:
- True ACID transactions
- No race conditions
- Simpler code
- Better performance (single database call)

**Cons**:
- Requires running SQL migration
- Slightly more complex initial setup

### 3. Product Availability Validation

The system validates:
- Product is active (`is_active = true`)
- Variant is available (`is_available = true`)
- Inventory record exists
- Sufficient stock is available

**Implementation**:
```typescript
// Check if product and variant are active/available
if (!variant.product.is_active || !variant.is_available) {
  return createError({
    statusCode: 400,
    statusMessage: `Product "${variant.product.name}" is not available`
  })
}

// Validate inventory
const availableStock = inventory.quantity_on_hand - inventory.quantity_reserved
if (availableStock < item.quantity) {
  return createError({
    statusCode: 400,
    statusMessage: `Insufficient stock. Only ${availableStock} available.`
  })
}
```

### 4. Input Validation

All user inputs are validated:

```typescript
// Only accept variant_id and quantity from client
const validatedItems = items.map((item: any) => ({
  variant_id: item.variant_id,
  quantity: parseInt(item.quantity, 10)
}))

// Validate quantities are positive integers
if (validatedItems.some((item: any) =>
  !item.variant_id ||
  item.quantity <= 0 ||
  !Number.isInteger(item.quantity)
)) {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid item data'
  })
}
```

### 5. Transaction Rollback

If any step fails during order creation, all changes are rolled back:

**Optimistic Locking Approach**:
```typescript
if (itemsError) {
  // Rollback: delete the order if items insertion fails
  await client.from('merchandise_orders').delete().eq('id', order.id)
  throw itemsError
}
```

**Transaction Approach**:
Automatic rollback via PostgreSQL `BEGIN...COMMIT/ROLLBACK`

## Attack Scenarios Prevented

### Scenario 1: Price Manipulation
**Attack**: User modifies JavaScript to submit $0.01 for a $100 product.
**Prevention**: Server fetches actual price from database and ignores client value.

### Scenario 2: Inventory Overdraw
**Attack**: User purchases 10 items when only 5 are available.
**Prevention**: Server validates available stock before order creation.

### Scenario 3: Race Condition
**Attack**: Two users simultaneously purchase the last item.
**Prevention**: Optimistic locking or row-level locks prevent double-selling.

### Scenario 4: Disabled Product Purchase
**Attack**: User purchases a product that was deactivated.
**Prevention**: Server checks `is_active` and `is_available` flags.

## Migration Guide

### Switching to Transactional Endpoint

1. **Run the migration**:
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: supabase/migrations/merchandise_order_transaction.sql
   ```

2. **Update the composable**:
   ```typescript
   // In composables/useMerchandiseService.ts
   const createOrder = async (orderData) => {
     return await useFetch('/api/merchandise/orders/create-transactional', {
       method: 'POST',
       body: orderData
     })
   }
   ```

3. **Test the endpoint**:
   - Create an order
   - Verify inventory is reserved
   - Test insufficient stock scenario
   - Test concurrent purchases

## Best Practices

1. **Never trust client data for pricing**
   - Always recalculate from database
   - Use server-side tax and shipping calculations

2. **Use transactions for complex operations**
   - Inventory management
   - Financial operations
   - Multi-step workflows

3. **Validate all inputs**
   - Type checking
   - Range validation
   - Business rule validation

4. **Log security events**
   - Failed validation attempts
   - Inventory conflicts
   - Price discrepancies

5. **Test edge cases**
   - Concurrent purchases
   - Out of stock scenarios
   - Invalid product IDs
   - Negative quantities

## Monitoring

Monitor these metrics to detect potential security issues:

- **Failed order creations**: High rate may indicate automated attacks
- **Inventory conflicts**: Frequent 409 errors suggest stock issues
- **Price discrepancies**: Should be zero if client behaves correctly
- **Validation failures**: Pattern may reveal attack attempts

## Testing

### Unit Tests
```typescript
describe('Order Creation Security', () => {
  it('should reject client-supplied pricing', async () => {
    const maliciousOrder = {
      items: [{ variant_id: 'xxx', quantity: 1, unit_price_in_cents: 1 }],
      checkout: { /* ... */ }
    }
    // Should fetch actual price from DB, not use client value
  })

  it('should prevent inventory overdraw', async () => {
    // Set inventory to 5
    // Attempt to order 10
    // Should reject with 400 error
  })

  it('should handle concurrent purchases', async () => {
    // Two simultaneous orders for same item
    // Only one should succeed
  })
})
```

### Integration Tests
```bash
# Test concurrent purchases
curl -X POST /api/merchandise/orders -d '...' &
curl -X POST /api/merchandise/orders -d '...' &
wait

# Verify only correct quantity was sold
```

## Security Checklist

- [x] Prices fetched from database, not client
- [x] Inventory validated before order creation
- [x] Atomic operations (optimistic locking or transactions)
- [x] Product availability checked (is_active, is_available)
- [x] Input validation (positive integers, required fields)
- [x] Rollback on failures
- [x] Row-level security policies (if using Supabase RLS)
- [x] SQL injection prevention (parameterized queries)
- [x] Error messages don't leak sensitive data

## Additional Recommendations

1. **Rate Limiting**: Implement rate limiting on order endpoints
2. **CAPTCHA**: Add CAPTCHA for checkout to prevent bots
3. **Fraud Detection**: Monitor for suspicious patterns
4. **Audit Logging**: Log all order creation attempts
5. **Admin Alerts**: Notify admins of unusual activity

## Related Files

- `server/api/merchandise/orders/index.post.ts` - Main order endpoint (optimistic locking)
- `server/api/merchandise/orders/create-transactional.post.ts` - Transactional endpoint
- `supabase/migrations/merchandise_order_transaction.sql` - Transaction function
- `docs/database/merchandise-db.md` - Database schema documentation
