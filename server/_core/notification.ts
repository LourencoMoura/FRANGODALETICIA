/**
 * Notificações do Sistema
 * Camada de abstração sobre push-notifications.ts
 */
import * as PushService from "../push-notifications.js";

export const NotificationService = {
  /**
   * Envia uma notificação direta para um cliente
   */
  async sendToCustomer(customerId: number, title: string, body: string) {
    console.log(`[Notification] Enviando para cliente ${customerId}: ${title}`);
    return PushService.sendPushNotification(customerId, title, body);
  },

  /**
   * Envia uma notificação para todos os clientes ativos
   */
  async broadcast(title: string, body: string) {
    console.log(`[Notification] Broadcast: ${title}`);
    return PushService.sendBroadcastPushNotification(title, body);
  },

  /**
   * Notifica sobre mudança de status de pedido
   */
  async notifyOrderStatus(customerId: number, status: string, orderId: number) {
    console.log(`[Notification] Status Order ${orderId} -> ${status}`);
    return PushService.sendStatusUpdateNotification(customerId, status, orderId);
  },

  /**
   * Notifica o proprietário/admin (broadcast para todos no momento)
   */
  async notifyOwner(input: { title: string; content: string }) {
    console.log(`[Notification] Notificando proprietário: ${input.title}`);
    return PushService.sendBroadcastPushNotification(input.title, input.content);
  }
};

// Exportação individual para compatibilidade com systemRouter.ts
export const notifyOwner = NotificationService.notifyOwner;
