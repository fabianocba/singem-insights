import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Search, ClipboardList } from "lucide-react";
import type { ModuloId } from "../types";

const MOCK_SMS = [
  { id: '1', numero: 'SM-2026-001', solicitante: 'João Silva', setor: 'Coordenação de TI', data: '2026-04-01', status: 'enviada' as const, qtdItens: 3 },
  { id: '2', numero: 'SM-2026-002', solicitante: 'Maria Souza', setor: 'Laboratório de Química', data: '2026-04-03', status: 'autorizada' as const, qtdItens: 5 },
  { id: '3', numero: 'SM-2026-003', solicitante: 'Carlos Oliveira', setor: 'Biblioteca', data: '2026-04-05', status: 'rascunho' as const, qtdItens: 2 },
];

const statusColors: Record<string, string> = {
  rascunho: 'secondary', enviada: 'warning', autorizada: 'success', rejeitada: 'destructive', atendida: 'default', parcial: 'warning',
};

export default function SolicitacaoMaterial({ modulo: _modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');
  // Simulando perfil: gestor vê todas, usuário só as suas
  const perfilSimulado = 'gestor';

  const smsFiltradas = MOCK_SMS.filter(sm =>
    sm.numero.includes(busca) || sm.solicitante.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitação de Material</h1>
          <p className="text-sm text-muted-foreground">
            {perfilSimulado === 'gestor' ? 'Todas as solicitações' : 'Minhas solicitações'}
          </p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova SM</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar solicitação..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {smsFiltradas.map(sm => (
          <Card key={sm.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{sm.numero}</p>
                  <p className="text-sm text-muted-foreground">{sm.solicitante} — {sm.setor}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{sm.qtdItens} itens</span>
                <Badge variant={statusColors[sm.status] as any}>{sm.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
