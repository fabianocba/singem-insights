import { Card, CardContent } from "../../components/ui/card";
import { Wrench, FileText, Receipt, ClipboardCheck } from "lucide-react";

const kpis = [
  { label: 'Contratos Ativos', value: '9', icon: FileText, color: 'text-purple-600' },
  { label: 'NFs Pendentes', value: '4', icon: Receipt, color: 'text-amber-600' },
  { label: 'Ordens de Serviço', value: '15', icon: ClipboardCheck, color: 'text-blue-600' },
  { label: 'Em Fiscalização', value: '5', icon: Wrench, color: 'text-emerald-600' },
];

export default function ServicosDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Serviços Gerais</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
