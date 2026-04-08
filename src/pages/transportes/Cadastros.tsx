import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { BookOpen } from "lucide-react";

export default function Cadastros() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cadastros — Transportes</h1>
      <p className="text-sm text-muted-foreground">Cadastro de veículos, motoristas e rotas</p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" />
            Cadastros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
