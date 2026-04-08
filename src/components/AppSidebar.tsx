import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import type { ModuloId } from "../types";
import {
  Package, Landmark, Truck, Wrench, Settings,
  ChevronDown, ChevronRight, FileText, Receipt,
  ClipboardList, BookOpen, PackageOpen,
  Shield, Send, Inbox, LogOut
} from "lucide-react";

interface AppSidebarProps {
  moduloAtivo?: ModuloId;
}

interface SubItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface ModuleConfig {
  id: ModuloId;
  label: string;
  icon: React.ElementType;
  color: string;
  dashboardPath: string;
  items: SubItem[];
}

const modules: ModuleConfig[] = [
  {
    id: 'almoxarifado',
    label: 'Almoxarifado',
    icon: Package,
    color: 'text-emerald-400',
    dashboardPath: '/almoxarifado',
    items: [
      { label: 'Empenhos', path: '/almoxarifado/empenhos', icon: FileText },
      { label: 'Notas Fiscais', path: '/almoxarifado/notas-fiscais', icon: Receipt },
      { label: 'Estoque', path: '/almoxarifado/estoque', icon: PackageOpen },
      { label: 'Catálogo', path: '/almoxarifado/catalogo', icon: BookOpen },
      { label: 'Liberar Material', path: '/almoxarifado/liberar-material', icon: ClipboardList },
      { label: 'Solicitações Recebidas', path: '/almoxarifado/solicitacoes', icon: Inbox },
      { label: 'ADM', path: '/almoxarifado/adm', icon: Shield },
    ],
  },
  {
    id: 'patrimonio',
    label: 'Patrimônio',
    icon: Landmark,
    color: 'text-blue-400',
    dashboardPath: '/patrimonio',
    items: [
      { label: 'Empenhos', path: '/patrimonio/empenhos', icon: FileText },
      { label: 'Notas Fiscais', path: '/patrimonio/notas-fiscais', icon: Receipt },
      { label: 'Itens Patrimoniais', path: '/patrimonio/itens', icon: PackageOpen },
      { label: 'Movimentação de Bens', path: '/patrimonio/movimentacao', icon: ClipboardList },
      { label: 'Solicitações Recebidas', path: '/patrimonio/solicitacoes', icon: Inbox },
      { label: 'ADM', path: '/patrimonio/adm', icon: Shield },
    ],
  },
  {
    id: 'transportes',
    label: 'Transportes',
    icon: Truck,
    color: 'text-amber-400',
    dashboardPath: '/transportes',
    items: [
      { label: 'Cadastros', path: '/transportes/cadastros', icon: BookOpen },
      { label: 'Manutenção', path: '/transportes/manutencao', icon: Wrench },
      { label: 'Agendamentos', path: '/transportes/agendamentos', icon: ClipboardList },
      { label: 'Solicitações Recebidas', path: '/transportes/solicitacoes', icon: Inbox },
      { label: 'ADM', path: '/transportes/adm', icon: Shield },
    ],
  },
  {
    id: 'servicos',
    label: 'Serviços Gerais',
    icon: Wrench,
    color: 'text-purple-400',
    dashboardPath: '/servicos',
    items: [
      { label: 'Contratos', path: '/servicos/contratos', icon: FileText },
      { label: 'Notas Fiscais', path: '/servicos/notas-fiscais', icon: Receipt },
      { label: 'Ordens de Serviço', path: '/servicos/ordens', icon: ClipboardList },
      { label: 'Solicitações Recebidas', path: '/servicos/solicitacoes', icon: Inbox },
      { label: 'ADM', path: '/servicos/adm', icon: Shield },
    ],
  },
  {
    id: 'solicitacoes',
    label: 'Solicitações',
    icon: Send,
    color: 'text-cyan-400',
    dashboardPath: '/solicitacoes',
    items: [
      { label: 'SM Almoxarifado', path: '/solicitacoes/almoxarifado', icon: Package },
      { label: 'SB Patrimônio', path: '/solicitacoes/patrimonio', icon: Landmark },
      { label: 'Solicitação de Veículo', path: '/solicitacoes/transportes', icon: Truck },
      { label: 'Solicitação de Serviço', path: '/solicitacoes/ordem-servico', icon: Wrench },
    ],
  },
];

export default function AppSidebar({ moduloAtivo }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const [expandedModule, setExpandedModule] = useState<string | null>(moduloAtivo || null);

  const handleModuleClick = (mod: ModuleConfig) => {
    setExpandedModule(prev => prev === mod.id ? null : mod.id);
    navigate(mod.dashboardPath);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-sidebar-border" style={{ backgroundColor: 'hsl(165 30% 12%)', color: 'hsl(160 10% 85%)' }}>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border cursor-pointer hover:opacity-80"
        onClick={() => navigate('/')}
      >
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          SI
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">SINGEM</h1>
          <p className="text-[10px] opacity-60 leading-none">Gestão de Materiais</p>
        </div>
      </div>

      {/* Módulos */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {modules.filter(mod => {
          if (!usuario) return false;
          if (usuario.perfil === "admin") return true;
          if (usuario.perfil === "solicitante") return mod.id === "solicitacoes";
          // gestor
          return mod.id === "solicitacoes" || (usuario.modulos?.includes(mod.id) ?? false);
        }).map((mod) => (
          <div key={mod.id}>
            <button
              onClick={() => handleModuleClick(mod)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                moduloAtivo === mod.id
                  ? "bg-white/10 text-white"
                  : "hover:bg-white/5 text-white/70"
              )}
            >
              <mod.icon className={cn("h-4 w-4", mod.color)} />
              <span className="flex-1 text-left">{mod.label}</span>
              {mod.items.length > 0 && (
                expandedModule === mod.id
                  ? <ChevronDown className="h-3.5 w-3.5 text-white/50" />
                  : <ChevronRight className="h-3.5 w-3.5 text-white/50" />
              )}
            </button>

            {expandedModule === mod.id && mod.items.length > 0 && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/15 pl-3">
                {mod.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors",
                      isActive(item.path)
                        ? "bg-emerald-500/20 text-emerald-300 font-medium"
                        : "text-white/55 hover:text-white/90 hover:bg-white/5"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-2 space-y-1">
        {usuario && (
          <div className="flex items-center gap-2 px-3 py-2 text-white/60">
            <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/80">
              {usuario.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 font-medium truncate">{usuario.nome}</p>
              <p className="text-[10px] text-white/40 truncate">{usuario.perfil}</p>
            </div>
          </div>
        )}
        {usuario?.perfil !== "solicitante" && (
          <button
            onClick={() => navigate('/configuracoes')}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive('/configuracoes')
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </button>
        )}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-red-300/60 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
