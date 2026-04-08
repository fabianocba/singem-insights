import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ClipboardList } from "lucide-react";

export default function OrdensServico() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
      <p className="text-sm text-muted-foreground">Gestão de ordens de serviço internas</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Ordens de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
