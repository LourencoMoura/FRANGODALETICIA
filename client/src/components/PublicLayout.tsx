import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface PublicLayoutProps {
  children: ReactNode;
  nickname: string;
  points: number;
  onLogout: () => void;
}

export function PublicLayout({
  children,
  nickname,
  points,
  onLogout,
}: PublicLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Navbar nickname={nickname} points={points} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 -webkit-overflow-scrolling-touch no-scrollbar">
        {children}
      </main>
      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
  );
}
