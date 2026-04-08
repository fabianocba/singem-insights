import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { RotateCcw, TrendingDown, Search, History, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

type TipoOperacao = 'extorno' | 'baixa';
type MotivosBaixa = 'vencimento' | 'avaria' | 'perda' | 'roubo' | 'obsolescência' | 'outro';

interface OperacaoAdm {
  id: string;
  tipo: TipoOperacao;
  data: string;
  materialCodigo: string;
  materialDescricao: string;
  quantidade: number;
  motivo: string;
  responsavel: string;
  observacao: string;
}

const MOCK_HISTORICO: OperacaoAdm[] = [
  { id: 'op1', tipo: 'extorno', data: '2026-04-01', materialCodigo: '339030-07-001', materialDescricao: 'Papel A4 500fls', quantidade: 10, motivo: 'Saída indevida — setor errado', responsavel: 'Admin Almox', observacao: 'SM-2026-010 — material devolvido integralmente' },
  { id: 'op2', tipo: 'baixa', data: '2026-03-28', materialCodigo: '339030-04-001', materialDescricao: 'Luva de procedimento M', quantidade: 50, motivo: 'vencimento', responsavel: 'Admin Almox', observacao: 'Lote vencido em 15/03/2026' },
  { id: 'op3', tipo: 'baixa', data: '2026-03-15', materialCodigo: '339030-22-001', materialDescricao: 'Detergente neutro 500ml', quantidade: 5, motivo: 'avaria', responsavel: 'Admin Almox', observacao: 'Embalagens rompidas na entrega' },
  { id: 'op4', tipo: 'extorno', data: '2026-02-20', materialCodigo: '339030-17-001', materialDescricao: 'Toner HP 85A', quantidade: 2, motivo: 'Modelo incompatível devolvido', responsavel: 'Admin Almox', observacao: '' },
];

const MOTIVOS_BAIXA: { valor: MotivosBaixa; label: string }[] = [
  { valor: 'vencimento', label: 'Vencimento / Expiração' },
  { valor: 'avaria', label: 'Avaria / Dano' },
  { valor: 'perda', label: 'Perda / Extravio' },
  { valor: 'roubo', label: 'Roubo / Furto' },
  { valor: 'obsolescência', label: 'Obsolescência' },
  { valor: 'outro', label: 'Outro' },
];

export default function AdmAlmoxarifado() {
  const [dialogTipo, setDialogTipo] = useState<TipoOperacao | null>(null);
  const [historico, setHistorico] = useState<OperacaoAdm[]>(MOCK_HISTORICO);
  const [busca, setBusca] = useState('');

  // Form
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formQuantidade, setFormQuantidade] = useState<number>(0);
  const [formMotivo, setFormMotivo] = useState('');
  const [formObservacao, setFormObservacao] = useState('');

  const historicoFiltrado = historico.filter(op =>
    op.materialDescricao.toLowerCase().includes(busca.toLowerCase()) ||
    op.materialCodigo.includes(busca) ||
    op.motivo.toLowerCase().includes(busca.toLowerCase())
  );

  const totalExtornos = historico.filter(o => o.tipo === 'extorno').length;
  const totalBaixas = historico.filter(o => o.tipo === 'baixa').length;

  function abrirDialog(tipo: TipoOperacao) {
    setFormCodigo('');
    setFormDescricao('');
    setFormQuantidade(0);
    setFormMotivo('');
    setFormObservacao('');
    setDialogTipo(tipo);
  }

  function salvar() {
    if (!formCodigo || !formDescricao || formQuantidade <= 0 || !formMotivo) return;
    const novaOp: OperacaoAdm = {
      id: `op${Date.now()}`,
      tipo: dialogTipo!,
      data: new Date().toISOString().slice(0, 10),
      materialCodigo: formCodigo,
      materialDescricao: formDescricao,
      quantidade: formQuantidade,
      motivo: formMotivo,
      responsavel: 'Admin Almox',
      observacao: formObservacao,
    };
    setHistorico(prev => [novaOp, ...prev]);
    setDialogTipo(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ADM — Almoxarifado</h1>
        <p className="text-sm text-muted-foreground">Ajustes administrativos: extornos, baixas e correções de estoque</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Operações</p>
          <p className="text-2xl font-bold text-foreground">{historico.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Extornos</p>
          <p className="text-2xl font-bold text-warning">{totalExtornos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Baixas</p>
          <p className="text-2xl font-bold text-destructive">{totalBaixas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Este mês</p>
          <p className="text-2xl font-bold text-primary">{historico.filter(o => o.data >= '2026-04-01').length}</p>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-warning/30" onClick={() => abrirDialog('extorno')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-5 w-5 text-warning" />
              Extorno de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Reverter saída de material registrada indevidamente. Retorna a quantidade ao saldo do estoque.</p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); abrirDialog('extorno'); }}>
              <RotateCcw className="h-4 w-4 mr-1" />Realizar Extorno
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-destructive/30" onClick={() => abrirDialog('baixa')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Baixa de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Baixar material por perda, vencimento, avaria ou obsolescência. Remove definitivamente do saldo.</p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); abrirDialog('baixa'); }}>
              <TrendingDown className="h-4 w-4 mr-1" />Registrar Baixa
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />Histórico de Operações
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar operação..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Material</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Motivo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoFiltrado.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma operação encontrada</td></tr>
                  ) : historicoFiltrado.map(op => (
                    <tr key={op.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <Badge variant={op.tipo === 'extorno' ? 'secondary' : 'destructive'}>
                          {op.tipo === 'extorno' ? '↩ Extorno' : '↓ Baixa'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(op.data).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{op.materialDescricao}</p>
                        <p className="text-xs text-muted-foreground font-mono">{op.materialCodigo}</p>
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">{op.quantidade}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{op.motivo}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{op.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══ Dialog ══════════════════════════════════ */}
      <Dialog open={dialogTipo !== null} onOpenChange={() => setDialogTipo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogTipo === 'extorno' ? (
                <><RotateCcw className="h-5 w-5 text-warning" />Extorno de Material</>
              ) : (
                <><TrendingDown className="h-5 w-5 text-destructive" />Baixa de Material</>
              )}
            </DialogTitle>
          </DialogHeader>

          {dialogTipo === 'baixa' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-destructive">A baixa remove definitivamente o material do saldo. Esta operação não pode ser revertida automaticamente.</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div><Label>Código do Material *</Label><Input placeholder="339030-07-001" value={formCodigo} onChange={e => setFormCodigo(e.target.value)} /></div>
            <div><Label>Descrição *</Label><Input placeholder="Nome do material" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} /></div>
            <div><Label>Quantidade *</Label><Input type="number" min={1} value={formQuantidade || ''} onChange={e => setFormQuantidade(parseInt(e.target.value) || 0)} /></div>
            <div>
              <Label>Motivo *</Label>
              {dialogTipo === 'baixa' ? (
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formMotivo} onChange={e => setFormMotivo(e.target.value)}>
                  <option value="">Selecione o motivo</option>
                  {MOTIVOS_BAIXA.map(m => <option key={m.valor} value={m.label}>{m.label}</option>)}
                </select>
              ) : (
                <Input placeholder="Ex: Saída indevida, erro de registro..." value={formMotivo} onChange={e => setFormMotivo(e.target.value)} />
              )}
            </div>
            <div><Label>Observação</Label><Input placeholder="Detalhes adicionais..." value={formObservacao} onChange={e => setFormObservacao(e.target.value)} /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTipo(null)}>Cancelar</Button>
            <Button variant={dialogTipo === 'baixa' ? 'destructive' : 'default'} onClick={salvar} disabled={!formCodigo || !formDescricao || formQuantidade <= 0 || !formMotivo}>
              {dialogTipo === 'extorno' ? 'Confirmar Extorno' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
