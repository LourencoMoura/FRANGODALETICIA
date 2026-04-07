import { Home, History, ShoppingBag, User, LogOut } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onHomeClick?: () => void;
  onHistoryClick?: () => void;
  onLogoutClick?: () => void;
  activeTab?: "home" | "history";
}

export function BottomNav({ 
  onHomeClick, 
  onHistoryClick, 
  onLogoutClick,
  activeTab = "home" 
}: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-orange-100 dark:border-zinc-800 pb-safe sm:hidden">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => {
            haptics.light();
            onHomeClick?.();
          }}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
            activeTab === "home" ? "text-orange-600" : "text-zinc-400"
          )}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
        </button>

        <button
          onClick={() => {
            haptics.light();
            onHistoryClick?.();
          }}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
            activeTab === "history" ? "text-orange-600" : "text-zinc-400"
          )}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Pedidos</span>
        </button>

        <button
          onClick={() => {
            haptics.heavy();
            onLogoutClick?.();
          }}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
        </button>
      </div>
    </div>
  );
}
