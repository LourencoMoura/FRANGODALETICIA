import { Gift, LogOut } from "lucide-react";

interface NavbarProps {
  nickname: string;
  points: number;
  onLogout: () => void;
}

export function Navbar({ nickname, points, onLogout }: NavbarProps) {
  return (
    <nav className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-6 shadow-lg">
      <div className="container px-4 flex items-center justify-between mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 rounded-full bg-white p-1"
          />
          <h1 className="text-xl font-bold tracking-tight">
            Frango da Letícia
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Loyalty Points Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
            <Gift className="w-4 h-4 text-amber-200" />
            <span className="text-sm font-bold">{points} pts</span>
          </div>

          <div className="text-right leading-tight">
            <p className="font-bold text-sm">{nickname}</p>
            <div className="flex items-center justify-end gap-1 sm:hidden">
              <Gift className="w-3 h-3 text-amber-200" />
              <span className="text-[10px] font-bold">{points} pts</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
