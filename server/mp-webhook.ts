import { Router } from "express";
import { getDb } from "./db.js";
import { orders, settings } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from 'mercadopago';

export function registerWebhookRoutes(app: Router) {
  app.post("/webhooks/mercado-pago", async (req, res) => {
    const body = req.body;
    const action = body.action || req.query.action;
    const data = body.data || req.query;

    console.log("[Mercado Pago Webhook] Recebido:", { action, data: body.data });

    // Mercado Pago sends 'payment' type in 'topic' or 'action'
    if (action === "payment.created" || action === "payment.updated" || body.type === "payment" || req.query.topic === "payment") {
      const paymentId = data?.id || body.resource?.split('/').pop();
      
      if (!paymentId) {
        console.warn("[Mercado Pago Webhook] ID de pagamento não encontrado no corpo");
        return res.sendStatus(200);
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not connected");

        // Priorizar Access Token do Ambiente (Vercel/Configuração Segura)
        let accessToken = process.env.MP_ACCESS_TOKEN;

        // Se não houver no ambiente, buscar nas configurações do banco
        if (!accessToken) {
          const tokenRecord = await db.query.settings.findFirst({
            where: eq(settings.key, "mp_access_token"),
          });
          accessToken = tokenRecord?.value;
        }

        if (!accessToken) {
          console.error("[Mercado Pago Webhook] Access Token não configurado no banco nem no ambiente.");
          return res.sendStatus(200);
        }

        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const payment = new Payment(client);
        
        // Buscar detalhes do pagamento no Mercado Pago
        const paymentData = await payment.get({ id: String(paymentId) });
        const orderId = paymentData.external_reference;
        const status = paymentData.status;

        console.log(`[Mercado Pago Webhook] Pedido #${orderId} - Status: ${status}`);

        if (orderId) {
          await db.update(orders)
            .set({ 
              paymentStatus: status || "pending",
              mpPaymentId: String(paymentId),
              // Se aprovado, podemos avançar o status do pedido automaticamente
              ...(status === "approved" ? { status: "preparando" } : {})
            })
            .where(eq(orders.id, Number(orderId)));
            
          console.log(`[Mercado Pago Webhook] Status do Pedido #${orderId} atualizado para ${status}`);
        }
      } catch (error) {
        console.error("[Mercado Pago Webhook] Erro ao processar:", error);
      }
    }

    // Sempre retornar 200 para o Mercado Pago não tentar reenviar
    res.sendStatus(200);
  });
}
