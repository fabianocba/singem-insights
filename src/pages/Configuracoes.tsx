import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Users, Building2, Bell, Plus, Pencil, Trash2, Save, Search,
  Mail, Phone, MapPin, Hash, CheckCircle2, XCircle, BellRing, BellOff
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

/* ─── Tipos ──────────────────────────────────────────── */
interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: "admin" | "gestor" | "solicitante";
  modulos: string[];
  ativo: boolean;
}

interface Setor {
  id: string;
  nome: string;
  sigla: string;
  responsavel: string;
}

interface ConfigNotificacao {
  id: string;
  evento: string;
  descricao: string;
  email: boolean;
  sistema: boolean;
}

/* ─── Dados mock ─────────────────────────────────────── */
const usuariosIniciais: Usuario[] = [
  { id: "1", nome: "Admin Sistema", email: "admin@ifbaiano.edu.br", perfil: "admin", modulos: ["almoxarifado", "patrimonio", "transportes", "servicos"], ativo: true },
  { id: "2", nome: "Maria Santos", email: "maria@ifbaiano.edu.br", perfil: "gestor", modulos: ["almoxarifado"], ativo: true },
  { id: "3", nome: "João Pereira", email: "joao@ifbaiano.edu.br", perfil: "gestor", modulos: ["patrimonio", "transportes"], ativo: true },
  { id: "4", nome: "Ana Costa", email: "ana@ifbaiano.edu.br", perfil: "solicitante", modulos: [], ativo: true },
  { id: "5", nome: "Carlos Lima", email: "carlos@ifbaiano.edu.br", perfil: "solicitante", modulos: [], ativo: false },
];

const setoresIniciais: Setor[] = [
  { id: "1", nome: "Diretoria de Administração", sigla: "DAD", responsavel: "Admin Sistema" },
  { id: "2", nome: "Coordenação de Almoxarifado", sigla: "CALM", responsavel: "Maria Santos" },
  { id: "3", nome: "Coordenação de Patrimônio", sigla: "CPAT", responsavel: "João Pereira" },
  { id: "4", nome: "Setor de Transportes", sigla: "STRA", responsavel: "João Pereira" },
  { id: "5", nome: "Coordenação de Serviços Gerais", sigla: "CSG", responsavel: "" },
];

const notificacoesIniciais: ConfigNotificacao[] = [
  { id: "1", evento: "Solicitação criada", descricao: "Quando uma nova solicitação é enviada", email: true, sistema: true },
  { id: "2", evento: "Solicitação aprovada", descricao: "Quando uma solicitação é aprovada pelo gestor", email: true, sistema: true },
  { id: "3", evento: "Solicitação rejeitada", descricao: "Quando uma solicitação é rejeitada pelo gestor", email: true, sistema: true },
  { id: "4", evento: "Estoque baixo", descricao: "Quando um item atinge o estoque mínimo", email: false, sistema: true },
  { id: "5", evento: "Manutenção agendada", descricao: "Lembrete de manutenção de veículo", email: true, sistema: true },
  { id: "6", evento: "Ordem de serviço concluída", descricao: "Quando uma OS é finalizada", email: false, sistema: true },
];

const modulosDisponiveis = [
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "patrimonio", label: "Patrimônio" },
  { value: "transportes", label: "Transportes" },
  { value: "servicos", label: "Serviços Gerais" },
];

const perfilLabel: Record<string, string> = { admin: "Administrador", gestor: "Gestor", solicitante: "Solicitante" };
const perfilColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  gestor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  solicitante: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

/* ═══════════════════════════════════════════════════════ */
export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="usuarios" className="flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Usuários</TabsTrigger>
          <TabsTrigger value="unidade" className="flex items-center gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Unidade</TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" />Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios"><TabUsuarios /></TabsContent>
        <TabsContent value="unidade"><TabUnidade /></TabsContent>
        <TabsContent value="notificacoes"><TabNotificacoes /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════ ABA USUÁRIOS ═══════════════════════════════════ */
function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciais);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<Omit<Usuario, "id">>({ nome: "", email: "", perfil: "solicitante", modulos: [], ativo: true });

  const filtrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase())
  );

  const abrirNovo = () => { setEditando(null); setForm({ nome: "", email: "", perfil: "solicitante", modulos: [], ativo: true }); setDialogOpen(true); };
  const abrirEditar = (u: Usuario) => { setEditando(u); setForm({ nome: u.nome, email: u.email, perfil: u.perfil, modulos: [...u.modulos], ativo: u.ativo }); setDialogOpen(true); };

  const salvar = () => {
    if (!form.nome.trim() || !form.email.trim()) { toast.error("Preencha nome e email."); return; }
    if (editando) {
      setUsuarios(prev => prev.map(u => u.id === editando.id ? { ...u, ...form } : u));
      toast.success("Usuário atualizado.");
    } else {
      setUsuarios(prev => [...prev, { id: Date.now().toString(), ...form }]);
      toast.success("Usuário cadastrado.");
    }
    setDialogOpen(false);
  };

  const excluir = (id: string) => { setUsuarios(prev => prev.filter(u => u.id !== id)); toast.success("Usuário removido."); };
  const toggleAtivo = (id: string) => { setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u)); };
  const toggleModulo = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.includes(mod) ? prev.modulos.filter(m => m !== mod) : [...prev.modulos, mod]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuário..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={abrirNovo} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Usuário</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: usuarios.length, icon: Users },
          { label: "Ativos", value: usuarios.filter(u => u.ativo).length, icon: CheckCircle2 },
          { label: "Inativos", value: usuarios.filter(u => !u.ativo).length, icon: XCircle },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className="h-5 w-5 text-primary" />
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Perfil</th>
                <th className="text-left p-3 font-medium">Módulos</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr></thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{u.nome}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><Badge className={cn("text-xs", perfilColor[u.perfil])}>{perfilLabel[u.perfil]}</Badge></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.modulos.length > 0 ? u.modulos.map(m => (
                          <Badge key={m} variant="outline" className="text-[10px]">{modulosDisponiveis.find(md => md.value === m)?.label || m}</Badge>
                        )) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Switch checked={u.ativo} onCheckedChange={() => toggleAtivo(u.id)} />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => excluir(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div>
              <Label>Perfil</Label>
              <Select value={form.perfil} onValueChange={v => setForm(p => ({ ...p, perfil: v as Usuario["perfil"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.perfil === "gestor" && (
              <div>
                <Label>Módulos de acesso</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {modulosDisponiveis.map(m => (
                    <Badge
                      key={m.value}
                      variant={form.modulos.includes(m.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleModulo(m.value)}
                    >{m.label}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v: boolean) => setForm(p => ({ ...p, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={salvar}><Save className="h-4 w-4 mr-1" />Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════ ABA UNIDADE ════════════════════════════════════ */
function TabUnidade() {
  const [dadosUnidade, setDadosUnidade] = useState({
    nome: "Instituto Federal Baiano",
    sigla: "IF Baiano",
    cnpj: "10.724.903/0001-79",
    endereco: "Rua do Campo, S/N — Zona Rural",
    cidade: "Guanambi",
    uf: "BA",
    cep: "46430-000",
    telefone: "(77) 3451-1000",
    email: "admin@ifbaiano.edu.br",
    uasg: "158129",
  });
  const [setores, setSetores] = useState<Setor[]>(setoresIniciais);
  const [dialogSetor, setDialogSetor] = useState(false);
  const [editandoSetor, setEditandoSetor] = useState<Setor | null>(null);
  const [formSetor, setFormSetor] = useState<Omit<Setor, "id">>({ nome: "", sigla: "", responsavel: "" });

  const salvarUnidade = () => { toast.success("Dados da unidade salvos."); };

  const abrirNovoSetor = () => { setEditandoSetor(null); setFormSetor({ nome: "", sigla: "", responsavel: "" }); setDialogSetor(true); };
  const abrirEditarSetor = (s: Setor) => { setEditandoSetor(s); setFormSetor({ nome: s.nome, sigla: s.sigla, responsavel: s.responsavel }); setDialogSetor(true); };

  const salvarSetor = () => {
    if (!formSetor.nome.trim() || !formSetor.sigla.trim()) { toast.error("Preencha nome e sigla."); return; }
    if (editandoSetor) {
      setSetores(prev => prev.map(s => s.id === editandoSetor.id ? { ...s, ...formSetor } : s));
      toast.success("Setor atualizado.");
    } else {
      setSetores(prev => [...prev, { id: Date.now().toString(), ...formSetor }]);
      toast.success("Setor cadastrado.");
    }
    setDialogSetor(false);
  };

  const excluirSetor = (id: string) => { setSetores(prev => prev.filter(s => s.id !== id)); toast.success("Setor removido."); };

  return (
    <div className="space-y-6">
      {/* Dados da Unidade */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" />Dados da Unidade Gestora</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nome da Instituição</Label><Input value={dadosUnidade.nome} onChange={e => setDadosUnidade(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Sigla</Label><Input value={dadosUnidade.sigla} onChange={e => setDadosUnidade(p => ({ ...p, sigla: e.target.value }))} /></div>
            <div><Label>CNPJ</Label><Input value={dadosUnidade.cnpj} onChange={e => setDadosUnidade(p => ({ ...p, cnpj: e.target.value }))} /></div>
            <div><Label>UASG</Label><Input value={dadosUnidade.uasg} onChange={e => setDadosUnidade(p => ({ ...p, uasg: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><Label><MapPin className="inline h-3.5 w-3.5 mr-1" />Endereço</Label><Input value={dadosUnidade.endereco} onChange={e => setDadosUnidade(p => ({ ...p, endereco: e.target.value }))} /></div>
            <div><Label>CEP</Label><Input value={dadosUnidade.cep} onChange={e => setDadosUnidade(p => ({ ...p, cep: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Cidade</Label><Input value={dadosUnidade.cidade} onChange={e => setDadosUnidade(p => ({ ...p, cidade: e.target.value }))} /></div>
            <div><Label>UF</Label><Input value={dadosUnidade.uf} onChange={e => setDadosUnidade(p => ({ ...p, uf: e.target.value }))} /></div>
            <div><Label><Phone className="inline h-3.5 w-3.5 mr-1" />Telefone</Label><Input value={dadosUnidade.telefone} onChange={e => setDadosUnidade(p => ({ ...p, telefone: e.target.value }))} /></div>
          </div>
          <div><Label><Mail className="inline h-3.5 w-3.5 mr-1" />Email institucional</Label><Input type="email" value={dadosUnidade.email} onChange={e => setDadosUnidade(p => ({ ...p, email: e.target.value }))} /></div>
          <Button onClick={salvarUnidade}><Save className="h-4 w-4 mr-1" />Salvar Dados</Button>
        </CardContent>
      </Card>

      {/* Setores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Hash className="h-5 w-5 text-primary" />Setores</CardTitle>
          <Button size="sm" onClick={abrirNovoSetor}><Plus className="h-4 w-4 mr-1" />Novo Setor</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Sigla</th>
                <th className="text-left p-3 font-medium">Responsável</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr></thead>
              <tbody>
                {setores.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{s.nome}</td>
                    <td className="p-3"><Badge variant="outline">{s.sigla}</Badge></td>
                    <td className="p-3 text-muted-foreground">{s.responsavel || "—"}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditarSetor(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => excluirSetor(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Setor */}
      <Dialog open={dialogSetor} onOpenChange={setDialogSetor}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoSetor ? "Editar Setor" : "Novo Setor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do Setor</Label><Input value={formSetor.nome} onChange={e => setFormSetor(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Sigla</Label><Input value={formSetor.sigla} onChange={e => setFormSetor(p => ({ ...p, sigla: e.target.value }))} /></div>
            <div><Label>Responsável</Label><Input value={formSetor.responsavel} onChange={e => setFormSetor(p => ({ ...p, responsavel: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={salvarSetor}><Save className="h-4 w-4 mr-1" />Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════ ABA NOTIFICAÇÕES ═══════════════════════════════ */
function TabNotificacoes() {
  const [configs, setConfigs] = useState<ConfigNotificacao[]>(notificacoesIniciais);

  const toggle = (id: string, campo: "email" | "sistema") => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [campo]: !c[campo] } : c));
  };

  const salvar = () => { toast.success("Preferências de notificação salvas."); };

  const ativarTodas = (campo: "email" | "sistema") => {
    setConfigs(prev => prev.map(c => ({ ...c, [campo]: true })));
  };

  const desativarTodas = (campo: "email" | "sistema") => {
    setConfigs(prev => prev.map(c => ({ ...c, [campo]: false })));
  };

  return (
    <div className="space-y-4">
      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => ativarTodas("sistema")}><BellRing className="h-3.5 w-3.5 mr-1" />Ativar todas (sistema)</Button>
        <Button size="sm" variant="outline" onClick={() => desativarTodas("sistema")}><BellOff className="h-3.5 w-3.5 mr-1" />Desativar todas (sistema)</Button>
        <Button size="sm" variant="outline" onClick={() => ativarTodas("email")}><Mail className="h-3.5 w-3.5 mr-1" />Ativar todas (email)</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-5 w-5 text-primary" />Configurar Alertas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-medium">Evento</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Descrição</th>
                <th className="text-center p-3 font-medium">Sistema</th>
                <th className="text-center p-3 font-medium">Email</th>
              </tr></thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{c.evento}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{c.descricao}</td>
                    <td className="p-3 text-center"><Switch checked={c.sistema} onCheckedChange={() => toggle(c.id, "sistema")} /></td>
                    <td className="p-3 text-center"><Switch checked={c.email} onCheckedChange={() => toggle(c.id, "email")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar}><Save className="h-4 w-4 mr-1" />Salvar Preferências</Button>
    </div>
  );
}
