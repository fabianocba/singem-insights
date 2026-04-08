import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ClipboardList } from "lucide-react";

export default function Agendamentos() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agendamentos — Transportes</h1>
      <p className="text-sm text-muted-foreground">Agendamento de viagens e uso de veículos</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
