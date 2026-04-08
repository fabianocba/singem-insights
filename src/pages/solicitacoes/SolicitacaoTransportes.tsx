import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Search, Truck, Calendar, User, Clock, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { useNotificacoes } from "../../contexts/NotificacoesContext";

interface SolicitacaoVeiculo {
  id: string;
  numero: string;
  solicitante: string;
  setor: string;
  data: string;
  status: string;
  destino: string;
  motivo: string;
  dataViagem: string;
  horaPartida: string;
  horaRetorno: string;
  passageiros: number;
  tipoVeiculo: string;
  observacao: string;
  aprovadoPor: string;
  dataAprovacao: string;
  veiculoDesignado: string;
  motoristaDesignado: string;
}

const MOCK: SolicitacaoVeiculo[] = [
  { id: '1', numero: 'SV-2026-001', solicitante: 'João Silva', setor: 'Coordenação de TI', data: '2026-04-01', status: 'enviada', destino: 'Itapetinga - Secretaria de Educação', motivo: 'Reunião institucional', dataViagem: '2026-04-10', horaPartida: '07:00', horaRetorno: '18:00', passageiros: 3, tipoVeiculo: 'Carro', observacao: '', aprovadoPor: '', dataAprovacao: '', veiculoDesignado: '', motoristaDesignado: '' },
  { id: '2', numero: 'SV-2026-002', solicitante: 'Maria Souza', setor: 'Direção Geral', data: '2026-04-03', status: 'aprovada', destino: 'Salvador - SETEC/MEC', motivo: 'Capacitação servidores', dataViagem: '2026-04-15', horaPartida: '05:00', horaRetorno: '22:00', passageiros: 8, tipoVeiculo: 'Micro-ônibus', observacao: 'Levar documentação', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-04', veiculoDesignado: 'Micro-ônibus Volare', motoristaDesignado: 'Carlos Motorista' },
  { id: '3', numero: 'SV-2026-003', solicitante: 'Carlos Oliveira', setor: 'CGAE', data: '2026-04-05', status: 'rascunho', destino: 'Vitória da Conquista', motivo: 'Visita técnica', dataViagem: '2026-04-20', horaPartida: '08:00', horaRetorno: '17:00', passageiros: 2, tipoVeiculo: 'Carro', observacao: '', aprovadoPor: '', dataAprovacao: '', veiculoDesignado: '', motoristaDesignado: '' },
  { id: '4', numero: 'SV-2026-004', solicitante: 'Ana Lima', setor: 'Ensino', data: '2026-04-06', status: 'rejeitada', destino: 'Jequié', motivo: 'Aula de campo', dataViagem: '2026-04-12', horaPartida: '06:00', horaRetorno: '19:00', passageiros: 25, tipoVeiculo: 'Ônibus', observacao: 'Sem ônibus disponível na data', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-07', veiculoDesignado: '', motoristaDesignado: '' },
  { id: '5', numero: 'SV-2026-005', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '2026-04-07', status: 'atendida', destino: 'Guanambi - Campus IF Baiano', motivo: 'Manutenção de equipamentos', dataViagem: '2026-04-08', horaPartida: '07:30', horaRetorno: '16:00', passageiros: 2, tipoVeiculo: 'Carro', observacao: '', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-07', veiculoDesignado: 'Hilux HNS-1234', motoristaDesignado: 'José Motorista' },
];

const TIPOS_VEICULO = ['Carro', 'SUV/Pickup', 'Van', 'Micro-ônibus', 'Ônibus'];
const SETORES = ['Coordenação de TI', 'Direção Geral', 'CGAE', 'Ensino', 'Lab. Informática', 'Lab. Ciências', 'Biblioteca', 'Coordenação', 'Administração', 'Refeitório'];

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-500/20 text-slate-400',
  enviada: 'bg-blue-500/20 text-blue-400',
  aprovada: 'bg-emerald-500/20 text-emerald-400',
  rejeitada: 'bg-red-500/20 text-red-400',
  atendida: 'bg-purple-500/20 text-purple-400',
};
const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aprovada: 'Aprovada', rejeitada: 'Rejeitada', atendida: 'Atendida',
};

export default function SolicitacaoTransportes() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoVeiculo[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalNova, setModalNova] = useState(false);
  const [detalhes, setDetalhes] = useState<SolicitacaoVeiculo | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  const [form, setForm] = useState({
    solicitante: '', setor: '', destino: '', motivo: '', dataViagem: '', horaPartida: '', horaRetorno: '', passageiros: '', tipoVeiculo: '', observacao: '',
  });

  const filtrados = solicitacoes.filter(s => {
    const buscaOk = s.numero.toLowerCase().includes(busca.toLowerCase()) || s.solicitante.toLowerCase().includes(busca.toLowerCase()) || s.destino.toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === 'todos' || s.status === filtroStatus;
    return buscaOk && statusOk;
  });

  const { adicionarNotificacao } = useNotificacoes();

  const handleSalvar = (enviar: boolean) => {
    if (!form.solicitante || !form.setor || !form.destino || !form.motivo) return;
    const numero = `SV-2026-${String(solicitacoes.length + 1).padStart(3, '0')}`;
    const nova: SolicitacaoVeiculo = {
      id: String(Date.now()),
      numero,
      ...form,
      passageiros: Number(form.passageiros) || 1,
      data: new Date().toISOString().split('T')[0],
      status: enviar ? 'enviada' : 'rascunho',
      aprovadoPor: '', dataAprovacao: '', veiculoDesignado: '', motoristaDesignado: '',
    };
    setSolicitacoes([nova, ...solicitacoes]);
    setForm({ solicitante: '', setor: '', destino: '', motivo: '', dataViagem: '', horaPartida: '', horaRetorno: '', passageiros: '', tipoVeiculo: '', observacao: '' });
    setModalNova(false);
    if (enviar) {
      toast.success(`${numero} enviada para Transportes`);
      adicionarNotificacao({ tipo: 'sol_veiculo', titulo: `${numero} Enviada`, mensagem: `Solicitação de veículo enviada à Coordenação de Transportes.`, link: '/solicitacoes/transportes' });
    } else {
      toast.info(`${numero} salva como rascunho`);
    }
  };

  const handleEnviar = (id: string) => {
    const sol = solicitacoes.find(s => s.id === id);
    setSolicitacoes(solicitacoes.map(s => s.id === id ? { ...s, status: 'enviada' } : s));
    if (detalhes?.id === id) setDetalhes({ ...detalhes, status: 'enviada' });
    if (sol) {
      toast.success(`${sol.numero} enviada para Transportes`);
      adicionarNotificacao({ tipo: 'sol_veiculo', titulo: `${sol.numero} Enviada`, mensagem: `Solicitação de veículo enviada à Coordenação de Transportes.`, link: '/solicitacoes/transportes' });
    }
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
          <h1 className="text-2xl font-bold">Solicitação de Veículo</h1>
          <p className="text-sm text-muted-foreground">Solicitar veículos ao setor de Transportes</p>
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
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{s.numero}</span>
                    </div>
                    <p className="font-semibold text-sm">{s.destino}</p>
                    <p className="text-xs text-muted-foreground">{s.motivo}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.solicitante}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.dataViagem}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.horaPartida} - {s.horaRetorno}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.passageiros} pass.</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{s.tipoVeiculo}</span>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Solicitação de Veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Solicitante *" value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} />
              <Select value={form.setor} onValueChange={(v: string) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Setor *" /></SelectTrigger>
                <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Destino *" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
            <Input placeholder="Motivo da viagem *" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Data da viagem</label>
                <Input type="date" value={form.dataViagem} onChange={e => setForm({ ...form, dataViagem: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hora partida</label>
                <Input type="time" value={form.horaPartida} onChange={e => setForm({ ...form, horaPartida: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hora retorno</label>
                <Input type="time" value={form.horaRetorno} onChange={e => setForm({ ...form, horaRetorno: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Nº de passageiros" value={form.passageiros} onChange={e => setForm({ ...form, passageiros: e.target.value })} />
              <Select value={form.tipoVeiculo} onValueChange={(v: string) => setForm({ ...form, tipoVeiculo: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de veículo" /></SelectTrigger>
                <SelectContent>{TIPOS_VEICULO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Observações" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />

            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
              <p><strong>Fluxo:</strong> Ao enviar, a solicitação será encaminhada à <strong>Coordenação de Transportes</strong> para análise, designação de veículo e motorista.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => handleSalvar(false)} disabled={!form.solicitante || !form.setor || !form.destino}>
              Salvar Rascunho
            </Button>
            <Button onClick={() => handleSalvar(true)} disabled={!form.solicitante || !form.setor || !form.destino || !form.motivo}>
              <Send className="h-4 w-4 mr-1" /> Enviar para Transportes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detalhes && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-amber-400" />
                  {detalhes.numero}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detalhes.status]}`}>{statusLabels[detalhes.status]}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{detalhes.destino}</p>
                  <p className="text-sm text-muted-foreground">{detalhes.motivo}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Solicitante:</span> <span className="font-medium">{detalhes.solicitante}</span></div>
                  <div><span className="text-muted-foreground">Setor:</span> <span className="font-medium">{detalhes.setor}</span></div>
                  <div><span className="text-muted-foreground">Data viagem:</span> <span className="font-medium">{detalhes.dataViagem}</span></div>
                  <div><span className="text-muted-foreground">Horário:</span> <span className="font-medium">{detalhes.horaPartida} - {detalhes.horaRetorno}</span></div>
                  <div><span className="text-muted-foreground">Passageiros:</span> <span className="font-medium">{detalhes.passageiros}</span></div>
                  <div><span className="text-muted-foreground">Tipo veículo:</span> <span className="font-medium">{detalhes.tipoVeiculo}</span></div>
                  {detalhes.veiculoDesignado && <div><span className="text-muted-foreground">Veículo:</span> <span className="font-medium text-emerald-400">{detalhes.veiculoDesignado}</span></div>}
                  {detalhes.motoristaDesignado && <div><span className="text-muted-foreground">Motorista:</span> <span className="font-medium text-emerald-400">{detalhes.motoristaDesignado}</span></div>}
                  {detalhes.aprovadoPor && <div><span className="text-muted-foreground">Aprovado por:</span> <span className="font-medium">{detalhes.aprovadoPor}</span></div>}
                </div>
                {detalhes.observacao && (
                  <div className="text-sm"><span className="text-muted-foreground">Observação:</span> <p className="mt-1">{detalhes.observacao}</p></div>
                )}

                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Fluxo</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={detalhes.status !== 'rascunho' ? 'text-emerald-400' : ''}>Criada</span>
                    <span>→</span>
                    <span className={['enviada','aprovada','atendida'].includes(detalhes.status) ? 'text-emerald-400' : ''}>Enviada a Transportes</span>
                    <span>→</span>
                    <span className={['aprovada','atendida'].includes(detalhes.status) ? 'text-emerald-400' : detalhes.status === 'rejeitada' ? 'text-red-400' : ''}>
                      {detalhes.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada + Veículo'}
                    </span>
                    <span>→</span>
                    <span className={detalhes.status === 'atendida' ? 'text-emerald-400' : ''}>Viagem Realizada</span>
                  </div>
                </div>

                {detalhes.status === 'rascunho' && (
                  <Button size="sm" onClick={() => handleEnviar(detalhes.id)}>
                    <Send className="h-3 w-3 mr-1" /> Enviar para Transportes
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
