import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { savePushSubscription as saveSubscription, getAllPushSubscriptions } from './db';
import { sendPushNotification, sendPromotionNotification, sendBroadcastPushNotification } from './push-notifications';

export const pushRouter = router({
  // Salvar subscrição de um cliente
  subscribe: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        subscription: z.object({
          endpoint: z.string(),
          keys: z.object({
            auth: z.string(),
            p256dh: z.string(),
          }),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await saveSubscription(input.customerId, input.subscription);
        return { success: true, message: 'Subscrição salva com sucesso' };
      } catch (error) {
        console.error('Erro ao salvar subscrição push:', error);
        throw error;
      }
    }),

  // Remover subscrição
  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { deletePushSubscription } = await import('./db');
        await deletePushSubscription(input.endpoint);
        return { success: true, message: 'Subscrição removida do servidor' };
      } catch (error) {
        console.error('Erro ao remover subscrição push:', error);
        throw error;
      }
    }),

  // Enviar notificação de teste/personalizada (Admin)
  sendToUser: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        title: z.string(),
        body: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendPushNotification(input.customerId, input.title, input.body);
        return { success: true, ...result };
      } catch (error) {
        console.error('Erro ao enviar push pro usuário:', error);
        throw error;
      }
    }),

  // Enviar promoção (Broadcast)
  sendPromotion: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        discount: z.number(),
        discountType: z.enum(['percentual', 'fixo']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sendPromotionNotification(
          input.title,
          input.description,
          input.discount,
          input.discountType
        );
        return { success: true, ...result };
      } catch (error) {
        console.error('Erro ao enviar push de promoção:', error);
        throw error;
      }
    }),
});
