import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, FileText } from "lucide-react";
import type { ModuloId } from "../../types";

const MOCK_EMPENHOS = [
  { id: '1', numero: '2026NE000045', fornecedor: 'Distribuidora Alpha', cnpj: '12.345.678/0001-90', valor: 15000, status: 'ativo' as const, objeto: 'Material de escritório' },
  { id: '2', numero: '2026NE000046', fornecedor: 'Tech Supplies LTDA', cnpj: '98.765.432/0001-10', valor: 28500, status: 'parcial' as const, objeto: 'Equipamentos de informática' },
  { id: '3', numero: '2026NE000047', fornecedor: 'Papelaria Central', cnpj: '11.222.333/0001-44', valor: 5200, status: 'liquidado' as const, objeto: 'Papéis e formulários' },
];

const statusColors: Record<string, string> = {
  ativo: 'success', parcial: 'warning', liquidado: 'secondary', cancelado: 'destructive',
};

const moduloLabels: Record<string, string> = {
  almoxarifado: 'Almoxarifado', patrimonio: 'Patrimônio', transportes: 'Transportes', servicos: 'Serviços Gerais',
};

export default function Empenhos({ modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');

  const empenhosFiltrados = MOCK_EMPENHOS.filter(e =>
    e.numero.toLowerCase().includes(busca.toLowerCase()) ||
    e.fornecedor.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empenhos</h1>
          <p className="text-sm text-muted-foreground">{moduloLabels[modulo]}</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Novo Empenho</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar empenho..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {empenhosFiltrados.map(emp => (
          <Card key={emp.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{emp.numero}</p>
                  <p className="text-sm text-muted-foreground">{emp.fornecedor} — {emp.cnpj}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">R$ {emp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <Badge variant={statusColors[emp.status] as any}>{emp.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
