// server/utils/stripe.ts
import Stripe from 'stripe'

// Initialize Stripe with the secret key from runtime config
export function getStripeClient() {
  const config = useRuntimeConfig()
  const secretKey = config.stripeSecretKey
  
  if (!secretKey) {
    throw new Error('Stripe secret key not configured')
  }
  
  return new Stripe(secretKey)
}

// Get Stripe publishable key from runtime config
export function getStripePublishableKey() {
  const config = useRuntimeConfig()
  return config.public.stripePublishableKey
}

// Calculate service fee (5% of subtotal)
export function calculateServiceFee(subtotal) {
  return Math.round(subtotal * 0.05)
}

// Format price from cents to dollars
export function formatPrice(cents) {
  return (cents / 100).toFixed(2)
}