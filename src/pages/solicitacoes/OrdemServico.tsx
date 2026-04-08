import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, Wrench } from "lucide-react";

const MOCK = [
  { id: '1', numero: 'OS-2026-001', solicitante: 'Ana Lima', setor: 'Biblioteca', data: '2026-04-01', status: 'aberta', tipo: 'Elétrica', descricao: 'Troca de lâmpadas bloco B' },
  { id: '2', numero: 'OS-2026-002', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '2026-04-02', status: 'em_andamento', tipo: 'Hidráulica', descricao: 'Vazamento no banheiro' },
  { id: '3', numero: 'OS-2026-003', solicitante: 'Maria Souza', setor: 'Direção', data: '2026-04-04', status: 'concluida', tipo: 'Manutenção', descricao: 'Reparo ar-condicionado' },
];

const statusColors: Record<string, string> = {
  aberta: 'warning', em_andamento: 'default', concluida: 'success', cancelada: 'destructive',
};

const statusLabels: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};

export default function OrdemServico() {
  const [busca, setBusca] = useState('');
  const filtrados = MOCK.filter(s => s.numero.includes(busca) || s.descricao.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">Solicitar serviços de manutenção e reparos</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova OS</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar ordem de serviço..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {filtrados.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">{s.numero}</p>
                  <p className="text-sm text-muted-foreground">{s.descricao}</p>
                  <p className="text-xs text-muted-foreground">{s.solicitante} — {s.setor}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{s.tipo}</span>
                <Badge variant={statusColors[s.status] as any}>{statusLabels[s.status]}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
