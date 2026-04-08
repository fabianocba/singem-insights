import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ClipboardList, Package, Landmark, Truck, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const kpis = [
  { label: 'SM Almoxarifado', value: '12', icon: Package, trend: '4 pendentes', color: 'text-emerald-600' },
  { label: 'SM Patrimônio', value: '5', icon: Landmark, trend: '2 pendentes', color: 'text-blue-600' },
  { label: 'Sol. Transportes', value: '8', icon: Truck, trend: '3 em análise', color: 'text-amber-600' },
  { label: 'Ordens de Serviço', value: '6', icon: Wrench, trend: '1 urgente', color: 'text-purple-600' },
];

const data = [
  { mes: 'Jan', almox: 8, patrim: 3, transp: 5, os: 4 },
  { mes: 'Fev', almox: 12, patrim: 5, transp: 7, os: 3 },
  { mes: 'Mar', almox: 10, patrim: 4, transp: 6, os: 5 },
  { mes: 'Abr', almox: 15, patrim: 6, transp: 9, os: 7 },
];

export default function SolicitacoesDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Solicitações</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Solicitações por Mês</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="almox" fill="#059669" radius={[4, 4, 0, 0]} name="Almoxarifado" />
              <Bar dataKey="patrim" fill="#2563eb" radius={[4, 4, 0, 0]} name="Patrimônio" />
              <Bar dataKey="transp" fill="#d97706" radius={[4, 4, 0, 0]} name="Transportes" />
              <Bar dataKey="os" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Ordem de Serviço" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
