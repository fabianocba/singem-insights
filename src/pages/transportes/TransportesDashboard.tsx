import { Card, CardContent } from "../../components/ui/card";
import { Truck, Fuel, Wrench, CalendarDays } from "lucide-react";

const kpis = [
  { label: 'Veículos Ativos', value: '14', icon: Truck, color: 'text-amber-600' },
  { label: 'Solicitações Abertas', value: '6', icon: CalendarDays, color: 'text-blue-600' },
  { label: 'Manutenções Pendentes', value: '3', icon: Wrench, color: 'text-red-600' },
  { label: 'Consumo Combustível', value: '2.450 L', icon: Fuel, color: 'text-emerald-600' },
];

export default function TransportesDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Transportes</h1>
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
