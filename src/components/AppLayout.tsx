import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import type { ModuloId } from "../../types";

interface AppLayoutProps {
  children: ReactNode;
  modulo?: ModuloId;
}

export default function AppLayout({ children, modulo }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar moduloAtivo={modulo} />
      <main className="flex-1 overflow-auto bg-background p-6">
        {children}
      </main>
    </div>
  );
}
