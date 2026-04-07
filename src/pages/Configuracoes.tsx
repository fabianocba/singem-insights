import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Bell } from "lucide-react";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" /> Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Gerenciar usuários e permissões por módulo</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" /> Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Dados da unidade gestora e setores</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" /> Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configurar alertas e notificações do sistema</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
