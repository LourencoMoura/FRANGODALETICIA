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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar nickname={nickname} points={points} onLogout={onLogout} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
