import { publicProcedure, router, adminProcedure } from './_core/trpc.js';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { promotions } from '../drizzle/schema.js';
import { getDb } from './db.js';

export const promotionsRouter = router({
  // List all active promotions
  list: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(promotions).orderBy(desc(promotions.createdAt));
    } catch (error) {
      console.error('Error listing promotions:', error);
      throw error;
    }
  }),

  // Create a new promotion (admin only)
  create: adminProcedure
    .input(
      z.object({
        titulo: z.string(),
        descricao: z.string(),
        desconto: z.number(),
        tipo: z.enum(['percentual', 'fixo']),
        dataFim: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(promotions).values({
          titulo: input.titulo,
          descricao: input.descricao,
          desconto: input.desconto.toString(),
          tipo: input.tipo,
          ativo: 1,
          dataFim: input.dataFim ? new Date(input.dataFim) : null,
        }).returning({ id: promotions.id });

        // Trigger broadcast notification
        const { sendPromotionNotification } = await import('./push-notifications.js');
        await sendPromotionNotification(
          input.titulo,
          input.descricao,
          input.desconto,
          input.tipo
        );

        return { success: true, id: result?.id };
      } catch (error) {
        console.error('Error creating promotion:', error);
        throw error;
      }
    }),

  // Update a promotion (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string(),
        descricao: z.string(),
        desconto: z.number(),
        tipo: z.enum(['percentual', 'fixo']),
        dataFim: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(promotions)
          .set({
            titulo: input.titulo,
            descricao: input.descricao,
            desconto: input.desconto.toString(),
            tipo: input.tipo,
            dataFim: input.dataFim ? new Date(input.dataFim) : null,
            updatedAt: new Date(),
          })
          .where(eq(promotions.id, input.id));
        return { success: true };
      } catch (error) {
        console.error('Error updating promotion:', error);
        throw error;
      }
    }),

  // Delete a promotion (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(promotions).where(eq(promotions.id, input.id));
        return { success: true };
      } catch (error) {
        console.error('Error deleting promotion:', error);
        throw error;
      }
    }),

  // Toggle promotion status (admin only)
  toggleStatus: adminProcedure
    .input(z.object({ id: z.number(), ativo: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(promotions).set({ ativo: input.ativo }).where(eq(promotions.id, input.id));
        return { success: true };
      } catch (error) {
        console.error('Error toggling promotion status:', error);
        throw error;
      }
    }),
});
