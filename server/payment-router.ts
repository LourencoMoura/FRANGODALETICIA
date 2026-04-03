import { router, publicProcedure } from "./_core/trpc.js";
import { z } from "zod";
import { settings, orders } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getDb } from "./db.js";

// Helper to get MP Client
async function getMPClient() {
  const db = await getDb();
  if (!db) return null;

  const tokenRecord = await db.query.settings.findFirst({
    where: eq(settings.key, "mp_access_token"),
  });
  
  if (!tokenRecord?.value) return null;
  
  return new MercadoPagoConfig({ 
    accessToken: tokenRecord.value,
    options: { timeout: 5000 }
  });
}

export const paymentRouter = router({
  // Get public settings (only public key)
  getPublicSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { publicKey: null };
    const publicKey = await db.query.settings.findFirst({
      where: eq(settings.key, "mp_public_key"),
    });
    return {
      publicKey: publicKey?.value || null,
    };
  }),

  // Get all settings (for admin)
  getAdminSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { publicKey: "", accessToken: "" };
    const publicKey = await db.query.settings.findFirst({
      where: eq(settings.key, "mp_public_key"),
    });
    const accessToken = await db.query.settings.findFirst({
      where: eq(settings.key, "mp_access_token"),
    });
    return {
      publicKey: publicKey?.value || "",
      accessToken: accessToken?.value || "",
    };
  }),

  // Save settings
  saveSettings: publicProcedure
    .input(z.object({
      publicKey: z.string(),
      accessToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      // Save Public Key
      await db.insert(settings)
        .values({ key: "mp_public_key", value: input.publicKey })
        .onConflictDoUpdate({ target: settings.key, set: { value: input.publicKey } });

      // Save Access Token
      await db.insert(settings)
        .values({ key: "mp_access_token", value: input.accessToken })
        .onConflictDoUpdate({ target: settings.key, set: { value: input.accessToken } });

      return { success: true };
    }),

  // Create Checkout Preference
  createPreference: publicProcedure
    .input(z.object({
      orderId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!order) throw new Error("Pedido não encontrado");

      const client = await getMPClient();
      if (!client) throw new Error("Mercado Pago não configurado. Por favor, contate o administrador.");

      const preference = new Preference(client);

      const items = (order.items as any[]).map(item => ({
        id: String(item.id),
        title: item.name,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: 'BRL'
      }));

      // Add delivery fee if applicable (simulated as an item)
      // In this system, 'total' already includes everything. 
      // To keep it simple and accurate, we can send a single item "Pedido #ID" if items are complex
      
      const response = await preference.create({
        body: {
          items: [
            {
              id: String(order.id),
              title: `Pedido Frango da Letícia #${order.id}`,
              unit_price: Number(order.total),
              quantity: 1,
              currency_id: 'BRL'
            }
          ],
          external_reference: String(order.id),
          back_urls: {
            success: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/?payment_status=approved&orderId=${order.id}`,
            failure: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/?payment_status=failed&orderId=${order.id}`,
            pending: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/?payment_status=pending&orderId=${order.id}`,
          },
          auto_return: 'all',
          notification_url: `${process.env.SERVER_URL || 'https://seu-dominio.com'}/api/webhooks/mercado-pago`,
        }
      });

      // Update order with preference ID
      await db.update(orders)
        .set({ mpPreferenceId: response.id })
        .where(eq(orders.id, order.id));

      return {
        id: response.id,
        init_point: response.init_point,
      };
    }),
});
