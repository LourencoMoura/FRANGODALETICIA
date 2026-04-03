import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: (customerId: number) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const savePushSubscriptionMutation = trpc.push.subscribe.useMutation();

  // Check support
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  const urlBase64ToUint8Array = (
    base64String: string
  ): Uint8Array<ArrayBuffer> => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const subscribe = async (customerId: number) => {
    if (!isSupported) {
      setError("Notificações push não são suportadas neste navegador");
      return;
    }

    if (!vapidPublicKey) {
      setError("Chave VAPID não configurada");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      if (Notification.permission === "denied") {
        throw new Error(
          "Permissão para notificações foi negada. Por favor, habilite nas configurações do navegador."
        );
      }

      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Permissão para notificações foi negada");
        }
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server via tRPC
      await savePushSubscriptionMutation.mutateAsync({
        customerId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.getKey("auth")
              ? btoa(
                  String.fromCharCode.apply(
                    null,
                    Array.from(new Uint8Array(subscription.getKey("auth")!))
                  )
                )
              : "",
            p256dh: subscription.getKey("p256dh")
              ? btoa(
                  String.fromCharCode.apply(
                    null,
                    Array.from(new Uint8Array(subscription.getKey("p256dh")!))
                  )
                )
              : "",
          },
        },
      });

      setIsSubscribed(true);
      toast.success("Notificações habilitadas com sucesso! 🔔");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao habilitar notificações";
      setError(message);
      toast.error(message);
      console.error("Error subscribing to push:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  const unsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 1. Remove from server
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });

        // 2. Unsubscribe in browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success("Notificações desabilitadas com sucesso! 🔔❌");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao desabilitar notificações";
      setError(message);
      toast.error(message);
      console.error("Error unsubscribing from push:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
