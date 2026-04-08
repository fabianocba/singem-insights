import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Search, ClipboardList, Package, Landmark, Trash2, Calendar, User, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { useNotificacoes } from "../contexts/NotificacoesContext";
import { useSolicitacoes } from "../contexts/SolicitacoesContext";
import type { ModuloId } from "../types";
import type { ItemSolicitacao, TipoSolicitacao } from "../contexts/SolicitacoesContext";

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-500/20 text-slate-400',
  enviada: 'bg-blue-500/20 text-blue-400',
  aprovada: 'bg-emerald-500/20 text-emerald-400',
  rejeitada: 'bg-red-500/20 text-red-400',
  atendida: 'bg-purple-500/20 text-purple-400',
  parcial: 'bg-amber-500/20 text-amber-400',
};
const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aprovada: 'Aprovada', rejeitada: 'Rejeitada', atendida: 'Atendida', parcial: 'Parcial',
};

const SETORES = ['Coordenação de TI', 'Lab. Química', 'Lab. Informática', 'Lab. Ciências', 'Biblioteca', 'Direção', 'Coordenação', 'CGAE', 'Refeitório', 'Administração'];

export default function SolicitacaoMaterial({ modulo }: { modulo: ModuloId }) {
  const isAlmox = modulo === 'almoxarifado';
  const tipo: TipoSolicitacao = modulo as TipoSolicitacao;
  const prefix = isAlmox ? 'SM' : 'SB';
  const titulo = isAlmox ? 'SM Almoxarifado' : 'SB Patrimônio';
  const setorGestor = isAlmox ? 'Almoxarifado' : 'Patrimônio';

  const { getPorTipo, adicionar, enviar: enviarSol } = useSolicitacoes();
  const { adicionarNotificacao } = useNotificacoes();

  const solicitacoes = getPorTipo(tipo);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalNova, setModalNova] = useState(false);
  const [detalhes, setDetalhes] = useState<string | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  const [form, setForm] = useState({ solicitante: '', setor: '', justificativa: '', observacao: '' });
  const [itensForm, setItensForm] = useState<ItemSolicitacao[]>([{ id: '1', codigo: '', descricao: '', unidade: 'Un', quantidade: 1 }]);

  const detalheSol = solicitacoes.find(s => s.id === detalhes) || null;

  const filtrados = solicitacoes.filter(s => {
    const buscaOk = s.numero.toLowerCase().includes(busca.toLowerCase()) || s.solicitante.toLowerCase().includes(busca.toLowerCase()) || s.setor.toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === 'todos' || s.status === filtroStatus;
    return buscaOk && statusOk;
  });

  const handleAddItem = () => {
    setItensForm([...itensForm, { id: String(Date.now()), codigo: '', descricao: '', unidade: 'Un', quantidade: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (itensForm.length <= 1) return;
    setItensForm(itensForm.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemSolicitacao, value: string | number) => {
    setItensForm(itensForm.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSalvar = (enviar: boolean) => {
    if (!form.solicitante || !form.setor || itensForm.some(i => !i.descricao)) return;
    const nova = adicionar({
      tipo,
      solicitante: form.solicitante,
      setor: form.setor,
      justificativa: form.justificativa,
      observacao: form.observacao,
      status: enviar ? 'enviada' : 'rascunho',
      itens: itensForm,
    });
    setForm({ solicitante: '', setor: '', justificativa: '', observacao: '' });
    setItensForm([{ id: '1', codigo: '', descricao: '', unidade: 'Un', quantidade: 1 }]);
    setModalNova(false);

    if (enviar) {
      toast.success(`${nova.numero} enviada para ${setorGestor}`);
      adicionarNotificacao({
        tipo: isAlmox ? 'sm_almox' : 'sb_patrim',
        titulo: `${nova.numero} Enviada`,
        mensagem: `Sua solicitação foi enviada ao setor de ${setorGestor} para análise.`,
        link: isAlmox ? '/solicitacoes/almoxarifado' : '/solicitacoes/patrimonio',
      });
    } else {
      toast.info(`${nova.numero} salva como rascunho`);
    }
  };

  const handleEnviar = (id: string) => {
    const sol = solicitacoes.find(s => s.id === id);
    enviarSol(id);
    if (sol) {
      toast.success(`${sol.numero} enviada para ${setorGestor}`);
      adicionarNotificacao({
        tipo: isAlmox ? 'sm_almox' : 'sb_patrim',
        titulo: `${sol.numero} Enviada`,
        mensagem: `Sua solicitação foi enviada ao setor de ${setorGestor} para análise.`,
        link: isAlmox ? '/solicitacoes/almoxarifado' : '/solicitacoes/patrimonio',
      });
    }
  };

  const contadores = {
    total: solicitacoes.length,
    rascunho: solicitacoes.filter(s => s.status === 'rascunho').length,
    enviadas: solicitacoes.filter(s => s.status === 'enviada').length,
    aprovadas: solicitacoes.filter(s => s.status === 'aprovada').length,
    atendidas: solicitacoes.filter(s => s.status === 'atendida').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">Solicitar materiais para o setor de {setorGestor}</p>
        </div>
        <Button onClick={() => setModalNova(true)}><Plus className="h-4 w-4 mr-2" /> Nova {prefix}</Button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: contadores.total, cls: 'text-foreground' },
          { label: 'Rascunho', value: contadores.rascunho, cls: 'text-slate-400' },
          { label: 'Enviadas', value: contadores.enviadas, cls: 'text-blue-400' },
          { label: 'Aprovadas', value: contadores.aprovadas, cls: 'text-emerald-400' },
          { label: 'Atendidas', value: contadores.atendidas, cls: 'text-purple-400' },
        ].map(c => (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
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

      {/* Lista */}
      <div className="grid gap-3">
        {filtrados.map(s => (
          <Card key={s.id} className="border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => { setDetalhes(s.id); setModalDetalhes(true); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${isAlmox ? 'bg-emerald-500/10' : 'bg-blue-500/10'} flex items-center justify-center`}>
                    {isAlmox ? <Package className="h-5 w-5 text-emerald-400" /> : <Landmark className="h-5 w-5 text-blue-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{s.numero}</span>
                      <span className="text-xs text-muted-foreground">· {s.itens.length} {s.itens.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <p className="font-semibold text-sm">{s.justificativa || 'Sem justificativa'}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.solicitante}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.setor}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.data}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">→ {setorGestor}</span>
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

      {/* Modal Nova Solicitação */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova {titulo}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Solicitante *" value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} />
              <Select value={form.setor} onValueChange={(v: string) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Setor *" /></SelectTrigger>
                <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Justificativa *" value={form.justificativa} onChange={e => setForm({ ...form, justificativa: e.target.value })} />
            <Input placeholder="Observação (opcional)" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Itens da Solicitação</h4>
                <Button size="sm" variant="outline" onClick={handleAddItem}><Plus className="h-3 w-3 mr-1" /> Item</Button>
              </div>
              <div className="space-y-2">
                {itensForm.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <Input placeholder="Código" value={item.codigo || ''} onChange={e => handleItemChange(item.id, 'codigo', e.target.value)} className="w-24" />
                    <Input placeholder="Descrição do item *" value={item.descricao} onChange={e => handleItemChange(item.id, 'descricao', e.target.value)} className="flex-1" />
                    <Input placeholder="Un" value={item.unidade} onChange={e => handleItemChange(item.id, 'unidade', e.target.value)} className="w-16" />
                    <Input type="number" placeholder="Qtd" value={item.quantidade} onChange={e => handleItemChange(item.id, 'quantidade', Number(e.target.value))} className="w-20" />
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)} disabled={itensForm.length <= 1}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
              <p><strong>Fluxo:</strong> Ao enviar, a solicitação será encaminhada ao setor de <strong>{setorGestor}</strong> para análise e aprovação. Você poderá acompanhar o status por aqui.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => handleSalvar(false)} disabled={!form.solicitante || !form.setor || itensForm.some(i => !i.descricao)}>
              <ClipboardList className="h-4 w-4 mr-1" /> Salvar Rascunho
            </Button>
            <Button onClick={() => handleSalvar(true)} disabled={!form.solicitante || !form.setor || !form.justificativa || itensForm.some(i => !i.descricao)}>
              <Send className="h-4 w-4 mr-1" /> Enviar para {setorGestor}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detalheSol && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {isAlmox ? <Package className="h-5 w-5 text-emerald-400" /> : <Landmark className="h-5 w-5 text-blue-400" />}
                  {detalheSol.numero}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detalheSol.status]}`}>{statusLabels[detalheSol.status]}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Solicitante:</span> <span className="font-medium">{detalheSol.solicitante}</span></div>
                  <div><span className="text-muted-foreground">Setor:</span> <span className="font-medium">{detalheSol.setor}</span></div>
                  <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{detalheSol.data}</span></div>
                  <div><span className="text-muted-foreground">Destino:</span> <span className="font-medium">{setorGestor}</span></div>
                  {detalheSol.aprovadoPor && <div><span className="text-muted-foreground">Aprovado por:</span> <span className="font-medium">{detalheSol.aprovadoPor}</span></div>}
                  {detalheSol.dataAprovacao && <div><span className="text-muted-foreground">Data aprovação:</span> <span className="font-medium">{detalheSol.dataAprovacao}</span></div>}
                </div>

                {detalheSol.justificativa && (
                  <div className="text-sm"><span className="text-muted-foreground">Justificativa:</span> <p className="mt-1">{detalheSol.justificativa}</p></div>
                )}
                {detalheSol.observacao && (
                  <div className="text-sm"><span className="text-muted-foreground">Observação:</span> <p className="mt-1">{detalheSol.observacao}</p></div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Itens ({detalheSol.itens.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-1 px-2 text-muted-foreground font-medium text-xs">#</th>
                          <th className="text-left py-1 px-2 text-muted-foreground font-medium text-xs">Código</th>
                          <th className="text-left py-1 px-2 text-muted-foreground font-medium text-xs">Descrição</th>
                          <th className="text-right py-1 px-2 text-muted-foreground font-medium text-xs">Qtd</th>
                          <th className="text-left py-1 px-2 text-muted-foreground font-medium text-xs">Un</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalheSol.itens.map((item, idx) => (
                          <tr key={item.id} className="border-b border-border/30">
                            <td className="py-1 px-2 text-muted-foreground">{idx + 1}</td>
                            <td className="py-1 px-2 font-mono text-xs">{item.codigo || '—'}</td>
                            <td className="py-1 px-2">{item.descricao}</td>
                            <td className="py-1 px-2 text-right font-medium">{item.quantidade}</td>
                            <td className="py-1 px-2 text-muted-foreground">{item.unidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Fluxo de aprovação</p>
                  <div className="flex items-center gap-2">
                    <span className={detalheSol.status !== 'rascunho' ? 'text-emerald-400' : ''}>Criada</span>
                    <span>→</span>
                    <span className={['enviada','aprovada','atendida'].includes(detalheSol.status) ? 'text-emerald-400' : ''}>Enviada ao {setorGestor}</span>
                    <span>→</span>
                    <span className={['aprovada','atendida'].includes(detalheSol.status) ? 'text-emerald-400' : detalheSol.status === 'rejeitada' ? 'text-red-400' : ''}>
                      {detalheSol.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada'}
                    </span>
                    <span>→</span>
                    <span className={detalheSol.status === 'atendida' ? 'text-emerald-400' : ''}>Atendida</span>
                  </div>
                </div>

                {detalheSol.status === 'rascunho' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEnviar(detalheSol.id)}>
                      <Send className="h-3 w-3 mr-1" /> Enviar para {setorGestor}
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
