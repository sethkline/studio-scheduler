// server/api/config/stripe-key.ts
import { getStripePublishableKey } from '../../utils/stripe';

export default defineEventHandler(async (event) => {
  try {
    const publishableKey = getStripePublishableKey();
    
    if (!publishableKey) {
      return createError({
        statusCode: 500,
        statusMessage: 'Stripe API key not configured'
      });
    }
    
    return {
      publishableKey
    };
  } catch (error) {
    console.error('Stripe key API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve Stripe API key'
    });
  }
});
