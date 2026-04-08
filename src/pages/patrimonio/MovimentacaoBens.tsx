import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ClipboardList } from "lucide-react";

export default function MovimentacaoBens() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Movimentação de Bens</h1>
      <p className="text-sm text-muted-foreground">Transferências e movimentações patrimoniais</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Movimentação de Bens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
