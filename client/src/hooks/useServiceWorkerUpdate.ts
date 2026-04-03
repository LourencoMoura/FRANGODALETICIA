import { useEffect, useState } from "react";

/**
 * Hook to detect and handle Service Worker updates (new PWA versions)
 */
export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Detect when a new service worker is waiting to take control
    navigator.serviceWorker.ready.then(registration => {
      // Check for update every time the app comes back to focus
      window.addEventListener("focus", () => {
        registration.update();
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
              setNewVersionAvailable(true);
            }
          });
        }
      });
    });

    // Handle reload when the new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return { newVersionAvailable, updateApp };
}
