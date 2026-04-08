import { Card, CardContent } from "../../components/ui/card";
import { FileText, Receipt, ClipboardCheck, Wrench, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const kpis = [
  { label: 'Ordens Abertas', value: '12', icon: ClipboardCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Em Andamento', value: '8', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Concluídas (mês)', value: '23', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Contratos Ativos', value: '6', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'NFs Pendentes', value: '3', icon: Receipt, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { label: 'Atrasadas', value: '2', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
];

const osPorTipo = [
  { tipo: 'Elétrica', quantidade: 15 },
  { tipo: 'Hidráulica', quantidade: 9 },
  { tipo: 'Manutenção', quantidade: 12 },
  { tipo: 'Limpeza', quantidade: 7 },
  { tipo: 'Jardinagem', quantidade: 5 },
  { tipo: 'Pintura', quantidade: 4 },
];

const osPorStatus = [
  { name: 'Abertas', value: 12, color: '#3b82f6' },
  { name: 'Em andamento', value: 8, color: '#f59e0b' },
  { name: 'Concluídas', value: 23, color: '#10b981' },
  { name: 'Canceladas', value: 2, color: '#ef4444' },
];

const osPorMes = [
  { mes: 'Jan', abertas: 10, concluidas: 8 },
  { mes: 'Fev', abertas: 14, concluidas: 12 },
  { mes: 'Mar', abertas: 11, concluidas: 15 },
  { mes: 'Abr', abertas: 12, concluidas: 23 },
];

const ultimasOS = [
  { numero: 'OS-2026-045', descricao: 'Reparo na fiação do bloco C', setor: 'Coordenação', tipo: 'Elétrica', status: 'aberta', data: '07/04/2026' },
  { numero: 'OS-2026-044', descricao: 'Desentupimento banheiro bloco A', setor: 'Administração', tipo: 'Hidráulica', status: 'em_andamento', data: '06/04/2026' },
  { numero: 'OS-2026-043', descricao: 'Pintura sala 12', setor: 'Ensino', tipo: 'Pintura', status: 'em_andamento', data: '05/04/2026' },
  { numero: 'OS-2026-042', descricao: 'Troca de fechadura laboratório', setor: 'Lab. Informática', tipo: 'Manutenção', status: 'concluida', data: '04/04/2026' },
  { numero: 'OS-2026-041', descricao: 'Poda de árvores área externa', setor: 'Direção', tipo: 'Jardinagem', status: 'concluida', data: '03/04/2026' },
];

const statusColors: Record<string, string> = {
  aberta: 'bg-blue-500/20 text-blue-400',
  em_andamento: 'bg-amber-500/20 text-amber-400',
  concluida: 'bg-emerald-500/20 text-emerald-400',
  cancelada: 'bg-red-500/20 text-red-400',
};
const statusLabels: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};

export default function ServicosDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Serviços Gerais</h1>
        <p className="text-sm text-muted-foreground">Visão geral das ordens de serviço e contratos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/50">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4" /> OS por Mês</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={osPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="abertas" name="Abertas" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-4">Status das OS</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={osPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }: { value: number }) => `${value}`}>
                  {osPorStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* OS por Tipo */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-base font-semibold mb-4">OS por Tipo de Serviço</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={osPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="tipo" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="quantidade" name="Quantidade" fill="#a855f7" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Últimas OS */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-base font-semibold mb-4">Últimas Ordens de Serviço</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Número</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Setor</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimasOS.map(os => (
                  <tr key={os.numero} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">{os.numero}</td>
                    <td className="py-2 px-3">{os.descricao}</td>
                    <td className="py-2 px-3 text-muted-foreground">{os.setor}</td>
                    <td className="py-2 px-3 text-muted-foreground">{os.tipo}</td>
                    <td className="py-2 px-3 text-muted-foreground">{os.data}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[os.status]}`}>{statusLabels[os.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
