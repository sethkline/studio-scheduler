// server/api/ticket-orders/payment-intent.post.ts

import Stripe from 'stripe'
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse } from '~/types/ticketing'
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(
  async (event): Promise<CreatePaymentIntentResponse> => {
    const config = useRuntimeConfig()
    const client = getSupabaseClient()

    try {
      // Read request body
      const body = await readBody<CreatePaymentIntentRequest>(event)
      const { order_id } = body

      if (!order_id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing required field: order_id'
        })
      }

      // Step 1: Get the ticket order
      const { data: order, error: orderError } = await client
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

      // Check if order is in pending status
      if (order.status !== 'pending') {
        throw createError({
          statusCode: 400,
          statusMessage: `Order is already ${order.status}. Cannot create payment intent.`
        })
      }

      // Step 2: Check if payment intent already exists
      if (order.stripe_payment_intent_id) {
        // Try to retrieve the existing payment intent
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

      // Step 4: Update order with payment intent ID
      const { error: updateError } = await client
        .from('ticket_orders')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Error updating order with payment intent:', updateError)
        // Not critical, continue
      }

      return {
        success: true,
        client_secret: paymentIntent.client_secret!,
        publishable_key: config.public.stripePublishableKey,
        order: {
          ...order,
          stripe_payment_intent_id: paymentIntent.id
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
