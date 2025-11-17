import { getSupabaseClient } from '~/server/utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw createError({
        statusCode: 400,
        message: 'Missing required subscription data',
      });
    }

    // Get authenticated user
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      });
    }

    const client = getSupabaseClient();

    // Check if subscription already exists
    const { data: existing } = await client
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await client
        .from('push_subscriptions')
        .update({
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        throw createError({
          statusCode: 500,
          message: 'Failed to update subscription',
        });
      }

      return { success: true, message: 'Subscription updated' };
    }

    // Create new subscription
    const { error: insertError } = await client
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

    if (insertError) {
      throw createError({
        statusCode: 500,
        message: 'Failed to save subscription',
      });
    }

    return { success: true, message: 'Subscription saved' };
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to save push subscription',
    });
  }
});
