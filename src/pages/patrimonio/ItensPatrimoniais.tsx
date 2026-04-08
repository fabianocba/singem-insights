import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { PackageOpen } from "lucide-react";

export default function ItensPatrimoniais() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Itens Patrimoniais</h1>
      <p className="text-sm text-muted-foreground">Cadastro e consulta de bens patrimoniais</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="h-5 w-5 text-primary" />
            Itens Patrimoniais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
