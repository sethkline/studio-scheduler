# Integration Test Suite - Ticketing System

This directory contains comprehensive integration tests for the dance studio ticketing system, covering all critical user flows, error cases, security, and concurrency scenarios.

## Test Coverage

### 7.1.1 Admin Venue & Seat Map Testing
**Location:** `tests/integration/admin/`

- ✅ **venue-crud.test.ts** - Venue CRUD operations
  - Create, read, update, delete venues
  - Validation and authorization
  - Dependency checking before deletion

- ✅ **section-price-zone.test.ts** - Section & Price Zone management
  - Create and manage venue sections
  - Price zone creation and updates
  - Cascading updates to show_seats

- ✅ **seat-map-builder.test.ts** - Seat Map Builder
  - Individual seat creation and management
  - Bulk seat operations
  - CSV import with validation
  - Position updates

### 7.1.2 Show Configuration Testing
**Location:** `tests/integration/admin/`

- ✅ **show-configuration.test.ts** - Show-Venue linking and seat generation
  - Assign venues to shows
  - Generate show_seats from venue template
  - Seat statistics
  - PostgreSQL function testing

### 7.1.3 Public Purchase Flow Testing
**Location:** `tests/integration/public/`

- ✅ **seat-viewing.test.ts** - Public seat viewing
  - Display seat maps with availability
  - Color coding by price zone
  - ADA seat indicators
  - Responsive design

- ✅ **seat-selection.test.ts** - Seat selection & reservation
  - Seat selection UI logic
  - Reservation creation (10 min timer)
  - Session-based ownership
  - Concurrency handling
  - Consecutive seat gap detection

- ✅ **checkout-payment.test.ts** - Checkout & payment flow
  - Customer info collection
  - Stripe payment intent creation
  - Payment success handling
  - Error cases (declined, timeout, expired reservation)
  - Webhook integration

### 7.1.4 Ticket Generation & Delivery Testing
**Location:** `tests/integration/ticketing/`

- ✅ **ticket-generation.test.ts** - QR codes, PDF, email
  - QR code generation (unique, URL-safe)
  - PDF generation with show/seat details
  - Email delivery with attachments
  - Resend functionality

- ✅ **ticket-lookup.test.ts** - Public ticket lookup
  - Order search by email
  - Email verification
  - PDF downloads

### 7.1.5 Admin Order Management Testing
**Location:** `tests/integration/admin/`

- ✅ **order-management.test.ts** - Orders, refunds, dashboard
  - Order list with filters and search
  - Order details
  - Refund processing (full & partial)
  - Dashboard analytics
  - Sales reports (CSV export)

### 7.1.6 Security & Authorization Testing
**Location:** `tests/integration/security/`

- ✅ **authorization.test.ts** - Security tests
  - RLS policy testing
  - API authorization (role-based)
  - Input validation (SQL injection, XSS)
  - Rate limiting
  - Concurrency & race conditions

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Prepare Nuxt (generates .nuxt directory)
npm run postinstall
```

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suite

```bash
# Run only admin tests
npx vitest tests/integration/admin/

# Run only public tests
npx vitest tests/integration/public/

# Run only security tests
npx vitest tests/integration/security/
```

### Run With Coverage

```bash
npm run test:coverage
```

### Watch Mode (for development)

```bash
npx vitest --watch
```

## Test Structure

### Mock Utilities (`tests/utils/mocks.ts`)

- `createMockSupabaseClient()` - Mock Supabase with fluent query API
- `createMockStripeClient()` - Mock Stripe payment processing
- `createMockMailgunClient()` - Mock email sending
- `createMockEvent()` - Mock H3 event for API testing

### Test Factories (`tests/utils/factories.ts`)

- `createTestVenue()` - Create test venue data
- `createTestSeat()` - Create individual seats
- `createTestShowSeat()` - Create show seats
- `createTestOrder()` - Create test orders
- `createTestTicket()` - Create test tickets
- `createCompleteVenueSetup()` - Full venue with sections/zones/seats
- `createPurchaseFlowScenario()` - Complete purchase flow data

## Test Coverage Goals

- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

## Key Testing Patterns

### API Endpoint Testing

```typescript
import { createMockEvent } from '../../utils/mocks'
import apiHandler from '../../../server/api/endpoint.ts'

it('should handle request', async () => {
  const event = createMockEvent({
    method: 'POST',
    url: '/api/endpoint',
    body: { data: 'test' },
    user: { id: 'user-1', user_role: 'admin' }
  })

  const response = await apiHandler(event)

  expect(response.success).toBe(true)
})
```

### Database Mock Testing

```typescript
const mockData = {
  venues: [createTestVenue()],
  seats: [],
  show_seats: []
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))
```

### Concurrency Testing

```typescript
it('should prevent double booking', async () => {
  // First user reserves seat
  const event1 = createMockEvent({ ... })
  await reserveSeat(event1)

  // Update mock data to reflect reservation
  mockData.show_seats[0].status = 'reserved'

  // Second user tries same seat
  const event2 = createMockEvent({ ... })
  await expect(reserveSeat(event2)).rejects.toThrow()
})
```

## Notes on Implementation

These tests are designed to:

1. **Guide Development** - Tests define expected behavior before implementation
2. **Document Requirements** - Each test describes a specific requirement
3. **Prevent Regressions** - Catch breaking changes early
4. **Ensure Security** - Validate authorization and input sanitization
5. **Test Edge Cases** - Cover error scenarios and race conditions

Some tests may fail initially because:
- API endpoints haven't been created yet
- Database functions need implementation
- Frontend components need development

This is **expected** - the tests drive development using TDD (Test-Driven Development) principles.

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Tests
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

## Troubleshooting

### Tests Not Running

```bash
# Ensure dependencies are installed
npm install

# Prepare Nuxt
npm run postinstall
```

### Import Errors

```bash
# Clear Nuxt cache
rm -rf .nuxt

# Rebuild
npm run postinstall
```

### Mock Not Working

Check that the mock is defined before the import:

```typescript
vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

// Import AFTER mock
import apiHandler from '../../../server/api/endpoint.ts'
```

## Contributing

When adding new tests:

1. Follow existing patterns in `tests/utils/`
2. Use descriptive test names
3. Test both happy path and error cases
4. Include security considerations
5. Add comments for complex scenarios
6. Update this README

## Test Summary

- **Total Test Files:** 12
- **Estimated Total Tests:** 150+
- **Coverage Areas:** Admin, Public, Security, Ticketing
- **Test Types:** Unit, Integration, Security, Concurrency

## Related Documentation

- `/docs/TICKETING_IMPLEMENTATION_ROADMAP.md` - Implementation plan
- `/docs/feature-stories.md` - Detailed story breakdown
- `CLAUDE.md` - Project patterns and conventions
