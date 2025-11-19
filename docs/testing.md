# Testing Guide

## Overview

This project uses **Vitest** as the primary testing framework, with support for unit, integration, and end-to-end tests. The testing philosophy emphasizes comprehensive coverage, maintainability, and confidence in deployments.

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Write Tests First (TDD)**: Write failing tests before implementing features
3. **Keep Tests Simple**: Tests should be easy to read and understand
4. **Test Coverage**: Aim for >80% coverage on critical paths
5. **Fast Feedback**: Tests should run quickly for rapid iteration

### What to Test

**DO Test**:
- User-facing functionality (UI interactions, forms, navigation)
- Business logic (calculations, validations, transformations)
- API endpoints (request/response, authentication, authorization)
- Edge cases and error handling
- Integration between components and services

**DON'T Test**:
- Framework internals (Nuxt, Vue, PrimeVue)
- Third-party libraries (unless integration is critical)
- Trivial getters/setters
- Auto-generated code

## Test Structure

### Directory Organization

```
studio-scheduler/
├── __tests__/                  # Test files
│   ├── unit/                  # Unit tests
│   │   ├── composables/
│   │   ├── utils/
│   │   └── stores/
│   ├── integration/           # Integration tests
│   │   ├── api/
│   │   └── components/
│   └── e2e/                   # End-to-end tests
│       ├── ticketing.spec.ts
│       └── auth.spec.ts
├── vitest.config.ts           # Vitest configuration
└── package.json
```

### Naming Conventions

- Test files: `*.spec.ts` or `*.test.ts`
- Unit tests: `componentName.spec.ts`
- Integration tests: `featureName.integration.spec.ts`
- E2E tests: `workflow.e2e.spec.ts`

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- __tests__/unit/composables/usePermissions.spec.ts

# Run tests with coverage
npm run test:coverage

# Run tests matching pattern
npm test -- --grep="ticket purchase"
```

### Test Modes

```bash
# Unit tests only
npm test -- __tests__/unit

# Integration tests only
npm test -- __tests__/integration

# E2E tests only
npm test -- __tests__/e2e
```

## Writing Tests

### Unit Tests

Test individual functions, composables, or components in isolation.

#### Example: Testing a Composable

```typescript
// __tests__/unit/composables/usePermissions.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePermissions } from '~/composables/usePermissions'
import { useAuthStore } from '~/stores/auth'

describe('usePermissions', () => {
  beforeEach(() => {
    // Reset store state before each test
    const authStore = useAuthStore()
    authStore.$reset()
  })

  it('should return true for admin with canManageStudents permission', () => {
    const authStore = useAuthStore()
    authStore.profile = { user_role: 'admin' }

    const { can } = usePermissions()
    expect(can('canManageStudents')).toBe(true)
  })

  it('should return false for parent with canManageStudents permission', () => {
    const authStore = useAuthStore()
    authStore.profile = { user_role: 'parent' }

    const { can } = usePermissions()
    expect(can('canManageStudents')).toBe(false)
  })

  it('should handle missing profile gracefully', () => {
    const { can } = usePermissions()
    expect(can('canManageStudents')).toBe(false)
  })
})
```

#### Example: Testing a Component

```typescript
// __tests__/unit/components/TicketCard.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketCard from '~/components/ticket/TicketCard.vue'

describe('TicketCard', () => {
  it('should render ticket information correctly', () => {
    const ticket = {
      id: '1',
      seat_number: 'A12',
      price: 25.00,
      show_name: 'Spring Recital'
    }

    const wrapper = mount(TicketCard, {
      props: { ticket }
    })

    expect(wrapper.text()).toContain('A12')
    expect(wrapper.text()).toContain('$25.00')
    expect(wrapper.text()).toContain('Spring Recital')
  })

  it('should emit delete event when delete button is clicked', async () => {
    const ticket = { id: '1', seat_number: 'A12' }
    const wrapper = mount(TicketCard, {
      props: { ticket }
    })

    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')?.[0]).toEqual(['1'])
  })
})
```

### Integration Tests

Test interactions between multiple components or services.

#### Example: Testing API Endpoints

```typescript
// __tests__/integration/api/tickets.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Tickets API', async () => {
  await setup({
    // Test context configuration
  })

  beforeEach(async () => {
    // Seed test database
  })

  it('should create a ticket order', async () => {
    const orderData = {
      show_id: '123',
      seats: ['A1', 'A2'],
      email: 'test@example.com'
    }

    const response = await $fetch('/api/tickets/purchase', {
      method: 'POST',
      body: orderData
    })

    expect(response.success).toBe(true)
    expect(response.order.tickets).toHaveLength(2)
  })

  it('should prevent double-booking seats', async () => {
    // First booking
    await $fetch('/api/tickets/purchase', {
      method: 'POST',
      body: { show_id: '123', seats: ['A1'] }
    })

    // Attempt second booking (should fail)
    await expect(
      $fetch('/api/tickets/purchase', {
        method: 'POST',
        body: { show_id: '123', seats: ['A1'] }
      })
    ).rejects.toThrow('Seat already booked')
  })
})
```

### End-to-End Tests

Test complete user workflows from start to finish.

#### Example: E2E Test with Playwright

```typescript
// __tests__/e2e/ticketing.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Ticket Purchase Flow', () => {
  test('should complete full ticket purchase', async ({ page }) => {
    // Navigate to ticket page
    await page.goto('/public/recital-tickets/123')

    // Select seats
    await page.click('[data-seat-id="A1"]')
    await page.click('[data-seat-id="A2"]')

    // Verify seats selected
    expect(await page.locator('.selected-seat').count()).toBe(2)

    // Fill out customer info
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="name"]', 'John Doe')

    // Proceed to checkout
    await page.click('button:has-text("Checkout")')

    // Should redirect to Stripe (test mode)
    await expect(page).toHaveURL(/stripe\.com/)
  })

  test('should show error for sold-out show', async ({ page }) => {
    await page.goto('/public/recital-tickets/sold-out-show')

    await expect(page.locator('text=Sold Out')).toBeVisible()
    await expect(page.locator('button:has-text("Select Seats")')).toBeDisabled()
  })
})
```

## Mocking Strategies

### Mocking External Services

#### Supabase

```typescript
import { vi } from 'vitest'

// Mock Supabase client
vi.mock('~/server/utils/supabase', () => ({
  getSupabaseClient: () => ({
    from: (table: string) => ({
      select: vi.fn().mockReturnValue({
        data: [],
        error: null
      }),
      insert: vi.fn().mockReturnValue({
        data: {},
        error: null
      })
    })
  })
}))
```

#### Stripe

```typescript
import { vi } from 'vitest'

// Mock Stripe service
vi.mock('~/composables/useStripeService', () => ({
  useStripeService: () => ({
    createCheckoutSession: vi.fn().mockResolvedValue({
      url: 'https://checkout.stripe.com/test'
    })
  })
}))
```

#### Mailgun

```typescript
import { vi } from 'vitest'

// Mock email service
vi.mock('~/server/utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}))
```

### Mocking Components

```typescript
import { vi } from 'vitest'

// Mock PrimeVue Dialog
vi.mock('primevue/dialog', () => ({
  default: {
    name: 'Dialog',
    template: '<div><slot /></div>'
  }
}))
```

## Test Data

### Fixtures

Create reusable test data:

```typescript
// __tests__/fixtures/tickets.ts
export const mockTicket = {
  id: '1',
  seat_number: 'A12',
  price: 25.00,
  show_id: 'show-1',
  order_id: 'order-1'
}

export const mockOrder = {
  id: 'order-1',
  email: 'test@example.com',
  total: 50.00,
  tickets: [mockTicket]
}
```

### Factories

Create test data programmatically:

```typescript
// __tests__/factories/ticketFactory.ts
export function createTicket(overrides = {}) {
  return {
    id: Math.random().toString(),
    seat_number: 'A1',
    price: 25.00,
    ...overrides
  }
}
```

## Coverage Requirements

### Target Coverage

- **Overall**: 80%+
- **Critical paths** (payments, authentication): 95%+
- **UI components**: 70%+
- **Utilities**: 90%+

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Reports

Coverage reports include:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## Continuous Integration

### GitHub Actions

Tests run automatically on every push and pull request.

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Arrange-Act-Assert (AAA)

```typescript
it('should calculate total price', () => {
  // Arrange
  const tickets = [
    { price: 25 },
    { price: 30 }
  ]

  // Act
  const total = calculateTotal(tickets)

  // Assert
  expect(total).toBe(55)
})
```

### 2. Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => { ... })

// ✅ Good
it('should calculate total price for multiple tickets', () => { ... })
```

### 3. One Assertion Per Test (when possible)

```typescript
// ✅ Good
it('should return correct name', () => {
  expect(user.name).toBe('John')
})

it('should return correct email', () => {
  expect(user.email).toBe('john@example.com')
})
```

### 4. Test Edge Cases

```typescript
describe('calculateDiscount', () => {
  it('should handle zero quantity', () => {
    expect(calculateDiscount(0)).toBe(0)
  })

  it('should handle negative quantity', () => {
    expect(() => calculateDiscount(-1)).toThrow()
  })

  it('should handle large quantities', () => {
    expect(calculateDiscount(1000)).toBe(100)
  })
})
```

### 5. Clean Up After Tests

```typescript
import { afterEach } from 'vitest'

afterEach(() => {
  // Clear mocks
  vi.clearAllMocks()

  // Reset stores
  const authStore = useAuthStore()
  authStore.$reset()
})
```

## Debugging Tests

### VSCode Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Using Debugger

```typescript
it('should debug this test', () => {
  debugger // Execution will pause here
  const result = someFunction()
  expect(result).toBe(true)
})
```

### Logging

```typescript
it('should log intermediate values', () => {
  const data = processData()
  console.log('Processed data:', data)
  expect(data).toBeDefined()
})
```

## Common Testing Patterns

### Testing Async Code

```typescript
it('should fetch user data', async () => {
  const user = await fetchUser('123')
  expect(user.id).toBe('123')
})
```

### Testing Error Handling

```typescript
it('should throw error for invalid input', () => {
  expect(() => validateEmail('invalid')).toThrow('Invalid email')
})
```

### Testing Timers

```typescript
import { vi } from 'vitest'

it('should delay execution', async () => {
  vi.useFakeTimers()

  const callback = vi.fn()
  setTimeout(callback, 1000)

  vi.advanceTimersByTime(1000)
  expect(callback).toHaveBeenCalled()

  vi.useRealTimers()
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Nuxt Testing Docs](https://nuxt.com/docs/getting-started/testing)

## Related Documentation

- [Architecture Guide](/docs/architecture.md)
- [Contributing Guide](/CONTRIBUTING.md)
- [Deployment Guide](/docs/deployment.md)
