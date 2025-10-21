import webpush from 'web-push';

// Initialize web-push with VAPID details
const vapidDetails = {
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@bangerrequest.app',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidDetails.publicKey && vapidDetails.privateKey) {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  );
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: {
    requestId?: string;
    action?: string;
    url?: string;
    id?: string;
    artist?: string;
    event?: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload | string
): Promise<boolean> {
  try {
    const pushOptions = {
      TTL: 60, // 60 seconds
      urgency: 'high' as const,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      pushOptions
    );

    return true;
  } catch (error: unknown) {
    console.error('Push notification send failed:', error);
    
    // Handle specific error codes
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const webPushError = error as { statusCode: number };
      if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
        // Subscription is invalid, should be removed
        console.log('Subscription is invalid, should be removed:', subscription.endpoint);
        return false;
      }
    }
    
    throw error;
  }
}

export async function sendToMultipleSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload | string
): Promise<{ success: number; failed: number; invalidSubscriptions: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const success = await sendPushNotification(subscription, payload);
      return { subscription, success };
    })
  );

  let success = 0;
  let failed = 0;
  const invalidSubscriptions: string[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        success++;
      } else {
        // Subscription was invalid
        invalidSubscriptions.push(result.value.subscription.endpoint);
        failed++;
      }
    } else {
      failed++;
    }
  });

  return { success, failed, invalidSubscriptions };
}

export { webpush };