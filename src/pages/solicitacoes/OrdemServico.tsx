import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Search, Wrench, Calendar, User, MapPin, Send, Clock } from "lucide-react";

interface SolicitacaoServico {
  id: string;
  numero: string;
  solicitante: string;
  setor: string;
  data: string;
  status: string;
  tipoServico: string;
  prioridade: string;
  descricao: string;
  local: string;
  observacao: string;
  aprovadoPor: string;
  dataAprovacao: string;
  osGerada: string; // número da OS gerada no módulo Serviços Gerais
}

const TIPOS_SERVICO = ['Elétrica', 'Hidráulica', 'Manutenção Geral', 'Limpeza', 'Jardinagem', 'Pintura', 'Marcenaria', 'Alvenaria', 'Ar-condicionado', 'Outros'];
const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente'];
const SETORES = ['Coordenação de TI', 'Direção Geral', 'CGAE', 'Ensino', 'Lab. Informática', 'Lab. Ciências', 'Biblioteca', 'Coordenação', 'Administração', 'Refeitório', 'Quadra', 'Área Externa'];

const MOCK: SolicitacaoServico[] = [
  { id: '1', numero: 'SS-2026-001', solicitante: 'Ana Lima', setor: 'Biblioteca', data: '2026-04-01', status: 'enviada', tipoServico: 'Elétrica', prioridade: 'Alta', descricao: 'Lâmpadas queimadas no setor de periódicos', local: 'Bloco B - Biblioteca', observacao: '5 lâmpadas no corredor principal', aprovadoPor: '', dataAprovacao: '', osGerada: '' },
  { id: '2', numero: 'SS-2026-002', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '2026-04-02', status: 'aprovada', tipoServico: 'Ar-condicionado', prioridade: 'Urgente', descricao: 'Ar-condicionado do laboratório parou de funcionar', local: 'Bloco C - Lab 02', observacao: 'Temperatura acima de 35°C', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-03', osGerada: 'OS-2026-047' },
  { id: '3', numero: 'SS-2026-003', solicitante: 'Maria Souza', setor: 'Direção Geral', data: '2026-04-03', status: 'rascunho', tipoServico: 'Pintura', prioridade: 'Baixa', descricao: 'Pintura da sala de reuniões', local: 'Bloco Principal - Sala 3', observacao: '', aprovadoPor: '', dataAprovacao: '', osGerada: '' },
  { id: '4', numero: 'SS-2026-004', solicitante: 'João Costa', setor: 'Coordenação', data: '2026-04-05', status: 'atendida', tipoServico: 'Hidráulica', prioridade: 'Alta', descricao: 'Vazamento na torneira do banheiro do corredor', local: 'Bloco A - Térreo', observacao: 'Urgente, está molhando o piso', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-05', osGerada: 'OS-2026-044' },
  { id: '5', numero: 'SS-2026-005', solicitante: 'Lucia Mendes', setor: 'Refeitório', data: '2026-04-06', status: 'rejeitada', tipoServico: 'Manutenção Geral', prioridade: 'Normal', descricao: 'Porta do depósito com fechadura emperrada', local: 'Refeitório - Depósito', observacao: 'Serviço de competência da empresa terceirizada', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-07', osGerada: '' },
];

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-500/20 text-slate-400',
  enviada: 'bg-blue-500/20 text-blue-400',
  aprovada: 'bg-emerald-500/20 text-emerald-400',
  rejeitada: 'bg-red-500/20 text-red-400',
  atendida: 'bg-purple-500/20 text-purple-400',
};
const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aprovada: 'Aprovada (OS gerada)', rejeitada: 'Rejeitada', atendida: 'Atendida',
};
const prioridadeColors: Record<string, string> = {
  Baixa: 'bg-slate-500/20 text-slate-400',
  Normal: 'bg-blue-500/20 text-blue-400',
  Alta: 'bg-amber-500/20 text-amber-400',
  Urgente: 'bg-red-500/20 text-red-400',
};

export default function OrdemServico() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoServico[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalNova, setModalNova] = useState(false);
  const [detalhes, setDetalhes] = useState<SolicitacaoServico | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  const [form, setForm] = useState({
    solicitante: '', setor: '', tipoServico: '', prioridade: 'Normal', descricao: '', local: '', observacao: '',
  });

  const filtrados = solicitacoes.filter(s => {
    const buscaOk = s.numero.toLowerCase().includes(busca.toLowerCase()) || s.descricao.toLowerCase().includes(busca.toLowerCase()) || s.solicitante.toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === 'todos' || s.status === filtroStatus;
    return buscaOk && statusOk;
  });

  const handleSalvar = (enviar: boolean) => {
    if (!form.solicitante || !form.setor || !form.descricao || !form.tipoServico) return;
    const nova: SolicitacaoServico = {
      id: String(Date.now()),
      numero: `SS-2026-${String(solicitacoes.length + 1).padStart(3, '0')}`,
      ...form,
      data: new Date().toISOString().split('T')[0],
      status: enviar ? 'enviada' : 'rascunho',
      aprovadoPor: '', dataAprovacao: '', osGerada: '',
    };
    setSolicitacoes([nova, ...solicitacoes]);
    setForm({ solicitante: '', setor: '', tipoServico: '', prioridade: 'Normal', descricao: '', local: '', observacao: '' });
    setModalNova(false);
  };

  const handleEnviar = (id: string) => {
    setSolicitacoes(solicitacoes.map(s => s.id === id ? { ...s, status: 'enviada' } : s));
    if (detalhes?.id === id) setDetalhes({ ...detalhes, status: 'enviada' });
  };

  const contadores = {
    total: solicitacoes.length,
    rascunho: solicitacoes.filter(s => s.status === 'rascunho').length,
    enviadas: solicitacoes.filter(s => s.status === 'enviada').length,
    aprovadas: solicitacoes.filter(s => s.status === 'aprovada').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitação de Serviço</h1>
          <p className="text-sm text-muted-foreground">Solicitar serviços de manutenção e reparos ao setor de Serviços Gerais</p>
        </div>
        <Button onClick={() => setModalNova(true)}><Plus className="h-4 w-4 mr-2" /> Nova Solicitação</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: contadores.total, cls: 'text-foreground' },
          { label: 'Rascunho', value: contadores.rascunho, cls: 'text-slate-400' },
          { label: 'Enviadas', value: contadores.enviadas, cls: 'text-blue-400' },
          { label: 'Aprovadas', value: contadores.aprovadas, cls: 'text-emerald-400' },
        ].map(c => (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar solicitação..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="rejeitada">Rejeitada</SelectItem>
            <SelectItem value="atendida">Atendida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtrados.map(s => (
          <Card key={s.id} className="border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => { setDetalhes(s); setModalDetalhes(true); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{s.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeColors[s.prioridade]}`}>{s.prioridade}</span>
                      {s.osGerada && <span className="text-xs text-emerald-400 font-mono">→ {s.osGerada}</span>}
                    </div>
                    <p className="font-semibold text-sm">{s.descricao}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.solicitante}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.setor} — {s.local}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.data}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{s.tipoServico}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status]}`}>{statusLabels[s.status]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma solicitação encontrada.</CardContent></Card>
        )}
      </div>

      {/* Modal Nova */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação de Serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Solicitante *" value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} />
              <Select value={form.setor} onValueChange={(v: string) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Setor *" /></SelectTrigger>
                <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Descrição detalhada do problema *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipoServico} onValueChange={(v: string) => setForm({ ...form, tipoServico: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de serviço *" /></SelectTrigger>
                <SelectContent>{TIPOS_SERVICO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.prioridade} onValueChange={(v: string) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Local (ex: Bloco B - Sala 5)" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
            <Input placeholder="Observações adicionais" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />

            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
              <p><strong>Fluxo:</strong> Ao enviar, sua solicitação será analisada pelo setor de <strong>Serviços Gerais</strong>. Se aprovada, uma Ordem de Serviço (OS) será gerada automaticamente para execução.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => handleSalvar(false)} disabled={!form.solicitante || !form.setor || !form.descricao}>
              Salvar Rascunho
            </Button>
            <Button onClick={() => handleSalvar(true)} disabled={!form.solicitante || !form.setor || !form.descricao || !form.tipoServico}>
              <Send className="h-4 w-4 mr-1" /> Enviar para Serviços Gerais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-lg">
          {detalhes && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-400" />
                  {detalhes.numero}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detalhes.status]}`}>{statusLabels[detalhes.status]}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{detalhes.descricao}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeColors[detalhes.prioridade]}`}>{detalhes.prioridade}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{detalhes.tipoServico}</span></div>
                  <div><span className="text-muted-foreground">Local:</span> <span className="font-medium">{detalhes.local}</span></div>
                  <div><span className="text-muted-foreground">Solicitante:</span> <span className="font-medium">{detalhes.solicitante}</span></div>
                  <div><span className="text-muted-foreground">Setor:</span> <span className="font-medium">{detalhes.setor}</span></div>
                  <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{detalhes.data}</span></div>
                  {detalhes.aprovadoPor && <div><span className="text-muted-foreground">Aprovado por:</span> <span className="font-medium">{detalhes.aprovadoPor}</span></div>}
                  {detalhes.osGerada && <div><span className="text-muted-foreground">OS Gerada:</span> <span className="font-medium text-emerald-400">{detalhes.osGerada}</span></div>}
                </div>
                {detalhes.observacao && (
                  <div className="text-sm"><span className="text-muted-foreground">Observação:</span> <p className="mt-1">{detalhes.observacao}</p></div>
                )}

                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Fluxo</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={detalhes.status !== 'rascunho' ? 'text-emerald-400' : ''}>Solicitação</span>
                    <span>→</span>
                    <span className={['enviada','aprovada','atendida'].includes(detalhes.status) ? 'text-emerald-400' : ''}>Enviada a Serviços Gerais</span>
                    <span>→</span>
                    <span className={['aprovada','atendida'].includes(detalhes.status) ? 'text-emerald-400' : detalhes.status === 'rejeitada' ? 'text-red-400' : ''}>
                      {detalhes.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada → OS gerada'}
                    </span>
                    <span>→</span>
                    <span className={detalhes.status === 'atendida' ? 'text-emerald-400' : ''}>Serviço Executado</span>
                  </div>
                </div>

                {detalhes.status === 'rascunho' && (
                  <Button size="sm" onClick={() => handleEnviar(detalhes.id)}>
                    <Send className="h-3 w-3 mr-1" /> Enviar para Serviços Gerais
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
