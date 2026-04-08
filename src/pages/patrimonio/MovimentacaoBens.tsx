import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import {
  Search, Plus, Eye, ArrowRightLeft, CheckCircle, Clock, XCircle, ArrowRight,
} from "lucide-react";

type StatusMovimentacao = 'pendente' | 'aprovada' | 'rejeitada' | 'concluída';
type TipoMovimentacao = 'transferência' | 'cessão' | 'devolução' | 'recolhimento';

interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  tombamento: string;
  descricaoBem: string;
  setorOrigem: string;
  responsavelOrigem: string;
  setorDestino: string;
  responsavelDestino: string;
  dataSolicitacao: string;
  dataEfetivacao: string | null;
  motivo: string;
  status: StatusMovimentacao;
  observacao: string;
}

const SETORES = [
  'Almoxarifado Central',
  'Bloco A — Sala 101',
  'Bloco A — Sala 102',
  'Bloco B — Laboratório 01',
  'Bloco B — Laboratório 02',
  'Bloco C — Administração',
  'Bloco C — Direção',
  'Bloco D — Biblioteca',
  'Bloco E — Refeitório',
  'Garagem',
];

const RESPONSAVEIS = [
  'João Silva', 'Maria Souza', 'Carlos Pereira', 'Ana Lima',
  'Pedro Santos', 'Fernanda Oliveira', 'Ricardo Costa',
];

const BENS_DISPONIVEIS = [
  { tombamento: '2024.0001', descricao: 'Notebook Dell Latitude 5520', setor: 'Bloco A — Sala 101', responsavel: 'João Silva' },
  { tombamento: '2024.0002', descricao: 'Projetor Epson PowerLite E20', setor: 'Bloco B — Laboratório 01', responsavel: 'Maria Souza' },
  { tombamento: '2023.0045', descricao: 'Mesa escritório 1.50m', setor: 'Bloco C — Administração', responsavel: 'Carlos Pereira' },
  { tombamento: '2023.0046', descricao: 'Cadeira giratória ergonômica', setor: 'Bloco C — Administração', responsavel: 'Carlos Pereira' },
  { tombamento: '2022.0112', descricao: 'Microscópio binocular', setor: 'Bloco B — Laboratório 01', responsavel: 'Ana Lima' },
];

const MOCK_MOVIMENTACOES: Movimentacao[] = [
  {
    id: '1', tipo: 'transferência', tombamento: '2024.0001', descricaoBem: 'Notebook Dell Latitude 5520',
    setorOrigem: 'Bloco A — Sala 101', responsavelOrigem: 'João Silva',
    setorDestino: 'Bloco C — Administração', responsavelDestino: 'Carlos Pereira',
    dataSolicitacao: '2026-04-01', dataEfetivacao: '2026-04-03',
    motivo: 'Remanejamento para setor administrativo', status: 'concluída', observacao: '',
  },
  {
    id: '2', tipo: 'cessão', tombamento: '2024.0002', descricaoBem: 'Projetor Epson PowerLite E20',
    setorOrigem: 'Bloco B — Laboratório 01', responsavelOrigem: 'Maria Souza',
    setorDestino: 'Bloco D — Biblioteca', responsavelDestino: 'Pedro Santos',
    dataSolicitacao: '2026-04-05', dataEfetivacao: null,
    motivo: 'Cessão temporária para evento', status: 'pendente', observacao: 'Evento da semana acadêmica',
  },
  {
    id: '3', tipo: 'devolução', tombamento: '2023.0046', descricaoBem: 'Cadeira giratória ergonômica',
    setorOrigem: 'Bloco C — Direção', responsavelOrigem: 'Fernanda Oliveira',
    setorDestino: 'Almoxarifado Central', responsavelDestino: 'Ricardo Costa',
    dataSolicitacao: '2026-04-02', dataEfetivacao: '2026-04-04',
    motivo: 'Bem em estado precário, devolução ao almoxarifado', status: 'aprovada', observacao: '',
  },
  {
    id: '4', tipo: 'recolhimento', tombamento: '2022.0112', descricaoBem: 'Microscópio binocular',
    setorOrigem: 'Bloco B — Laboratório 01', responsavelOrigem: 'Ana Lima',
    setorDestino: 'Almoxarifado Central', responsavelDestino: 'Ricardo Costa',
    dataSolicitacao: '2026-03-28', dataEfetivacao: null,
    motivo: 'Recolhimento para manutenção', status: 'rejeitada', observacao: 'Equipamento ainda em uso no laboratório',
  },
];

const statusConfig: Record<StatusMovimentacao, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: CheckCircle },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
  concluída: { label: 'Concluída', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
};

const tipoConfig: Record<TipoMovimentacao, string> = {
  transferência: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  cessão: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  devolução: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  recolhimento: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const EMPTY_FORM = {
  tipo: 'transferência' as TipoMovimentacao,
  tombamento: '',
  descricaoBem: '',
  setorOrigem: '',
  responsavelOrigem: '',
  setorDestino: '',
  responsavelDestino: '',
  motivo: '',
  observacao: '',
};

export default function MovimentacaoBens() {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(MOCK_MOVIMENTACOES);
  const [modalAberto, setModalAberto] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState<Movimentacao | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtradas = movimentacoes.filter(m => {
    const matchBusca = m.descricaoBem.toLowerCase().includes(busca.toLowerCase())
      || m.tombamento.includes(busca)
      || m.setorOrigem.toLowerCase().includes(busca.toLowerCase())
      || m.setorDestino.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    return matchBusca && matchStatus && matchTipo;
  });

  const totalPendentes = movimentacoes.filter(m => m.status === 'pendente').length;
  const totalAprovadas = movimentacoes.filter(m => m.status === 'aprovada').length;
  const totalConcluidas = movimentacoes.filter(m => m.status === 'concluída').length;

  const handleSelecionarBem = (tombamento: string) => {
    const bem = BENS_DISPONIVEIS.find(b => b.tombamento === tombamento);
    if (bem) {
      setForm(f => ({
        ...f,
        tombamento: bem.tombamento,
        descricaoBem: bem.descricao,
        setorOrigem: bem.setor,
        responsavelOrigem: bem.responsavel,
      }));
    }
  };

  const salvar = () => {
    if (!form.tombamento || !form.setorDestino || !form.responsavelDestino || !form.motivo) return;
    const nova: Movimentacao = {
      id: crypto.randomUUID(),
      ...form,
      dataSolicitacao: new Date().toISOString().split('T')[0],
      dataEfetivacao: null,
      status: 'pendente',
    };
    setMovimentacoes(prev => [nova, ...prev]);
    setModalAberto(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimentação de Bens</h1>
          <p className="text-sm text-muted-foreground">Transferências, cessões, devoluções e recolhimentos patrimoniais</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setModalAberto(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Movimentação
        </Button>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{movimentacoes.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-lg font-bold text-amber-400">{totalPendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Aprovadas</p>
          <p className="text-lg font-bold text-blue-400">{totalAprovadas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-lg font-bold text-emerald-400">{totalConcluidas}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por bem, tombamento ou setor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos os tipos</option>
          <option value="transferência">Transferência</option>
          <option value="cessão">Cessão</option>
          <option value="devolução">Devolução</option>
          <option value="recolhimento">Recolhimento</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="rejeitada">Rejeitada</option>
          <option value="concluída">Concluída</option>
        </select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Tombamento</th>
                  <th className="text-left p-3 font-medium">Bem</th>
                  <th className="text-center p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Origem → Destino</th>
                  <th className="text-center p-3 font-medium">Data</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(mov => {
                  const st = statusConfig[mov.status];
                  return (
                    <tr key={mov.id} className="border-b hover:bg-muted/30">
                      <td className="p-3"><Badge variant="outline" className="font-mono text-xs">{mov.tombamento}</Badge></td>
                      <td className="p-3 max-w-[180px] truncate">{mov.descricaoBem}</td>
                      <td className="p-3 text-center"><Badge className={`text-xs capitalize ${tipoConfig[mov.tipo]}`}>{mov.tipo}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="truncate max-w-[120px]">{mov.setorOrigem}</span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{mov.setorDestino}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-xs">{new Date(mov.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-xs ${st.color}`}>
                          <st.icon className="h-3 w-3 mr-1" />{st.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetalheAberto(mov)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma movimentação encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nova Movimentação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" /> Nova Movimentação
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoMovimentacao }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="transferência">Transferência</option>
                  <option value="cessão">Cessão</option>
                  <option value="devolução">Devolução</option>
                  <option value="recolhimento">Recolhimento</option>
                </select>
              </div>
              <div>
                <Label>Bem Patrimonial</Label>
                <select value={form.tombamento} onChange={e => handleSelecionarBem(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione o bem</option>
                  {BENS_DISPONIVEIS.map(b => (
                    <option key={b.tombamento} value={b.tombamento}>{b.tombamento} — {b.descricao}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.tombamento && (
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">Bem:</span> <strong>{form.descricaoBem}</strong></p>
                  <p><span className="text-muted-foreground">Setor atual:</span> {form.setorOrigem}</p>
                  <p><span className="text-muted-foreground">Responsável:</span> {form.responsavelOrigem}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Setor Destino</Label>
                <select value={form.setorDestino} onChange={e => setForm(f => ({ ...f, setorDestino: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>
                  {SETORES.filter(s => s !== form.setorOrigem).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Responsável Destino</Label>
                <select value={form.responsavelDestino} onChange={e => setForm(f => ({ ...f, responsavelDestino: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>
                  {RESPONSAVEIS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Motivo</Label>
              <Input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Motivo da movimentação" />
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais (opcional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar}>Solicitar Movimentação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={!!detalheAberto} onOpenChange={() => setDetalheAberto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Movimentação</DialogTitle>
          </DialogHeader>
          {detalheAberto && (() => {
            const st = statusConfig[detalheAberto.status];
            return (
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs capitalize ${tipoConfig[detalheAberto.tipo]}`}>{detalheAberto.tipo}</Badge>
                  <Badge className={`text-xs ${st.color}`}><st.icon className="h-3 w-3 mr-1" />{st.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Tombamento:</span><p className="font-semibold font-mono">{detalheAberto.tombamento}</p></div>
                  <div><span className="text-muted-foreground">Bem:</span><p className="font-semibold">{detalheAberto.descricaoBem}</p></div>
                </div>
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="font-medium text-xs">{detalheAberto.setorOrigem}</p>
                      <p className="text-xs text-muted-foreground">{detalheAberto.responsavelOrigem}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="font-medium text-xs">{detalheAberto.setorDestino}</p>
                      <p className="text-xs text-muted-foreground">{detalheAberto.responsavelDestino}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Solicitação:</span><p className="font-semibold">{new Date(detalheAberto.dataSolicitacao).toLocaleDateString('pt-BR')}</p></div>
                  <div><span className="text-muted-foreground">Efetivação:</span><p className="font-semibold">{detalheAberto.dataEfetivacao ? new Date(detalheAberto.dataEfetivacao).toLocaleDateString('pt-BR') : '—'}</p></div>
                </div>
                <div><span className="text-muted-foreground">Motivo:</span><p className="font-semibold">{detalheAberto.motivo}</p></div>
                {detalheAberto.observacao && (
                  <div><span className="text-muted-foreground">Observação:</span><p className="font-semibold">{detalheAberto.observacao}</p></div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
