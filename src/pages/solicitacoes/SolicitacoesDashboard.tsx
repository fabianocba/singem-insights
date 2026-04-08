import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Package, Landmark, Truck, Wrench, Clock, CheckCircle, XCircle, Send, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";

const kpis = [
  { label: 'SM Almoxarifado', value: '12', pendentes: 4, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/solicitacoes/almoxarifado' },
  { label: 'SB Patrimônio', value: '5', pendentes: 2, icon: Landmark, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/solicitacoes/patrimonio' },
  { label: 'Sol. Veículo', value: '8', pendentes: 3, icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/solicitacoes/transportes' },
  { label: 'Sol. Serviço', value: '6', pendentes: 1, icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10', path: '/solicitacoes/ordem-servico' },
];

const resumo = [
  { label: 'Total Enviadas', value: 31, icon: Send, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { label: 'Aguardando Aprovação', value: 10, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Aprovadas', value: 16, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Rejeitadas', value: 3, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { label: 'Em Atendimento', value: 5, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Atrasadas', value: 2, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

const porMes = [
  { mes: 'Jan', almox: 8, patrim: 3, transp: 5, servico: 4 },
  { mes: 'Fev', almox: 12, patrim: 5, transp: 7, servico: 3 },
  { mes: 'Mar', almox: 10, patrim: 4, transp: 6, servico: 5 },
  { mes: 'Abr', almox: 15, patrim: 6, transp: 9, servico: 7 },
];

const porStatus = [
  { name: 'Rascunho', value: 5, color: '#64748b' },
  { name: 'Enviada', value: 10, color: '#3b82f6' },
  { name: 'Aprovada', value: 16, color: '#10b981' },
  { name: 'Rejeitada', value: 3, color: '#ef4444' },
  { name: 'Atendida', value: 8, color: '#8b5cf6' },
];

const ultimasSolicitacoes = [
  { numero: 'SM-2026-015', tipo: 'SM Almoxarifado', solicitante: 'Ana Lima', setor: 'Biblioteca', data: '07/04/2026', status: 'enviada' },
  { numero: 'SB-2026-008', tipo: 'SB Patrimônio', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '06/04/2026', status: 'aprovada' },
  { numero: 'SV-2026-012', tipo: 'Sol. Veículo', solicitante: 'Maria Souza', setor: 'Direção', data: '06/04/2026', status: 'enviada' },
  { numero: 'SS-2026-009', tipo: 'Sol. Serviço', solicitante: 'João Costa', setor: 'Coordenação', data: '05/04/2026', status: 'aprovada' },
  { numero: 'SM-2026-014', tipo: 'SM Almoxarifado', solicitante: 'Lucia Mendes', setor: 'Refeitório', data: '05/04/2026', status: 'atendida' },
  { numero: 'SV-2026-011', tipo: 'Sol. Veículo', solicitante: 'Roberto Alves', setor: 'CGAE', data: '04/04/2026', status: 'rejeitada' },
];

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-500/20 text-slate-400',
  enviada: 'bg-blue-500/20 text-blue-400',
  aprovada: 'bg-emerald-500/20 text-emerald-400',
  rejeitada: 'bg-red-500/20 text-red-400',
  atendida: 'bg-purple-500/20 text-purple-400',
  parcial: 'bg-amber-500/20 text-amber-400',
};

export default function SolicitacoesDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <p className="text-sm text-muted-foreground">Painel do solicitante — acompanhe todas as suas solicitações</p>
      </div>

      {/* Atalhos para criar solicitações */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => navigate(k.path)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{k.pendentes} pendentes</span>
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {resumo.map(r => (
          <Card key={r.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className={`h-8 w-8 rounded-lg ${r.bg} flex items-center justify-center mx-auto mb-2`}>
                <r.icon className={`h-4 w-4 ${r.color}`} />
              </div>
              <p className="text-xl font-bold">{r.value}</p>
              <p className="text-xs text-muted-foreground">{r.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/50">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4" /> Solicitações por Mês</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="almox" name="Almoxarifado" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="patrim" name="Patrimônio" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="transp" name="Veículo" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="servico" name="Serviço" fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-4">Por Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }: { value: number }) => `${value}`}>
                  {porStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Últimas solicitações */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-base font-semibold mb-4">Últimas Solicitações</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Número</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Solicitante</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Setor</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimasSolicitacoes.map(s => (
                  <tr key={s.numero} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer">
                    <td className="py-2 px-3 font-mono text-xs">{s.numero}</td>
                    <td className="py-2 px-3">{s.tipo}</td>
                    <td className="py-2 px-3">{s.solicitante}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.setor}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.data}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status]}`}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação rápida */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/solicitacoes/almoxarifado')}>
          <Package className="h-6 w-6 text-emerald-400" />
          <span className="text-sm">Nova SM Almoxarifado</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/solicitacoes/patrimonio')}>
          <Landmark className="h-6 w-6 text-blue-400" />
          <span className="text-sm">Nova SB Patrimônio</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/solicitacoes/transportes')}>
          <Truck className="h-6 w-6 text-amber-400" />
          <span className="text-sm">Nova Sol. Veículo</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/solicitacoes/ordem-servico')}>
          <Wrench className="h-6 w-6 text-purple-400" />
          <span className="text-sm">Nova Sol. Serviço</span>
        </Button>
      </div>
    </div>
  );
}
