import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Search, BookOpen, QrCode } from "lucide-react";
import { useState } from "react";

const MOCK_CATALOGO = [
  { id: '1', codigo: '339030-07-001', descricao: 'Papel A4 500fls', unidade: 'Resma', subElemento: '07', saldo: 120 },
  { id: '2', codigo: '339030-07-002', descricao: 'Caneta esferográfica azul', unidade: 'Un', subElemento: '07', saldo: 550 },
  { id: '3', codigo: '339030-22-001', descricao: 'Detergente neutro 500ml', unidade: 'Un', subElemento: '22', saldo: 120 },
  { id: '4', codigo: '339030-17-001', descricao: 'Toner HP 85A', unidade: 'Un', subElemento: '17', saldo: 22 },
];

export default function Catalogo() {
  const [busca, setBusca] = useState('');

  const filtrados = MOCK_CATALOGO.filter(i =>
    i.descricao.toLowerCase().includes(busca.toLowerCase()) || i.codigo.includes(busca)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Catálogo de Materiais</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar material..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3">
        {filtrados.map(item => (
          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.codigo} — {item.unidade}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Saldo: {item.saldo}</Badge>
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
