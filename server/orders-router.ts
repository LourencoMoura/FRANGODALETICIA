import { publicProcedure, router } from './_core/trpc.js';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { customers, orders } from '../drizzle/schema.js';
import webpush from 'web-push';
import { scheduleReminder } from './reminder-scheduler.js';
import { createOrder as createOrderDb, getOrdersByCustomerId, getAllOrders, getOrderById, getDb } from './db.js';

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

// Status messages with emojis
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

export const ordersRouter = router({
  // Create order
  createOrder: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        tipo: z.enum(['entrega', 'retirada']),
        localidade: z.string().optional(),
        endereco: z.string().optional(),
        horarioRetirada: z.string().optional(),
        observacoes: z.string().optional(),
        items: z.array(z.any()),
        total: z.number(),
        paymentMethod: z.enum(['online', 'presencial']).default('presencial'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await createOrderDb({
          customerId: input.customerId,
          tipo: input.tipo,
          localidade: input.localidade || null,
          endereco: input.endereco || null,
          horarioRetirada: input.horarioRetirada || null,
          observacoes: input.observacoes || null,
          items: input.items,
          total: input.total,
          paymentMethod: input.paymentMethod,
        });

        // Add loyalty points (1 point per R$ 1,00)
        const pointsToAdd = Math.floor(input.total);
        await db.execute(sql`UPDATE customers SET points = points + ${pointsToAdd} WHERE id = ${input.customerId}`);

        // Schedule reminder for the order
        await scheduleReminder(result.insertId);

        return { success: true, orderId: result.insertId, pointsEarned: pointsToAdd };
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    }),

  // Get orders for a customer
  getOrdersByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      try {
        const orders = await getOrdersByCustomerId(input.customerId);
        return { success: true, orders };
      } catch (error) {
        console.error('Error getting orders:', error);
        throw error;
      }
    }),

  // Get all orders (admin)
  list: publicProcedure
    .query(async () => {
      try {
        const allOrders = await getAllOrders();
        return allOrders;
      } catch (error) {
        console.error('Error getting all orders:', error);
        throw error;
      }
    }),

  // Update order status
  updateStatus: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum([
          'pedido-recebido',
          'preparando',
          'pronto',
          'saiu-para-entrega',
          'entregue',
        ]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get order details
        const order = await getOrderById(input.orderId);
        if (!order) throw new Error('Order not found');

        // Update order status
        await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.orderId));

        // Send notification to customer via push subscriptions
        const { sendStatusUpdateNotification } = await import('./push-notifications.js');
        const { sent, failed } = await sendStatusUpdateNotification(
          order.customerId,
          input.status,
          input.orderId
        );
        
        return {
          success: true,
          message: `Status atualizado para ${input.status}`,
          notificationsSent: sent,
          notificationsFailed: failed,
        };
      } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
      }
    }),

  // Schedule reminder for an order
  scheduleReminder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await scheduleReminder(input.orderId);
        return { success: true, message: 'Reminder scheduled' };
      } catch (error) {
        console.error('Error scheduling reminder:', error);
        throw error;
      }
    }),

  // Send reminder notification (15-30 minutes before delivery/pickup)
  sendReminder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get order details
        const order = await getOrderById(input.orderId);
        if (!order) throw new Error('Order not found');

        // Send reminder notification
        const { sendPushNotification } = await import('./push-notifications.js');
        const { sent, failed } = await sendPushNotification(
          order.customerId,
          '⏰ Lembrete de Pedido',
          'Seu pedido está chegando em breve! Fique atento! 🍗'
        );
        
        return { success: true, sent, failed };
      } catch (error) {
        console.error('Error sending reminder:', error);
        throw error;
      }
    }),

  // Get order by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const order = await getOrderById(input.id);
        if (!order) throw new Error('Order not found');
        return order;
      } catch (error) {
        console.error('Error getting order by id:', error);
        throw error;
      }
    }),
});
