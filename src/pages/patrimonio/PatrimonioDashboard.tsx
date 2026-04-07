import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, FileText, Receipt, ClipboardList } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { label: 'Bens Tombados', value: '342', icon: Landmark, color: 'text-blue-600' },
  { label: 'Empenhos Ativos', value: '12', icon: FileText, color: 'text-emerald-600' },
  { label: 'NFs Pendentes', value: '3', icon: Receipt, color: 'text-amber-600' },
  { label: 'Transferências', value: '7', icon: ClipboardList, color: 'text-purple-600' },
];

const data = [
  { mes: 'Jan', tombados: 12 }, { mes: 'Fev', tombados: 8 }, { mes: 'Mar', tombados: 15 }, { mes: 'Abr', tombados: 22 },
];

export default function PatrimonioDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Patrimônio</h1>
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
      <Card>
        <CardHeader><CardTitle className="text-base">Bens Tombados por Mês</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" /><YAxis />
              <Tooltip />
              <Bar dataKey="tombados" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
