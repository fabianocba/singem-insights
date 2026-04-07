import { useNavigate } from "react-router-dom";
import { Package, Landmark, Truck, Wrench } from "lucide-react";

const modules = [
  { id: 'almoxarifado', label: 'Almoxarifado', desc: 'Material de Consumo (339030)', icon: Package, color: 'bg-emerald-600 hover:bg-emerald-700', path: '/almoxarifado' },
  { id: 'patrimonio', label: 'Patrimônio', desc: 'Equipamentos e Material Permanente (449052)', icon: Landmark, color: 'bg-blue-600 hover:bg-blue-700', path: '/patrimonio' },
  { id: 'transportes', label: 'Transportes', desc: 'Cadastro, Manutenção e Solicitações', icon: Truck, color: 'bg-amber-600 hover:bg-amber-700', path: '/transportes' },
  { id: 'servicos', label: 'Serviços Gerais', desc: 'Contratos e Ordens de Serviço', icon: Wrench, color: 'bg-purple-600 hover:bg-purple-700', path: '/servicos' },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4">
          SI
        </div>
        <h1 className="text-3xl font-bold text-foreground">SINGEM</h1>
        <p className="text-muted-foreground mt-1">Sistema Inteligente de Gestão de Materiais — IF Baiano</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl w-full">
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
