import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Receipt } from "lucide-react";
import type { ModuloId } from "@/types";

const MOCK_NFS = [
  { id: '1', numero: '001234', fornecedor: 'Distribuidora Alpha', empenho: '2026NE000045', valor: 7500, status: 'vinculada' as const },
  { id: '2', numero: '005678', fornecedor: 'Tech Supplies LTDA', empenho: '2026NE000046', valor: 14000, status: 'pendente' as const },
];

const statusColors: Record<string, string> = {
  pendente: 'warning', vinculada: 'success', aceita: 'default', rejeitada: 'destructive',
};

const moduloLabels: Record<string, string> = {
  almoxarifado: 'Almoxarifado', patrimonio: 'Patrimônio', servicos: 'Serviços Gerais',
};

export default function NotasFiscais({ modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');

  const nfsFiltradas = MOCK_NFS.filter(nf =>
    nf.numero.includes(busca) || nf.fornecedor.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">{moduloLabels[modulo]}</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Registrar NF</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar nota fiscal..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {nfsFiltradas.map(nf => (
          <Card key={nf.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold">NF {nf.numero}</p>
                  <p className="text-sm text-muted-foreground">{nf.fornecedor} — Emp: {nf.empenho}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">R$ {nf.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <Badge variant={statusColors[nf.status] as any}>{nf.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
