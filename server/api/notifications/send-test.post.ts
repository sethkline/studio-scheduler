import { requireAuth } from '~/server/utils/auth'
import webpush from 'web-push';
import { getUserSupabaseClient } from '../utils/supabase';

export default defineEventHandler(async (event) => {  await requireAuth(event)

  try {
    // Get authenticated user
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      });
    }

    const config = useRuntimeConfig();

    // Configure web-push
    webpush.setVapidDetails(
      `mailto:${config.mailgunDomain}`,
      config.public.vapidPublicKey,
      config.vapidPrivateKey
    );

    const client = await getUserSupabaseClient(event);

    // Get user's subscriptions
    const { data: subscriptions, error } = await client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (error || !subscriptions || subscriptions.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No push subscriptions found',
      });
    }

    // Send test notification to all user subscriptions
    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test notification from Dance Studio Scheduler!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'test-notification',
      data: {
        url: '/parent/dashboard',
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        return { success: true, endpoint: sub.endpoint };
      } catch (error: any) {
        console.error('Failed to send to subscription:', error);

        // If subscription is invalid (410 or 404), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await client
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }

        return { success: false, endpoint: sub.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      message: `Test notification sent to ${successCount} of ${subscriptions.length} devices`,
      results,
    };
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send test notification',
    });
  }
});
