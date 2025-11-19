import { requireAuth } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase';

export default defineEventHandler(async (event) => {  await requireAuth(event)

  try {
    const body = await readBody(event);
    const { endpoint } = body;

    if (!endpoint) {
      throw createError({
        statusCode: 400,
        message: 'Missing endpoint',
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

    const client = await getUserSupabaseClient(event);

    // Delete subscription
    const { error } = await client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Failed to remove subscription',
      });
    }

    return { success: true, message: 'Subscription removed' };
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to remove push subscription',
    });
  }
});
