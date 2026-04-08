import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Search, CheckCircle2, XCircle, Clock,
  Package, Landmark, Truck, Wrench, User, MapPin, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { useSolicitacoes } from "../../contexts/SolicitacoesContext";
import type { ModuloId } from "../../types";

const iconeModulo: Record<string, React.ElementType> = {
  almoxarifado: Package,
  patrimonio: Landmark,
  transportes: Truck,
  servicos: Wrench,
};

const tituloModulo: Record<string, string> = {
  almoxarifado: "Solicitações de Material (SM)",
  patrimonio: "Solicitações de Bens (SB)",
  transportes: "Solicitações de Veículo",
  servicos: "Solicitações de Serviço",
};

const tipoNotificacao: Record<string, 'sm_almox' | 'sb_patrim' | 'sol_veiculo' | 'sol_servico'> = {
  almoxarifado: 'sm_almox',
  patrimonio: 'sb_patrim',
  transportes: 'sol_veiculo',
  servicos: 'sol_servico',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  enviada: { label: 'Pendente', color: 'bg-amber-500/20 text-amber-300', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'bg-emerald-500/20 text-emerald-300', icon: CheckCircle2 },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-500/20 text-red-300', icon: XCircle },
  atendida: { label: 'Atendida', color: 'bg-blue-500/20 text-blue-300', icon: CheckCircle2 },
  parcial: { label: 'Parcial', color: 'bg-orange-500/20 text-orange-300', icon: AlertTriangle },
  rascunho: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-300', icon: Clock },
};

interface Props {
  modulo: ModuloId;
}

export default function GestorAprovacoes({ modulo }: Props) {
  const { adicionarNotificacao } = useNotificacoes();
  const { getPorTipo, atualizarStatus } = useSolicitacoes();

  // Gestor vê apenas solicitações enviadas/aprovadas/rejeitadas/atendidas (não rascunhos)
  const todasSolicitacoes = getPorTipo(modulo as any).filter(s => s.status !== 'rascunho');

  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [detalheSolId, setDetalheSolId] = useState<string | null>(null);
  const [acaoDialog, setAcaoDialog] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const Icon = iconeModulo[modulo];

  const detalheSol = todasSolicitacoes.find(s => s.id === detalheSolId) || null;

  const filtradas = todasSolicitacoes.filter(s => {
    const matchStatus = filtroStatus === 'todos' || s.status === filtroStatus;
    const matchBusca = busca === '' ||
      s.numero.toLowerCase().includes(busca.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      s.setor.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  const pendentes = todasSolicitacoes.filter(s => s.status === 'enviada').length;
  const aprovadas = todasSolicitacoes.filter(s => s.status === 'aprovada').length;
  const rejeitadas = todasSolicitacoes.filter(s => s.status === 'rejeitada').length;

  const handleAprovar = (solId: string) => {
    const sol = todasSolicitacoes.find(s => s.id === solId);
    if (!sol) return;
    atualizarStatus(solId, 'aprovada', 'Aprovado pelo gestor.');
    adicionarNotificacao({
      tipo: tipoNotificacao[modulo],
      titulo: `${sol.numero} Aprovada`,
      mensagem: `Sua solicitação foi aprovada pelo setor de ${tituloModulo[modulo].split('(')[0].trim()}.`,
      link: `/solicitacoes/${modulo === 'servicos' ? 'ordem-servico' : modulo}`,
    });
    toast.success(`${sol.numero} aprovada com sucesso!`);
    setDetalheSolId(null);
    setAcaoDialog(null);
  };

  const handleRejeitar = (solId: string) => {
    if (!motivoRejeicao.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    const sol = todasSolicitacoes.find(s => s.id === solId);
    if (!sol) return;
    atualizarStatus(solId, 'rejeitada', motivoRejeicao);
    adicionarNotificacao({
      tipo: tipoNotificacao[modulo],
      titulo: `${sol.numero} Rejeitada`,
      mensagem: `Sua solicitação foi rejeitada. Motivo: ${motivoRejeicao}`,
      link: `/solicitacoes/${modulo === 'servicos' ? 'ordem-servico' : modulo}`,
    });
    toast.error(`${sol.numero} rejeitada.`);
    setDetalheSolId(null);
    setAcaoDialog(null);
    setMotivoRejeicao('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{tituloModulo[modulo]}</h2>
            <p className="text-sm text-muted-foreground">Gerencie as solicitações recebidas dos setores</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-500/30 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{aprovadas}</p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejeitadas}</p>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, solicitante ou setor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="enviada">Pendentes</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="rejeitada">Rejeitadas</SelectItem>
            <SelectItem value="atendida">Atendidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma solicitação encontrada.
            </CardContent>
          </Card>
        ) : (
          filtradas.map(sol => {
            const cfg = statusConfig[sol.status] || statusConfig.enviada;
            return (
              <Card key={sol.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setDetalheSolId(sol.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{sol.numero}</span>
                        <span className="text-xs text-muted-foreground">{new Date(sol.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {sol.solicitante}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {sol.setor}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{sol.itens.length} {sol.itens.length === 1 ? 'item' : 'itens'}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {sol.status === 'enviada' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={e => { e.stopPropagation(); handleAprovar(sol.id); }}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={e => { e.stopPropagation(); setDetalheSolId(sol.id); setAcaoDialog('rejeitar'); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog Detalhes */}
      <Dialog open={!!detalheSol && !acaoDialog} onOpenChange={() => setDetalheSolId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {detalheSol?.numero}
            </DialogTitle>
          </DialogHeader>
          {detalheSol && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Solicitante:</span> <strong>{detalheSol.solicitante}</strong></div>
                <div><span className="text-muted-foreground">Setor:</span> <strong>{detalheSol.setor}</strong></div>
                <div><span className="text-muted-foreground">Data:</span> <strong>{new Date(detalheSol.data).toLocaleDateString('pt-BR')}</strong></div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${(statusConfig[detalheSol.status] || statusConfig.enviada).color}`}>
                    {(statusConfig[detalheSol.status] || statusConfig.enviada).label}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Justificativa</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{detalheSol.justificativa}</p>
              </div>

              {detalheSol.observacao && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Observação do gestor</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{detalheSol.observacao}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Itens ({detalheSol.itens.length})</p>
                <div className="border border-border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-2 text-muted-foreground font-medium">Descrição</th>
                        <th className="text-center p-2 text-muted-foreground font-medium">Qtd</th>
                        <th className="text-center p-2 text-muted-foreground font-medium">Unid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalheSol.itens.map(item => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="p-2 text-foreground">{item.descricao}</td>
                          <td className="p-2 text-center text-foreground">{item.quantidade}</td>
                          <td className="p-2 text-center text-muted-foreground">{item.unidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detalheSol.status === 'enviada' && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAprovar(detalheSol.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar Solicitação
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => setAcaoDialog('rejeitar')}>
                    <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Rejeição */}
      <Dialog open={acaoDialog === 'rejeitar'} onOpenChange={() => { setAcaoDialog(null); setMotivoRejeicao(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              Rejeitar {detalheSol?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição. O solicitante será notificado.
            </p>
            <textarea
              className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary min-h-[100px]"
              placeholder="Motivo da rejeição..."
              value={motivoRejeicao}
              onChange={e => setMotivoRejeicao(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAcaoDialog(null); setMotivoRejeicao(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={() => detalheSolId && handleRejeitar(detalheSolId)}>Confirmar Rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
