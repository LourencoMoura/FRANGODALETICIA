import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function InstallPWA() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pwaEvent, setPwaEvent] = useState<any>(null);
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Verificar se ja foi recusado recentemente
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    if (Date.now() - dismissedAt < threeDays) return;

    // 2. Detectar se ja esta instalado (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 3. Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Capturar evento de instalacao (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setPwaEvent(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // 5. Se for iOS e nao for standalone, mostrar prompt customizado apos 3s
    if (ios && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (pwaEvent) {
      pwaEvent.prompt();
      const { outcome } = await pwaEvent.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setPwaEvent(null);
    }
  };

  const dismissPrompt = () => {
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
    setShowPrompt(false);

    // Oferecer notificações se o navegador suportar e ainda não estiver inscrito
    if (isSupported && !isSubscribed) {
      setTimeout(() => setShowPushPrompt(true), 1000);
    }
  };

  const handlePushSubscribe = async () => {
    // Usamos um ID genérico 0 para inscrições de visitantes/leads inicialmente
    // O sistema associa ao cliente real no login ou finalização de pedido
    await subscribe(0);
    setShowPushPrompt(false);
  };

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-orange-100 dark:border-zinc-800"
            >
              <button
                onClick={dismissPrompt}
                aria-label="Fechar"
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>

              <div className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-800">
                    <img
                      src="/icon-192x192.png"
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-lg shadow-md border-2 border-white dark:border-zinc-800">
                    <Download className="w-4 h-4" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Instale nosso App! 🍗
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 px-2 leading-relaxed">
                  Acesse o **Frango da Letícia** mais rápido e receba promoções
                  exclusivas direto na sua tela inicial.
                </p>

                {isIOS ? (
                  <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20 text-sm text-zinc-700 dark:text-zinc-300">
                    <p className="flex items-center justify-center gap-2">
                      1. Toque no ícone{" "}
                      <Share className="w-4 h-4 text-blue-500" /> "Compartilhar"
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      2. Escolha <PlusSquare className="w-4 h-4" /> "Tela de
                      Início"
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={handleInstall}
                      className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Instalar Agora
                    </Button>
                    <button
                      onClick={dismissPrompt}
                      className="text-zinc-400 text-sm hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-2"
                    >
                      Agora não, obrigado
                    </button>
                  </div>
                )}
              </div>

              {/* Decoracao inferior */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPushPrompt && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center shadow-2xl border border-orange-100 dark:border-zinc-800"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
                <Bell className="w-8 h-8 text-orange-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Ativar Notificações? 🔔
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                Receba um aviso sonoro assim que o seu frango sair para entrega
                ou ficar pronto para retirada!
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handlePushSubscribe}
                  className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all"
                >
                  Sim, quero receber avisos
                </Button>
                <button
                  onClick={() => setShowPushPrompt(false)}
                  className="text-zinc-400 text-sm hover:text-zinc-600 dark:hover:text-zinc-300 py-2"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
