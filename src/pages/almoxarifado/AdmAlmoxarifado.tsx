import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { RotateCcw, TrendingDown } from "lucide-react";

export default function AdmAlmoxarifado() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ADM — Almoxarifado</h1>
      <p className="text-sm text-muted-foreground">Ajustes administrativos: extornos, baixas e correções de estoque</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-5 w-5 text-warning" />
              Extorno de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Reverter saída de material indevidamente registrada</p>
            <Button variant="outline" size="sm">Realizar Extorno</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Baixa de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Baixar material por perda, vencimento ou avaria</p>
            <Button variant="outline" size="sm">Registrar Baixa</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
