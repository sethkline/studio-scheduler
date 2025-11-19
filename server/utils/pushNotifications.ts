import webpush from 'web-push';
import { getSupabaseClient } from './supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const config = useRuntimeConfig();

    // Configure web-push
    webpush.setVapidDetails(
      `mailto:${config.mailgunDomain}`,
      config.public.vapidPublicKey,
      config.vapidPrivateKey
    );

    const client = getSupabaseClient();

    // Get user's push subscriptions
    const { data: subscriptions, error } = await client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return { success: false, sent: 0, failed: 0 };
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      tag: payload.tag || 'notification',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
      actions: payload.actions || [],
    });

    // Send to all subscriptions
    let sent = 0;
    let failed = 0;

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
          notificationPayload
        );
        sent++;
      } catch (error: any) {
        console.error('Failed to send notification to subscription:', error);
        failed++;

        // If subscription is invalid (410 Gone or 404 Not Found), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await client
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          console.log('Removed invalid subscription:', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return { success: sent > 0, sent, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToMultiple(
  userIds: string[],
  payload: NotificationPayload
): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: Array<{ userId: string; sent: number; failed: number }>;
}> {
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const result = await sendPushNotification(userId, payload);
      return {
        userId,
        sent: result.sent,
        failed: result.failed,
      };
    })
  );

  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  return {
    success: totalSent > 0,
    totalSent,
    totalFailed,
    results,
  };
}

/**
 * Send push notification to all parents
 */
export async function sendPushNotificationToParents(
  payload: NotificationPayload
): Promise<{ success: boolean; totalSent: number; totalFailed: number }> {
  try {
    const client = getSupabaseClient();

    // Get all parent user IDs
    const { data: parents, error } = await client
      .from('profiles')
      .select('user_id')
      .eq('user_role', 'parent');

    if (error || !parents || parents.length === 0) {
      console.log('No parents found');
      return { success: false, totalSent: 0, totalFailed: 0 };
    }

    const userIds = parents.map((p) => p.user_id);
    const result = await sendPushNotificationToMultiple(userIds, payload);

    return {
      success: result.success,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
    };
  } catch (error) {
    console.error('Error sending notifications to parents:', error);
    return { success: false, totalSent: 0, totalFailed: 0 };
  }
}
