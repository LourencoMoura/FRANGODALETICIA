import { publicProcedure, router, protectedProcedure, adminProcedure } from './_core/trpc.js';
import { z } from 'zod';
import { savePushSubscription as saveSubscription, getAllPushSubscriptions } from './db.js';
import { sendPushNotification, sendPromotionNotification, sendBroadcastPushNotification } from './push-notifications.js';

export const pushRouter = router({
  // Salvar subscrição de um cliente (vínculo automático com a sessão)
  subscribe: protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user || ctx.user.role !== 'user') {
          throw new Error("Apenas clientes podem se inscrever para notificações");
        }
        const customerId = parseInt(ctx.user.openId.split(':')[1]);
        if (isNaN(customerId)) throw new Error("Sessão inválida");

        await saveSubscription(customerId, input.subscription);
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
        const { deletePushSubscription } = await import('./db.js');
        await deletePushSubscription(input.endpoint);
        return { success: true, message: 'Subscrição removida do servidor' };
      } catch (error) {
        console.error('Erro ao remover subscrição push:', error);
        throw error;
      }
    }),

  // Enviar notificação de teste/personalizada (Admin only)
  sendToUser: adminProcedure
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

  // Enviar promoção (Broadcast) (Admin only)
  sendPromotion: adminProcedure
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
