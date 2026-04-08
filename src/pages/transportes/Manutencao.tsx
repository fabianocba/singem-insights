import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Wrench } from "lucide-react";

export default function Manutencao() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manutenção — Transportes</h1>
      <p className="text-sm text-muted-foreground">Controle de manutenções preventivas e corretivas</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-primary" />
            Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
