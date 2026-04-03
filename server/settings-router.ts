import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { settings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

export const settingsRouter = router({
  // Retorna configurações públicas (WhatsApp, Nome da Loja, etc)
  getPublicSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { whatsapp: "5584999589480", storeName: "Frango da Letícia" };

    const whatsapp = await db.query.settings.findFirst({
      where: eq(settings.key, "whatsapp_suporte"),
    });

    const storeName = await db.query.settings.findFirst({
      where: eq(settings.key, "nome_loja"),
    });

    return {
      whatsapp: whatsapp?.value || "5584999589480",
      storeName: storeName?.value || "Frango da Letícia",
    };
  }),

  // Retorna todas as configurações para o Admin
  getAdminSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const allSettings = await db.query.settings.findMany();
    return allSettings;
  }),

  // Atualiza ou insere uma configuração
  updateSetting: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      await db.insert(settings)
        .values({ key: input.key, value: input.value })
        .onConflictDoUpdate({ 
          target: settings.key, 
          set: { value: input.value } 
        });

      return { success: true };
    }),

  // Atualiza múltiplas configurações de uma vez
  updateBatch: publicProcedure
    .input(z.array(z.object({
      key: z.string(),
      value: z.string(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      for (const item of input) {
        await db.insert(settings)
          .values({ key: item.key, value: item.value })
          .onConflictDoUpdate({ 
            target: settings.key, 
            set: { value: item.value } 
          });
      }

      return { success: true };
    }),
});
