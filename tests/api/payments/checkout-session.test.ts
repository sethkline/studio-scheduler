// tests/api/payments/checkout-session.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockStripeClient, createMockEvent } from '../../utils/mocks'

// Mock Stripe
const mockStripe = createMockStripeClient()
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    ...mockStripe,
    checkout: {
      sessions: {
        create: vi.fn()
      }
    }
  }))
}))

// Mock Supabase
const mockData = {
  student_recital_fees: [
    {
      id: 'fee-1',
      balance_in_cents: 5000,
      student: { first_name: 'John', last_name: 'Doe' },
      recital_show: { name: 'Spring Recital' },
      fee_type: { name: 'Performance Fee' }
    },
    {
      id: 'fee-2',
      balance_in_cents: 3000,
      student: { first_name: 'Jane', last_name: 'Smith' },
      recital_show: { name: 'Spring Recital' },
      fee_type: { name: 'Costume Fee' }
    }
  ]
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

// Import after mocks
const handler = await import('../../../server/api/payments/create-checkout-session.post')

describe('POST /api/payments/create-checkout-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
  })

  it('should create checkout session successfully', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: ['fee-1', 'fee-2'],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    const mockSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    }

    const Stripe = (await import('stripe')).default
    const stripeInstance = new Stripe('sk_test_123')
    ;(stripeInstance.checkout.sessions.create as any) = vi.fn().mockResolvedValue(mockSession)

    const result = await handler.default(event)

    expect(result).toEqual({
      url: mockSession.url,
      session_id: mockSession.id
    })
  })

  it('should validate required fee_ids', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should validate fee_ids is an array', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: 'not-an-array',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should validate fee_ids is not empty', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: [],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should validate success_url is required', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: ['fee-1'],
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should validate cancel_url is required', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: ['fee-1'],
        success_url: 'https://example.com/success'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should handle missing fees', async () => {
    const emptyMockData = {
      student_recital_fees: []
    }

    vi.mock('../../../server/utils/supabase', () => ({
      getSupabaseClient: () => createMockSupabaseClient(emptyMockData)
    }))

    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: ['non-existent'],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })

  it('should handle missing STRIPE_SECRET_KEY', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const event = createMockEvent({
      method: 'POST',
      body: {
        fee_ids: ['fee-1'],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    })

    await expect(handler.default(event)).rejects.toThrow()
  })
})
