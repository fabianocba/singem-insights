import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationCenter from "./NotificationCenter";
import type { ModuloId } from "../types";

interface AppLayoutProps {
  children: ReactNode;
  modulo?: ModuloId;
}

export default function AppLayout({ children, modulo }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar moduloAtivo={modulo} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-end px-6 py-3 border-b border-border/50 bg-background shrink-0">
          <NotificationCenter />
        </header>
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
