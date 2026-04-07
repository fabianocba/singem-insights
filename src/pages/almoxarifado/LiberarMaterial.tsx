import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_PENDENTES = [
  { id: '1', numero: 'SM-2026-001', solicitante: 'João Silva', setor: 'TI', data: '2026-04-01', qtdItens: 3, status: 'autorizada' },
  { id: '2', numero: 'SM-2026-002', solicitante: 'Maria Souza', setor: 'Lab. Química', data: '2026-04-03', qtdItens: 5, status: 'autorizada' },
];

export default function LiberarMaterial() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Liberar Material</h1>
      <p className="text-sm text-muted-foreground">SMs autorizadas aguardando liberação pelo almoxarifado</p>

      <div className="grid gap-4">
        {MOCK_PENDENTES.map(sm => (
          <Card key={sm.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold">{sm.numero}</p>
                  <p className="text-sm text-muted-foreground">{sm.solicitante} — {sm.setor}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success">{sm.qtdItens} itens</Badge>
                <Button size="sm" variant="default"><Check className="h-4 w-4 mr-1" /> Liberar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
