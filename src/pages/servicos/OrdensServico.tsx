import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Search, Wrench, ClipboardList, Calendar, User, MapPin, CheckCircle, XCircle } from "lucide-react";

interface OrdemServico {
  id: string;
  numero: string;
  descricao: string;
  tipo: string;
  prioridade: string;
  setor: string;
  local: string;
  solicitante: string;
  responsavel: string;
  dataAbertura: string;
  dataPrevista: string;
  dataConclusao: string;
  status: string;
  observacoes: string;
}

const TIPOS = ['Elétrica', 'Hidráulica', 'Manutenção Geral', 'Limpeza', 'Jardinagem', 'Pintura', 'Marcenaria', 'Alvenaria', 'Ar-condicionado', 'Outros'];
const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente'];
const SETORES = ['Administração', 'Ensino', 'Coordenação', 'Biblioteca', 'Lab. Informática', 'Lab. Ciências', 'Direção', 'Refeitório', 'Quadra', 'Área Externa'];

const MOCK: OrdemServico[] = [
  { id: '1', numero: 'OS-2026-001', descricao: 'Troca de lâmpadas bloco B, salas 5 a 8', tipo: 'Elétrica', prioridade: 'Alta', setor: 'Ensino', local: 'Bloco B', solicitante: 'Ana Lima', responsavel: 'Carlos Pereira', dataAbertura: '2026-04-01', dataPrevista: '2026-04-05', dataConclusao: '', status: 'aberta', observacoes: 'Lâmpadas LED tubular T8' },
  { id: '2', numero: 'OS-2026-002', descricao: 'Vazamento no banheiro masculino térreo', tipo: 'Hidráulica', prioridade: 'Urgente', setor: 'Administração', local: 'Bloco A - Térreo', solicitante: 'Pedro Santos', responsavel: 'José Silva', dataAbertura: '2026-04-02', dataPrevista: '2026-04-03', dataConclusao: '', status: 'em_andamento', observacoes: 'Registro danificado' },
  { id: '3', numero: 'OS-2026-003', descricao: 'Reparo ar-condicionado sala da direção', tipo: 'Ar-condicionado', prioridade: 'Normal', setor: 'Direção', local: 'Bloco Principal', solicitante: 'Maria Souza', responsavel: 'Carlos Pereira', dataAbertura: '2026-04-03', dataPrevista: '2026-04-07', dataConclusao: '2026-04-06', status: 'concluida', observacoes: 'Troca de filtro e gás' },
  { id: '4', numero: 'OS-2026-004', descricao: 'Pintura do corredor bloco C', tipo: 'Pintura', prioridade: 'Baixa', setor: 'Ensino', local: 'Bloco C', solicitante: 'João Costa', responsavel: '', dataAbertura: '2026-04-04', dataPrevista: '2026-04-15', dataConclusao: '', status: 'aberta', observacoes: 'Cor: branco gelo' },
  { id: '5', numero: 'OS-2026-005', descricao: 'Poda de árvores na entrada principal', tipo: 'Jardinagem', prioridade: 'Normal', setor: 'Área Externa', local: 'Entrada', solicitante: 'Lucia Mendes', responsavel: 'Equipe Terceirizada', dataAbertura: '2026-04-05', dataPrevista: '2026-04-10', dataConclusao: '', status: 'em_andamento', observacoes: 'Agendar com equipe de poda' },
  { id: '6', numero: 'OS-2026-006', descricao: 'Reparo na porta do laboratório de ciências', tipo: 'Marcenaria', prioridade: 'Normal', setor: 'Lab. Ciências', local: 'Bloco D', solicitante: 'Roberto Alves', responsavel: 'José Silva', dataAbertura: '2026-04-06', dataPrevista: '2026-04-09', dataConclusao: '2026-04-08', status: 'concluida', observacoes: 'Dobradiça quebrada' },
];

const statusColors: Record<string, string> = {
  aberta: 'bg-blue-500/20 text-blue-400',
  em_andamento: 'bg-amber-500/20 text-amber-400',
  concluida: 'bg-emerald-500/20 text-emerald-400',
  cancelada: 'bg-red-500/20 text-red-400',
};
const statusLabels: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};
const prioridadeColors: Record<string, string> = {
  Baixa: 'bg-slate-500/20 text-slate-400',
  Normal: 'bg-blue-500/20 text-blue-400',
  Alta: 'bg-amber-500/20 text-amber-400',
  Urgente: 'bg-red-500/20 text-red-400',
};

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);

  const [form, setForm] = useState({
    descricao: '', tipo: '', prioridade: 'Normal', setor: '', local: '', solicitante: '', responsavel: '', dataPrevista: '', observacoes: '',
  });

  const filtrados = ordens.filter(o => {
    const buscaOk = o.numero.toLowerCase().includes(busca.toLowerCase()) || o.descricao.toLowerCase().includes(busca.toLowerCase()) || o.solicitante.toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === 'todos' || o.status === filtroStatus;
    const tipoOk = filtroTipo === 'todos' || o.tipo === filtroTipo;
    return buscaOk && statusOk && tipoOk;
  });

  const handleSalvar = () => {
    if (!form.descricao || !form.tipo || !form.setor) return;
    const nova: OrdemServico = {
      id: String(Date.now()),
      numero: `OS-2026-${String(ordens.length + 1).padStart(3, '0')}`,
      ...form,
      dataAbertura: new Date().toISOString().split('T')[0],
      dataConclusao: '',
      status: 'aberta',
    };
    setOrdens([nova, ...ordens]);
    setForm({ descricao: '', tipo: '', prioridade: 'Normal', setor: '', local: '', solicitante: '', responsavel: '', dataPrevista: '', observacoes: '' });
    setModalAberto(false);
  };

  const handleMudarStatus = (id: string, novoStatus: string) => {
    setOrdens(ordens.map(o => o.id === id ? { ...o, status: novoStatus, dataConclusao: novoStatus === 'concluida' ? new Date().toISOString().split('T')[0] : o.dataConclusao } : o));
    if (ordemSelecionada?.id === id) {
      setOrdemSelecionada({ ...ordemSelecionada, status: novoStatus, dataConclusao: novoStatus === 'concluida' ? new Date().toISOString().split('T')[0] : ordemSelecionada.dataConclusao });
    }
  };

  const contadores = {
    total: ordens.length,
    abertas: ordens.filter(o => o.status === 'aberta').length,
    andamento: ordens.filter(o => o.status === 'em_andamento').length,
    concluidas: ordens.filter(o => o.status === 'concluida').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">Gestão de ordens de serviço internas</p>
        </div>
        <Button onClick={() => setModalAberto(true)}><Plus className="h-4 w-4 mr-2" /> Nova OS</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: contadores.total, cls: 'text-foreground' },
          { label: 'Abertas', value: contadores.abertas, cls: 'text-blue-400' },
          { label: 'Em andamento', value: contadores.andamento, cls: 'text-amber-400' },
          { label: 'Concluídas', value: contadores.concluidas, cls: 'text-emerald-400' },
        ].map(c => (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${c.cls}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar OS..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtrados.map(os => (
          <Card key={os.id} className="border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => { setOrdemSelecionada(os); setDetalhesAberto(true); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{os.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeColors[os.prioridade]}`}>{os.prioridade}</span>
                    </div>
                    <p className="font-semibold text-sm">{os.descricao}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{os.setor} — {os.local}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{os.solicitante}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{os.dataAbertura}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{os.tipo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[os.status]}`}>{statusLabels[os.status]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma ordem de serviço encontrada.</CardContent></Card>
        )}
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Descrição do serviço *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipo} onValueChange={(v: string) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de serviço *" /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.prioridade} onValueChange={(v: string) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.setor} onValueChange={(v: string) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Setor *" /></SelectTrigger>
                <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Local específico" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Solicitante" value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} />
              <Input placeholder="Responsável" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <Input type="date" placeholder="Data prevista" value={form.dataPrevista} onChange={e => setForm({ ...form, dataPrevista: e.target.value })} />
            <Input placeholder="Observações" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!form.descricao || !form.tipo || !form.setor}>Criar OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detalhesAberto} onOpenChange={setDetalhesAberto}>
        <DialogContent className="max-w-lg">
          {ordemSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-400" />
                  {ordemSelecionada.numero}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{ordemSelecionada.descricao}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ordemSelecionada.status]}`}>{statusLabels[ordemSelecionada.status]}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeColors[ordemSelecionada.prioridade]}`}>{ordemSelecionada.prioridade}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{ordemSelecionada.tipo}</span></div>
                  <div><span className="text-muted-foreground">Setor:</span> <span className="font-medium">{ordemSelecionada.setor}</span></div>
                  <div><span className="text-muted-foreground">Local:</span> <span className="font-medium">{ordemSelecionada.local}</span></div>
                  <div><span className="text-muted-foreground">Solicitante:</span> <span className="font-medium">{ordemSelecionada.solicitante}</span></div>
                  <div><span className="text-muted-foreground">Responsável:</span> <span className="font-medium">{ordemSelecionada.responsavel || '—'}</span></div>
                  <div><span className="text-muted-foreground">Abertura:</span> <span className="font-medium">{ordemSelecionada.dataAbertura}</span></div>
                  <div><span className="text-muted-foreground">Previsão:</span> <span className="font-medium">{ordemSelecionada.dataPrevista || '—'}</span></div>
                  <div><span className="text-muted-foreground">Conclusão:</span> <span className="font-medium">{ordemSelecionada.dataConclusao || '—'}</span></div>
                </div>
                {ordemSelecionada.observacoes && (
                  <div className="text-sm"><span className="text-muted-foreground">Observações:</span> <p className="mt-1">{ordemSelecionada.observacoes}</p></div>
                )}
                {ordemSelecionada.status !== 'concluida' && ordemSelecionada.status !== 'cancelada' && (
                  <div className="flex gap-2 pt-2">
                    {ordemSelecionada.status === 'aberta' && (
                      <Button size="sm" onClick={() => handleMudarStatus(ordemSelecionada.id, 'em_andamento')} className="bg-amber-600 hover:bg-amber-700">
                        <Wrench className="h-3 w-3 mr-1" /> Iniciar
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleMudarStatus(ordemSelecionada.id, 'concluida')} className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="h-3 w-3 mr-1" /> Concluir
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMudarStatus(ordemSelecionada.id, 'cancelada')} className="text-red-400 border-red-400/30 hover:bg-red-500/10">
                      <XCircle className="h-3 w-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
