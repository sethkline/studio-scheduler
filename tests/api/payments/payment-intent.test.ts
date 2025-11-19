// tests/api/payments/payment-intent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockStripeClient, createMockEvent } from '../../utils/mocks'

// Mock Stripe
const mockStripe = createMockStripeClient()
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => mockStripe)
}))

// Mock data for reservations
const mockData = {
  seat_reservations: [
    {
      id: 'res-1',
      reservation_token: 'RES-VALID-TOKEN',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min future
      is_active: true,
      seat_ids: ['seat-1', 'seat-2']
    },
    {
      id: 'res-2',
      reservation_token: 'RES-EXPIRED-TOKEN',
      expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min past
      is_active: true,
      seat_ids: ['seat-3']
    }
  ]
}

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

const handler = await import('../../../server/api/payments/create-intent.post')

describe('POST /api/payments/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
  })

  it('should create payment intent successfully', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 5000,
        currency: 'usd'
      }
    })

    mockStripe.paymentIntents.create = vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_456',
      amount: 5000,
      currency: 'usd'
    })

    const result = await handler.default(event)

    expect(result).toHaveProperty('clientSecret')
    expect(result).toHaveProperty('paymentIntentId')
    expect(result.paymentIntentId).toBe('pi_test_123')
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        metadata: expect.objectContaining({
          reservation_token: 'RES-VALID-TOKEN'
        })
      })
    )
  })

  it('should validate reservation_token is required', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        amount: 5000
      }
    })

    const result = await handler.default(event)

    // Check if error was returned
    expect(result.statusCode).toBe(400)
  })

  it('should handle non-existent reservation', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'NON-EXISTENT',
        amount: 5000
      }
    })

    const result = await handler.default(event)

    expect(result.statusCode).toBe(404)
  })

  it('should reject expired reservations', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-EXPIRED-TOKEN',
        amount: 5000
      }
    })

    const result = await handler.default(event)

    expect(result.statusCode).toBe(410)
  })

  it('should handle missing STRIPE_SECRET_KEY', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 5000
      }
    })

    const result = await handler.default(event)

    expect(result.statusCode).toBe(500)
  })

  it('should round amount to integer', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 50.99
      }
    })

    mockStripe.paymentIntents.create = vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret'
    })

    await handler.default(event)

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 51 // Rounded up
      })
    )
  })

  it('should use default currency usd when not specified', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 5000
      }
    })

    mockStripe.paymentIntents.create = vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret'
    })

    await handler.default(event)

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'usd'
      })
    )
  })

  it('should use default payment_method_types card when not specified', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 5000
      }
    })

    mockStripe.paymentIntents.create = vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret'
    })

    await handler.default(event)

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ['card']
      })
    )
  })

  it('should handle Stripe errors gracefully', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        reservation_token: 'RES-VALID-TOKEN',
        amount: 5000
      }
    })

    mockStripe.paymentIntents.create = vi.fn().mockRejectedValue(
      new Error('Stripe API error')
    )

    const result = await handler.default(event)

    expect(result.statusCode).toBe(500)
  })
})
