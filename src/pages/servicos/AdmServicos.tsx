import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Users, Wrench, Settings, Plus, FileText, DollarSign, BarChart3 } from "lucide-react";

// === Equipes ===
interface Equipe {
  id: string;
  nome: string;
  responsavel: string;
  membros: number;
  especialidade: string;
  ativa: boolean;
}

const EQUIPES_MOCK: Equipe[] = [
  { id: '1', nome: 'Equipe Elétrica', responsavel: 'Carlos Pereira', membros: 3, especialidade: 'Elétrica', ativa: true },
  { id: '2', nome: 'Equipe Hidráulica', responsavel: 'José Silva', membros: 2, especialidade: 'Hidráulica', ativa: true },
  { id: '3', nome: 'Equipe Manutenção Geral', responsavel: 'Roberto Alves', membros: 4, especialidade: 'Manutenção Geral', ativa: true },
  { id: '4', nome: 'Terceirizada - Jardinagem', responsavel: 'Empresa Verde Ltda', membros: 5, especialidade: 'Jardinagem', ativa: true },
];

// === Contratos Terceirizados ===
interface ContratoTerceirizado {
  id: string;
  empresa: string;
  cnpj: string;
  objeto: string;
  vigencia: string;
  valor: number;
  status: string;
}

const CONTRATOS_MOCK: ContratoTerceirizado[] = [
  { id: '1', empresa: 'Verde Ltda', cnpj: '12.345.678/0001-90', objeto: 'Jardinagem e paisagismo', vigencia: '01/2026 - 12/2026', valor: 48000, status: 'ativo' },
  { id: '2', empresa: 'Clean Service', cnpj: '98.765.432/0001-10', objeto: 'Limpeza e conservação', vigencia: '03/2026 - 02/2027', valor: 120000, status: 'ativo' },
  { id: '3', empresa: 'Elétrica Total', cnpj: '11.222.333/0001-44', objeto: 'Manutenção elétrica predial', vigencia: '06/2025 - 05/2026', valor: 36000, status: 'vencendo' },
];

// === Tipos de Serviço ===
interface TipoServico {
  id: string;
  nome: string;
  categoria: string;
  sla: number;
  ativo: boolean;
}

const TIPOS_MOCK: TipoServico[] = [
  { id: '1', nome: 'Elétrica', categoria: 'Infraestrutura', sla: 24, ativo: true },
  { id: '2', nome: 'Hidráulica', categoria: 'Infraestrutura', sla: 12, ativo: true },
  { id: '3', nome: 'Manutenção Geral', categoria: 'Manutenção', sla: 48, ativo: true },
  { id: '4', nome: 'Limpeza', categoria: 'Conservação', sla: 8, ativo: true },
  { id: '5', nome: 'Jardinagem', categoria: 'Conservação', sla: 72, ativo: true },
  { id: '6', nome: 'Pintura', categoria: 'Manutenção', sla: 120, ativo: true },
  { id: '7', nome: 'Marcenaria', categoria: 'Manutenção', sla: 72, ativo: true },
  { id: '8', nome: 'Alvenaria', categoria: 'Infraestrutura', sla: 120, ativo: true },
  { id: '9', nome: 'Ar-condicionado', categoria: 'Climatização', sla: 24, ativo: true },
];

export default function AdmServicos() {
  const [equipes, setEquipes] = useState<Equipe[]>(EQUIPES_MOCK);
  const [contratos] = useState<ContratoTerceirizado[]>(CONTRATOS_MOCK);
  const [tipos, setTipos] = useState<TipoServico[]>(TIPOS_MOCK);

  const [modalEquipe, setModalEquipe] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [formEquipe, setFormEquipe] = useState({ nome: '', responsavel: '', membros: '', especialidade: '' });
  const [formTipo, setFormTipo] = useState({ nome: '', categoria: '', sla: '' });

  const handleAddEquipe = () => {
    if (!formEquipe.nome) return;
    setEquipes([...equipes, { id: String(Date.now()), ...formEquipe, membros: Number(formEquipe.membros) || 1, ativa: true }]);
    setFormEquipe({ nome: '', responsavel: '', membros: '', especialidade: '' });
    setModalEquipe(false);
  };

  const handleAddTipo = () => {
    if (!formTipo.nome) return;
    setTipos([...tipos, { id: String(Date.now()), ...formTipo, sla: Number(formTipo.sla) || 24, ativo: true }]);
    setFormTipo({ nome: '', categoria: '', sla: '' });
    setModalTipo(false);
  };

  const totalOS = 45;
  const custoMes = 12350;
  const tempoMedio = 18;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ADM — Serviços Gerais</h1>
        <p className="text-sm text-muted-foreground">Configurações e administração do módulo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>
            <div><p className="text-2xl font-bold">{totalOS}</p><p className="text-xs text-muted-foreground">OS no mês</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div><p className="text-2xl font-bold">R$ {custoMes.toLocaleString('pt-BR')}</p><p className="text-xs text-muted-foreground">Custo estimado / mês</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>
            <div><p className="text-2xl font-bold">{tempoMedio}h</p><p className="text-xs text-muted-foreground">Tempo médio resolução</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="equipes">
        <TabsList>
          <TabsTrigger value="equipes"><Users className="h-4 w-4 mr-1" /> Equipes</TabsTrigger>
          <TabsTrigger value="contratos"><FileText className="h-4 w-4 mr-1" /> Contratos Terceirizados</TabsTrigger>
          <TabsTrigger value="tipos"><Wrench className="h-4 w-4 mr-1" /> Tipos de Serviço</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="equipes" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalEquipe(true)}><Plus className="h-4 w-4 mr-1" /> Nova Equipe</Button>
          </div>
          <div className="grid gap-3">
            {equipes.map(eq => (
              <Card key={eq.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{eq.nome}</p>
                      <p className="text-xs text-muted-foreground">Responsável: {eq.responsavel} · {eq.membros} membros · {eq.especialidade}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eq.ativa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {eq.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contratos" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Empresa</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">CNPJ</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Objeto</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vigência</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Valor Anual</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map(c => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{c.empresa}</td>
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{c.cnpj}</td>
                    <td className="py-2 px-3">{c.objeto}</td>
                    <td className="py-2 px-3 text-muted-foreground">{c.vigencia}</td>
                    <td className="py-2 px-3 text-right">R$ {c.valor.toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {c.status === 'ativo' ? 'Ativo' : 'Vencendo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalTipo(true)}><Plus className="h-4 w-4 mr-1" /> Novo Tipo</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Categoria</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">SLA (horas)</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{t.nome}</td>
                    <td className="py-2 px-3 text-muted-foreground">{t.categoria}</td>
                    <td className="py-2 px-3 text-right">{t.sla}h</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Parâmetros do Módulo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">SLA padrão (horas)</label>
                  <Input type="number" defaultValue="24" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Numeração automática</label>
                  <Select defaultValue="sim">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Prefixo das OS</label>
                  <Input defaultValue="OS" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Notificar responsável</label>
                  <Select defaultValue="sim">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Aprovação obrigatória</label>
                  <Select defaultValue="nao">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Dias para alerta de atraso</label>
                  <Input type="number" defaultValue="3" className="mt-1" />
                </div>
              </div>
              <Button className="mt-2">Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalEquipe} onOpenChange={setModalEquipe}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Equipe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da equipe *" value={formEquipe.nome} onChange={e => setFormEquipe({ ...formEquipe, nome: e.target.value })} />
            <Input placeholder="Responsável" value={formEquipe.responsavel} onChange={e => setFormEquipe({ ...formEquipe, responsavel: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nº membros" type="number" value={formEquipe.membros} onChange={e => setFormEquipe({ ...formEquipe, membros: e.target.value })} />
              <Input placeholder="Especialidade" value={formEquipe.especialidade} onChange={e => setFormEquipe({ ...formEquipe, especialidade: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEquipe(false)}>Cancelar</Button>
            <Button onClick={handleAddEquipe} disabled={!formEquipe.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalTipo} onOpenChange={setModalTipo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Tipo de Serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do tipo *" value={formTipo.nome} onChange={e => setFormTipo({ ...formTipo, nome: e.target.value })} />
            <Input placeholder="Categoria" value={formTipo.categoria} onChange={e => setFormTipo({ ...formTipo, categoria: e.target.value })} />
            <Input placeholder="SLA em horas" type="number" value={formTipo.sla} onChange={e => setFormTipo({ ...formTipo, sla: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalTipo(false)}>Cancelar</Button>
            <Button onClick={handleAddTipo} disabled={!formTipo.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
