import { useNavigate } from "react-router-dom";
import { Package, Landmark, Truck, Wrench, Send, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const allModules = [
  { id: 'almoxarifado', label: 'Almoxarifado', desc: 'Material de Consumo (339030)', icon: Package, color: 'bg-emerald-600 hover:bg-emerald-700', path: '/almoxarifado', tipo: 'gestor' },
  { id: 'patrimonio', label: 'Patrimônio', desc: 'Equipamentos e Material Permanente (449052)', icon: Landmark, color: 'bg-blue-600 hover:bg-blue-700', path: '/patrimonio', tipo: 'gestor' },
  { id: 'transportes', label: 'Transportes', desc: 'Cadastro, Manutenção e Gestão', icon: Truck, color: 'bg-amber-600 hover:bg-amber-700', path: '/transportes', tipo: 'gestor' },
  { id: 'servicos', label: 'Serviços Gerais', desc: 'Contratos e Ordens de Serviço', icon: Wrench, color: 'bg-purple-600 hover:bg-purple-700', path: '/servicos', tipo: 'gestor' },
  { id: 'solicitacoes', label: 'Solicitações', desc: 'SM, SB, Transportes e Ordens de Serviço', icon: Send, color: 'bg-cyan-600 hover:bg-cyan-700', path: '/solicitacoes', tipo: 'solicitante' },
];

export default function Index() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const modules = allModules.filter(mod => {
    if (!usuario) return false;
    if (usuario.perfil === "admin") return true;
    if (usuario.perfil === "solicitante") return mod.tipo === "solicitante";
    // gestor: vê seus módulos + solicitações
    if (usuario.perfil === "gestor") {
      if (mod.tipo === "solicitante") return true; // solicitações sempre visível
      return usuario.modulos?.includes(mod.id) ?? false;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4">
          SG
        </div>
        <h1 className="text-3xl font-bold text-foreground">SINGEM</h1>
        <p className="text-muted-foreground mt-1">Sistema Inteligente de Gestão de Materiais e Logística</p>
        {usuario && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{usuario.nome}</span>
              <span className="text-xs ml-1 opacity-60">({usuario.perfil})</span>
            </p>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <LogOut className="h-3 w-3" />Sair
            </button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${modules.length >= 4 ? 'lg:grid-cols-' + Math.min(modules.length, 5) : ''} gap-6 max-w-6xl w-full`}>
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => navigate(mod.path)}
            className={`${mod.color} text-white rounded-xl p-6 text-left transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
          >
            <mod.icon className="h-10 w-10 mb-4 opacity-90" />
            <h2 className="text-lg font-bold mb-1">{mod.label}</h2>
            <p className="text-xs opacity-80 leading-snug">{mod.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
