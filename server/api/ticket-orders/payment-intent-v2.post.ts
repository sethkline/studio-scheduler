// server/api/ticket-orders/payment-intent-v2.post.ts
/**
 * HARDENED Payment Intent Creation Endpoint (v2)
 *
 * Adds explicit idempotency key support to prevent duplicate charges
 * Clients can provide an idempotency_key to ensure the same payment intent
 * is returned for duplicate requests
 *
 * IMPROVEMENTS OVER v1:
 * - Explicit idempotency key support
 * - Database-level duplicate prevention
 * - Better error handling for race conditions
 */

import Stripe from 'stripe'
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse } from '~/types/ticketing'
import { serverSupabaseClient } from '#supabase/server'
import { getReservationSessionId } from '~/server/utils/reservationSession'
import { getSupabaseClient } from '~/server/utils/supabase'

interface CreatePaymentIntentRequestV2 extends CreatePaymentIntentRequest {
  idempotency_key?: string
}

export default defineEventHandler(
  async (event): Promise<CreatePaymentIntentResponse> => {
    const config = useRuntimeConfig()
    const rlsClient = await serverSupabaseClient(event)
    const serviceClient = getSupabaseClient()

    try {
      // Get session ID for ownership verification
      const sessionId = await getReservationSessionId(event)

      // Get user ID if authenticated
      const { data: { user } } = await rlsClient.auth.getUser()
      const userId = user?.id || null

      // Read request body
      const body = await readBody<CreatePaymentIntentRequestV2>(event)
      const { order_id, idempotency_key } = body

      if (!order_id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing required field: order_id'
        })
      }

      // Step 0: If idempotency_key provided, check for existing order with same key
      if (idempotency_key) {
        const { data: existingOrder } = await serviceClient
          .from('ticket_orders')
          .select('*')
          .eq('idempotency_key', idempotency_key)
          .maybeSingle()

        if (existingOrder) {
          // Found existing order with this idempotency key
          // If it's a different order_id, this is a conflict
          if (existingOrder.id !== order_id) {
            console.warn(
              `Idempotency key collision: key=${idempotency_key}, ` +
              `existing_order=${existingOrder.id}, requested_order=${order_id}`
            )
            throw createError({
              statusCode: 409,
              statusMessage: 'This idempotency key has already been used for a different order'
            })
          }

          // Same order, check if payment intent exists
          if (existingOrder.stripe_payment_intent_id) {
            const stripe = new Stripe(config.stripeSecretKey, {
              apiVersion: '2024-12-18.acacia'
            })

            try {
              const existingIntent = await stripe.paymentIntents.retrieve(
                existingOrder.stripe_payment_intent_id
              )

              if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
                console.log(`Returning existing payment intent for idempotency key: ${idempotency_key}`)
                return {
                  success: true,
                  client_secret: existingIntent.client_secret!,
                  publishable_key: config.public.stripePublishableKey,
                  order: existingOrder
                }
              }
            } catch (error) {
              console.error('Error retrieving existing payment intent:', error)
              // Continue to create a new one
            }
          }
        }
      }

      // Step 1: Get the ticket order and verify ownership using RLS client
      const { data: order, error: orderError } = await rlsClient
        .from('ticket_orders')
        .select('*')
        .eq('id', order_id)
        .single()

      if (orderError || !order) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Order not found'
        })
      }

      // Verify ownership: session_id matches OR user_id matches OR admin/staff
      const isOwner = order.session_id === sessionId || order.user_id === userId

      if (!isOwner) {
        // Check if user is admin/staff
        if (userId) {
          const { data: profile } = await rlsClient
            .from('profiles')
            .select('user_role')
            .eq('id', userId)
            .single()

          if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
            throw createError({
              statusCode: 403,
              statusMessage: 'You do not have permission to access this order'
            })
          }
        } else {
          throw createError({
            statusCode: 403,
            statusMessage: 'You do not have permission to access this order'
          })
        }
      }

      // Check if order is in pending status
      if (order.status !== 'pending') {
        throw createError({
          statusCode: 400,
          statusMessage: `Order is already ${order.status}. Cannot create payment intent.`
        })
      }

      // Step 2: Check if payment intent already exists for this order
      if (order.stripe_payment_intent_id) {
        const stripe = new Stripe(config.stripeSecretKey, {
          apiVersion: '2024-12-18.acacia'
        })

        try {
          const existingIntent = await stripe.paymentIntents.retrieve(
            order.stripe_payment_intent_id
          )

          // If it exists and is not canceled/succeeded, return it
          if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
            return {
              success: true,
              client_secret: existingIntent.client_secret!,
              publishable_key: config.public.stripePublishableKey,
              order
            }
          }
        } catch (error) {
          console.error('Error retrieving existing payment intent:', error)
          // Continue to create a new one
        }
      }

      // Step 3: Create new Stripe payment intent
      const stripe = new Stripe(config.stripeSecretKey, {
        apiVersion: '2024-12-18.acacia'
      })

      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.total_amount_in_cents,
        currency: 'usd',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_email: order.customer_email,
          show_id: order.show_id
        },
        description: `Ticket Order ${order.order_number}`,
        receipt_email: order.customer_email,
        automatic_payment_methods: {
          enabled: true
        }
      })

      // Step 4: Update order with payment intent ID and idempotency key
      const updateData: any = {
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      }

      if (idempotency_key) {
        updateData.idempotency_key = idempotency_key
      }

      const { error: updateError } = await serviceClient
        .from('ticket_orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) {
        console.error('Error updating order with payment intent:', updateError)

        // Check if it's a unique constraint violation on idempotency_key
        if (updateError.code === '23505' && updateError.message?.includes('idempotency_key')) {
          // Race condition: another request with same key was processed
          throw createError({
            statusCode: 409,
            statusMessage: 'This idempotency key has already been used. Please retry your request.'
          })
        }

        // Not critical for other errors, continue
      }

      return {
        success: true,
        client_secret: paymentIntent.client_secret!,
        publishable_key: config.public.stripePublishableKey,
        order: {
          ...order,
          stripe_payment_intent_id: paymentIntent.id,
          idempotency_key: idempotency_key || null
        }
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error)

      // If it's already a createError, rethrow it
      if (error.statusCode) {
        throw error
      }

      // Stripe error
      if (error.type && error.type.startsWith('Stripe')) {
        throw createError({
          statusCode: 400,
          statusMessage: `Payment error: ${error.message}`
        })
      }

      // Generic error
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Failed to create payment intent'
      })
    }
  }
)
