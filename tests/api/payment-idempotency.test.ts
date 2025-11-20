/**
 * Payment Idempotency Tests
 *
 * Tests idempotency key handling to prevent duplicate charges
 * Critical for production payment processing
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

describe('Payment Idempotency', () => {
  let supabaseClient: ReturnType<typeof createClient>

  beforeAll(async () => {
    await setup({
      server: true
    })

    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  })

  describe('Idempotency Key Support', () => {
    it('should return same payment intent for duplicate requests with same idempotency key', async () => {
      // Create an order
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation-token',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      const orderId = order.order.id
      const idempotencyKey = randomBytes(16).toString('hex')

      // Create payment intent with idempotency key
      const paymentIntent1 = await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: orderId,
          idempotency_key: idempotencyKey
        }
      })

      expect(paymentIntent1.success).toBe(true)
      const clientSecret1 = paymentIntent1.client_secret

      // Make same request again with same idempotency key
      const paymentIntent2 = await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: orderId,
          idempotency_key: idempotencyKey
        }
      })

      expect(paymentIntent2.success).toBe(true)
      const clientSecret2 = paymentIntent2.client_secret

      // Should return the SAME payment intent
      expect(clientSecret2).toBe(clientSecret1)
    })

    it('should reject request with same idempotency key but different order', async () => {
      // Create two different orders
      const order1 = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'reservation-1',
          customer_name: 'User 1',
          customer_email: 'user1@example.com'
        }
      })

      const order2 = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'reservation-2',
          customer_name: 'User 2',
          customer_email: 'user2@example.com'
        }
      })

      const idempotencyKey = randomBytes(16).toString('hex')

      // Use idempotency key with first order
      await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: order1.order.id,
          idempotency_key: idempotencyKey
        }
      })

      // Try to use same key with different order
      await expect(async () => {
        await $fetch('/api/ticket-orders/payment-intent-v2', {
          method: 'POST',
          body: {
            order_id: order2.order.id,
            idempotency_key: idempotencyKey
          }
        })
      }).rejects.toThrow(/idempotency key/)
    })

    it('should allow different idempotency keys for same order', async () => {
      // Create an order
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      const orderId = order.order.id

      // Create payment intent with first idempotency key
      const key1 = randomBytes(16).toString('hex')
      const paymentIntent1 = await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: orderId,
          idempotency_key: key1
        }
      })

      expect(paymentIntent1.success).toBe(true)

      // Should still work with different key (though unusual in practice)
      const key2 = randomBytes(16).toString('hex')
      const paymentIntent2 = await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: orderId,
          idempotency_key: key2
        }
      })

      // May return same or new payment intent depending on implementation
      // Key point: should not error
      expect(paymentIntent2.success).toBe(true)
    })

    it('should work without idempotency key (backward compatibility)', async () => {
      // Create an order
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      // Create payment intent WITHOUT idempotency key
      const paymentIntent = await $fetch('/api/ticket-orders/payment-intent-v2', {
        method: 'POST',
        body: {
          order_id: order.order.id
          // No idempotency_key
        }
      })

      expect(paymentIntent.success).toBe(true)
      expect(paymentIntent.client_secret).toBeDefined()
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle concurrent payment intent creation with same idempotency key', async () => {
      // Create an order
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      const orderId = order.order.id
      const idempotencyKey = randomBytes(16).toString('hex')

      // Make 5 concurrent requests with same idempotency key
      const promises = Array.from({ length: 5 }, () =>
        $fetch('/api/ticket-orders/payment-intent-v2', {
          method: 'POST',
          body: {
            order_id: orderId,
            idempotency_key: idempotencyKey
          }
        })
      )

      const results = await Promise.allSettled(promises)

      // All should either succeed or fail gracefully
      // No request should create a duplicate payment intent
      const successResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[]

      // All successful results should have the same client secret
      if (successResults.length > 1) {
        const firstSecret = successResults[0].value.client_secret
        successResults.forEach(result => {
          expect(result.value.client_secret).toBe(firstSecret)
        })
      }
    })
  })

  describe('Database Constraint Enforcement', () => {
    it('should enforce unique constraint on idempotency_key in database', async () => {
      const idempotencyKey = randomBytes(16).toString('hex')

      // Try to manually create two orders with same idempotency key
      const { data: order1, error: error1 } = await supabaseClient
        .from('ticket_orders')
        .insert({
          show_id: 'test-show-id',
          customer_name: 'Test User',
          customer_email: 'user@example.com',
          total_amount_in_cents: 1000,
          status: 'pending',
          order_number: 'TEST-001',
          idempotency_key: idempotencyKey
        })

      expect(error1).toBeNull()

      // Second insert with same key should fail
      const { error: error2 } = await supabaseClient
        .from('ticket_orders')
        .insert({
          show_id: 'test-show-id',
          customer_name: 'Different User',
          customer_email: 'other@example.com',
          total_amount_in_cents: 2000,
          status: 'pending',
          order_number: 'TEST-002',
          idempotency_key: idempotencyKey
        })

      // Should get unique constraint violation
      expect(error2).toBeDefined()
      expect(error2!.code).toBe('23505') // PostgreSQL unique violation
    })
  })

  describe('Idempotency Key Format', () => {
    it('should accept various idempotency key formats', async () => {
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      const testKeys = [
        randomBytes(16).toString('hex'), // Hex string
        `${Date.now()}-${Math.random()}`, // Timestamp-based
        'user-defined-key-12345', // Custom string
        crypto.randomUUID() // UUID
      ]

      for (const key of testKeys) {
        const result = await $fetch('/api/ticket-orders/payment-intent-v2', {
          method: 'POST',
          body: {
            order_id: order.order.id,
            idempotency_key: key
          }
        })

        expect(result.success).toBe(true)
      }
    })
  })

  describe('Order Confirmation Idempotency', () => {
    it('should handle duplicate confirmation calls gracefully', async () => {
      // Create and pay for an order
      const order = await $fetch('/api/ticket-orders/create', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          reservation_token: 'test-reservation',
          customer_name: 'Test User',
          customer_email: 'user@example.com'
        }
      })

      // First confirmation
      const confirmation1 = await $fetch('/api/ticket-orders/confirm', {
        method: 'POST',
        body: {
          order_id: order.order.id,
          payment_intent_id: 'test_payment_intent'
        }
      })

      expect(confirmation1.success).toBe(true)

      // Second confirmation (duplicate)
      const confirmation2 = await $fetch('/api/ticket-orders/confirm', {
        method: 'POST',
        body: {
          order_id: order.order.id,
          payment_intent_id: 'test_payment_intent'
        }
      })

      // Should succeed (idempotent)
      expect(confirmation2.success).toBe(true)
      expect(confirmation2.message).toContain('already confirmed')
    })
  })
})
