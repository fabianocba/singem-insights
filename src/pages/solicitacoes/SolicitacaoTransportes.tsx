import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, Truck } from "lucide-react";

const MOCK = [
  { id: '1', numero: 'ST-2026-001', solicitante: 'João Silva', setor: 'Coord. TI', data: '2026-04-01', status: 'enviada', destino: 'Itapetinga', veiculo: 'Hilux' },
  { id: '2', numero: 'ST-2026-002', solicitante: 'Maria Souza', setor: 'Direção Geral', data: '2026-04-03', status: 'autorizada', destino: 'Salvador', veiculo: 'Ônibus' },
  { id: '3', numero: 'ST-2026-003', solicitante: 'Carlos Oliveira', setor: 'CGAE', data: '2026-04-05', status: 'rascunho', destino: 'Vitória da Conquista', veiculo: '-' },
];

const statusColors: Record<string, string> = {
  rascunho: 'secondary', enviada: 'warning', autorizada: 'success', rejeitada: 'destructive',
};

export default function SolicitacaoTransportes() {
  const [busca, setBusca] = useState('');
  const filtrados = MOCK.filter(s => s.numero.includes(busca) || s.solicitante.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitação de Transportes</h1>
          <p className="text-sm text-muted-foreground">Solicitar veículos e motoristas</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova Solicitação</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar solicitação..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {filtrados.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">{s.numero}</p>
                  <p className="text-sm text-muted-foreground">{s.solicitante} — {s.destino}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{s.veiculo}</span>
                <Badge variant={statusColors[s.status] as any}>{s.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
