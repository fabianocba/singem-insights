import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Shield } from "lucide-react";

export default function AdmPatrimonio() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ADM — Patrimônio</h1>
      <p className="text-sm text-muted-foreground">Ajustes administrativos do módulo de patrimônio</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Administração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
