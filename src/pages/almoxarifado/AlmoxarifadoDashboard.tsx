import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Package, FileText, Receipt, ClipboardList } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const kpis = [
  { label: 'Itens em Estoque', value: '1.247', icon: Package, trend: '+12 este mês', color: 'text-emerald-600' },
  { label: 'Empenhos Ativos', value: '18', icon: FileText, trend: '3 parciais', color: 'text-blue-600' },
  { label: 'NFs Pendentes', value: '5', icon: Receipt, trend: '2 para vincular', color: 'text-amber-600' },
  { label: 'SMs Abertas', value: '8', icon: ClipboardList, trend: '3 aguardando', color: 'text-purple-600' },
];

const estoqueData = [
  { mes: 'Jan', entradas: 45, saidas: 32 },
  { mes: 'Fev', entradas: 52, saidas: 41 },
  { mes: 'Mar', entradas: 38, saidas: 35 },
  { mes: 'Abr', entradas: 61, saidas: 28 },
];

const subElementoData = [
  { name: 'Mat. Escritório', value: 35 },
  { name: 'Limpeza', value: 25 },
  { name: 'Informática', value: 20 },
  { name: 'Laboratório', value: 15 },
  { name: 'Outros', value: 5 },
];

const COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#94a3b8'];

export default function AlmoxarifadoDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Almoxarifado</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Movimentação Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={estoqueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="entradas" fill="#059669" radius={[4, 4, 0, 0]} name="Entradas" />
                <Bar dataKey="saidas" fill="#dc2626" radius={[4, 4, 0, 0]} name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Subelemento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={subElementoData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {subElementoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
