import { eq, ne } from 'drizzle-orm';
import { orders } from '../drizzle/schema';
import webpush from 'web-push';
import { getDb } from './db';

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

// Map to track scheduled reminders (orderId -> timeoutId)
const scheduledReminders = new Map<number, NodeJS.Timeout>();

/**
 * Schedule a reminder notification for an order
 * Sends notification 15 minutes before delivery/pickup time
 */
export async function scheduleReminder(orderId: number) {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Get order details using Drizzle ORM
    const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    
    if (!result || result.length === 0) {
      console.error(`[Reminder] Order ${orderId} not found`);
      return;
    }

    const order = result[0];

    // Calculate reminder time (15 minutes before)
    let reminderTime: Date | null = null;

    if (order.tipo === 'retirada' && order.horarioRetirada) {
      // Parse time from horarioRetirada (format: HH:MM)
      const [hours, minutes] = order.horarioRetirada.split(':').map(Number);
      reminderTime = new Date();
      reminderTime.setHours(hours, minutes - 15, 0, 0);

      // If time has already passed today, schedule for tomorrow
      if (reminderTime < new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }
    } else if (order.tipo === 'entrega') {
      // For delivery, assume it will be delivered within 30 minutes
      // Schedule reminder for 15 minutes from now
      reminderTime = new Date(Date.now() + 15 * 60 * 1000);
    }

    if (!reminderTime) {
      console.error(`[Reminder] Could not calculate reminder time for order ${orderId}`);
      return;
    }

    // Cancel existing reminder if any
    if (scheduledReminders.has(orderId)) {
      clearTimeout(scheduledReminders.get(orderId)!);
    }

    // Calculate delay in milliseconds
    const delay = reminderTime.getTime() - Date.now();

    if (delay > 0) {
      // Schedule the reminder
      const timeoutId = setTimeout(async () => {
        await sendReminderNotification(orderId);
        scheduledReminders.delete(orderId);
      }, delay);

      scheduledReminders.set(orderId, timeoutId);
      console.log(
        `[Reminder] Scheduled for order ${orderId} at ${reminderTime.toISOString()}`
      );
    } else {
      console.log(`[Reminder] Time for order ${orderId} has already passed`);
    }
  } catch (error) {
    console.error(`[Reminder] Error scheduling for order ${orderId}:`, error);
  }
}

/**
 * Send reminder notification to customer
 */
async function sendReminderNotification(orderId: number) {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Get order details using Drizzle ORM
    const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    
    if (!result || result.length === 0) {
      console.error(`[Reminder] Order ${orderId} not found during notification`);
      return;
    }

    const order = result[0];

    // Send push notification to customer
    const { sendPushNotification } = await import('./push-notifications');
    const { sent, failed } = await sendPushNotification(
      order.customerId,
      '⏰ Lembrete de Pedido',
      'Seu pedido está chegando em breve! Fique atento! 🍗',
      '/icon-192x192.png',
      '/badge-72x72.png'
    );

    console.log(`[Reminder] Sent for order ${orderId}: ${sent} sent, ${failed} failed`);
  } catch (error) {
    console.error(`[Reminder] Error sending notification for order ${orderId}:`, error);
  }
}

/**
 * Cancel scheduled reminder
 */
export function cancelReminder(orderId: number) {
  if (scheduledReminders.has(orderId)) {
    clearTimeout(scheduledReminders.get(orderId)!);
    scheduledReminders.delete(orderId);
    console.log(`[Reminder] Cancelled for order ${orderId}`);
  }
}

/**
 * Initialize reminders for all pending orders on server startup
 */
export async function initializeReminders() {
  try {
    console.log('[Reminder] Initializing pending orders...');

    const db = await getDb();
    if (!db) {
        console.warn("[Reminder] Skipping initialization: database not available");
        return;
    }
    
    // Get all orders that are not yet delivered using Drizzle ORM
    const pendingOrders = await db.select().from(orders).where(ne(orders.status, 'entregue'));

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('[Reminder] No pending orders found');
      return;
    }

    // Schedule reminders for each order
    for (const order of pendingOrders) {
      await scheduleReminder(order.id);
    }

    console.log(`[Reminder] Initialized ${pendingOrders.length} orders`);
  } catch (error) {
    console.error('[Reminder] Error during initialization:', error);
  }
}
