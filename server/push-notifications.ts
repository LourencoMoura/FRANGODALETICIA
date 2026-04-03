import webpush from 'web-push';
import { getPushSubscriptions, getAllPushSubscriptions, deletePushSubscription } from './db';

// Configure VAPID
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:frango@leticia.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Send push notification to a customer
 */
export async function sendPushNotification(
  customerId: number,
  title: string,
  body: string,
  icon?: string,
  badge?: string
) {
  try {
    const subscriptions = await getPushSubscriptions(customerId);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for customer ${customerId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icon-192x192.png',
          badge: badge || '/badge-72x72.png',
          tag: `notification-${Date.now()}`,
          requireInteraction: false,
        });

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );

        sent++;
        console.log(`✅ Push notification sent to customer ${customerId}`);
      } catch (error: any) {
        failed++;
        console.error(`❌ Failed to send push notification:`, error.message);

        // If subscription is invalid, delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await deletePushSubscription(sub.endpoint);
          console.log(`Deleted invalid subscription: ${sub.endpoint}`);
        }
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send push notification to all customers
 */
export async function sendBroadcastPushNotification(
  title: string,
  body: string,
  icon?: string,
  badge?: string
) {
  try {
    const subscriptions = await getAllPushSubscriptions();

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icon-192x192.png',
          badge: badge || '/badge-72x72.png',
          tag: `notification-${Date.now()}`,
          requireInteraction: false,
        });

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );

        sent++;
        console.log(`✅ Broadcast notification sent to customer ${sub.customerId}`);
      } catch (error: any) {
        failed++;
        console.error(`❌ Failed to send broadcast notification:`, error.message);

        // If subscription is invalid, delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await deletePushSubscription(sub.endpoint);
          console.log(`Deleted invalid subscription: ${sub.endpoint}`);
        }
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('Error sending broadcast push notification:', error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send status update notification
 */
export async function sendStatusUpdateNotification(
  customerId: number,
  status: string,
  orderId: number
) {
  const statusMessages: Record<string, { title: string; body: string }> = {
    'pedido-recebido': {
      title: '⏳ Pedido Recebido!',
      body: 'Estamos preparando seu frango 🍗',
    },
    'preparando': {
      title: '🍳 Preparando seu Pedido',
      body: 'Seu frango está sendo preparado com muito cuidado!',
    },
    'pronto': {
      title: '✅ Pronto!',
      body: 'Seu pedido está pronto para retirada/entrega',
    },
    'saiu-para-entrega': {
      title: '🚚 Saiu para Entrega!',
      body: 'Seu pedido está a caminho. Chegando em breve!',
    },
    'entregue': {
      title: '✨ Pedido Entregue!',
      body: 'Obrigado pela preferência! Aproveite seu frango 🍗',
    },
  };

  const message = statusMessages[status] || {
    title: 'Atualização de Pedido',
    body: `Seu pedido foi atualizado para: ${status}`,
  };

  return sendPushNotification(customerId, message.title, message.body);
}

/**
 * Send promotion notification
 */
export async function sendPromotionNotification(
  title: string,
  description: string,
  discount: number,
  discountType: 'percentual' | 'fixo'
) {
  const discountText = discountType === 'percentual' ? `${discount}%` : `R$ ${discount.toFixed(2)}`;
  const body = `${description} - Desconto de ${discountText}! 🎉`;

  return sendBroadcastPushNotification(title, body, '/icon-192x192.png', '/badge-72x72.png');
}
