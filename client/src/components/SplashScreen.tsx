import { useEffect, useState } from "react";

/**
 * Splash Screen Component
 * Displays when PWA is loading or on first visit
 * Shows logo with branding text
 */
export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null; // Return null to properly unmount component

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#fcfcff" }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,0,0,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.1)_0%,transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-4">
        {/* Animated GIF Logo */}
        <div>
          <img
            src="/logo-animated.gif"
            alt="Frango da Letícia"
            className="w-80 h-80 md:w-96 md:h-96"
          />
        </div>

        {/* Branded Text with Emojis */}
        <div className="text-center mt-6">
          <div
            className="text-3xl md:text-4xl font-black mb-2"
            style={{
              fontFamily: '"Fredoka", "Rounded Mplus 1c", sans-serif',
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 4px 6px rgba(234, 88, 12, 0.3)",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
            }}
          >
            🍗 Frango da Letícia 📱
          </div>
          <div
            className="text-2xl md:text-3xl font-bold"
            style={{
              fontFamily: '"Fredoka", "Rounded Mplus 1c", sans-serif',
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 4px 8px rgba(234, 88, 12, 0.4)",
            }}
          >
            Pedidos online
          </div>
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex gap-2">
          <div
            className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
}
