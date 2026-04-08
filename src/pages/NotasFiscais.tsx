import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Search, Receipt, Eye, Edit2, Check, X, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import type { ModuloId } from "../types";

// ── Types ──────────────────────────────────────────
type StatusNF = 'pendente' | 'vinculada' | 'aceita' | 'rejeitada';

interface ItemNF {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

interface NotaFiscal {
  id: string;
  numero: string;
  serie: string;
  fornecedor: string;
  cnpj: string;
  empenhoNumero: string;
  valor: number;
  dataEmissao: string;
  dataEntrada: string;
  chaveNFe: string;
  status: StatusNF;
  itens: ItemNF[];
  observacao: string;
}

// ── Mock data ──────────────────────────────────────
const MOCK_NFS: NotaFiscal[] = [
  {
    id: '1', numero: '001234', serie: '1', fornecedor: 'Distribuidora Alpha', cnpj: '12.345.678/0001-90',
    empenhoNumero: '2026NE000045', valor: 7500, dataEmissao: '2026-03-10', dataEntrada: '2026-03-15',
    chaveNFe: '29260612345678000190550010012340001001234560', status: 'aceita', observacao: 'Entrega parcial',
    itens: [
      { id: 'n1', descricao: 'Papel A4 500fls', unidade: 'Resma', quantidade: 50, valorUnitario: 25.00 },
      { id: 'n2', descricao: 'Grampeador 26/6', unidade: 'Un', quantidade: 50, valorUnitario: 32.00 },
      { id: 'n3', descricao: 'Clips niquelado cx', unidade: 'Cx', quantidade: 100, valorUnitario: 4.50 },
    ],
  },
  {
    id: '2', numero: '005678', serie: '1', fornecedor: 'Tech Supplies LTDA', cnpj: '98.765.432/0001-10',
    empenhoNumero: '2026NE000046', valor: 14000, dataEmissao: '2026-03-20', dataEntrada: '',
    chaveNFe: '29260698765432000110550010056780001005678900', status: 'pendente', observacao: '',
    itens: [
      { id: 'n4', descricao: 'Toner HP 85A', unidade: 'Un', quantidade: 20, valorUnitario: 89.00 },
      { id: 'n5', descricao: 'Mouse USB Logitech', unidade: 'Un', quantidade: 100, valorUnitario: 45.00 },
      { id: 'n6', descricao: 'Teclado USB ABNT2', unidade: 'Un', quantidade: 30, valorUnitario: 62.00 },
    ],
  },
  {
    id: '3', numero: '009012', serie: '1', fornecedor: 'Papelaria Central', cnpj: '11.222.333/0001-44',
    empenhoNumero: '2026NE000047', valor: 4200, dataEmissao: '2026-02-28', dataEntrada: '2026-03-02',
    chaveNFe: '29260611222333000144550010090120001009012340', status: 'aceita', observacao: '',
    itens: [
      { id: 'n7', descricao: 'Papel ofício 500fls', unidade: 'Resma', quantidade: 100, valorUnitario: 28.00 },
      { id: 'n8', descricao: 'Envelope A4 pardo', unidade: 'Cx', quantidade: 40, valorUnitario: 35.00 },
    ],
  },
  {
    id: '4', numero: '003456', serie: '2', fornecedor: 'Tech Supplies LTDA', cnpj: '98.765.432/0001-10',
    empenhoNumero: '2026NE000046', valor: 8500, dataEmissao: '2026-04-01', dataEntrada: '2026-04-05',
    chaveNFe: '29260698765432000110550020034560001003456780', status: 'vinculada', observacao: 'Aguardando conferência física',
    itens: [
      { id: 'n9', descricao: 'Teclado USB ABNT2', unidade: 'Un', quantidade: 70, valorUnitario: 62.00 },
      { id: 'n10', descricao: 'Hub USB 4 portas', unidade: 'Un', quantidade: 50, valorUnitario: 45.00 },
    ],
  },
];

const statusVariant: Record<StatusNF, string> = {
  pendente: 'warning', vinculada: 'secondary', aceita: 'success', rejeitada: 'destructive',
};
const statusLabel: Record<StatusNF, string> = {
  pendente: 'Pendente', vinculada: 'Vinculada', aceita: 'Aceita', rejeitada: 'Rejeitada',
};

const moduloLabels: Record<string, string> = {
  almoxarifado: 'Almoxarifado', patrimonio: 'Patrimônio', servicos: 'Serviços Gerais',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function NotasFiscais({ modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [nfs, setNfs] = useState<NotaFiscal[]>(MOCK_NFS);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [detalhe, setDetalhe] = useState<NotaFiscal | null>(null);
  const [form, setForm] = useState<Partial<NotaFiscal>>({});
  const [formItens, setFormItens] = useState<Partial<ItemNF>[]>([]);

  const nfsFiltradas = nfs.filter(nf => {
    const matchBusca = nf.numero.includes(busca) || nf.fornecedor.toLowerCase().includes(busca.toLowerCase()) || nf.empenhoNumero.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || nf.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // KPIs
  const totalNFs = nfs.length;
  const pendentes = nfs.filter(n => n.status === 'pendente').length;
  const aceitas = nfs.filter(n => n.status === 'aceita').length;
  const valorTotal = nfs.filter(n => n.status === 'aceita').reduce((s, n) => s + n.valor, 0);

  // CRUD
  function abrirNova() {
    setForm({ status: 'pendente', serie: '1' });
    setFormItens([{ id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0 }]);
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function abrirDetalhe(nf: NotaFiscal) {
    setDetalhe(nf);
    setEditando(false);
    setDialogAberto(true);
  }

  function abrirEditar(nf: NotaFiscal) {
    setForm({ ...nf });
    setFormItens([...nf.itens]);
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function adicionarItem() {
    setFormItens(prev => [...prev, { id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0 }]);
  }

  function removerItem(idx: number) {
    setFormItens(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarItem(idx: number, campo: string, valor: string | number) {
    setFormItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  }

  function salvar() {
    if (!form.numero || !form.fornecedor || !form.cnpj) return;
    const valorTotal = formItens.reduce((s, it) => s + (it.quantidade || 0) * (it.valorUnitario || 0), 0);
    const novaNF: NotaFiscal = {
      ...form,
      id: form.id || `nf${Date.now()}`,
      valor: valorTotal,
      itens: formItens as ItemNF[],
    } as NotaFiscal;

    if (form.id) {
      setNfs(prev => prev.map(n => n.id === form.id ? novaNF : n));
    } else {
      setNfs(prev => [novaNF, ...prev]);
    }
    setDialogAberto(false);
  }

  function aceitarNF(id: string) {
    setNfs(prev => prev.map(n => n.id === id ? { ...n, status: 'aceita' as StatusNF, dataEntrada: new Date().toISOString().slice(0, 10) } : n));
    setDialogAberto(false);
  }

  function rejeitarNF(id: string) {
    setNfs(prev => prev.map(n => n.id === id ? { ...n, status: 'rejeitada' as StatusNF } : n));
    setDialogAberto(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">{moduloLabels[modulo]}</p>
        </div>
        <Button onClick={abrirNova}><Plus className="h-4 w-4 mr-2" />Registrar NF</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total NFs</p>
          <p className="text-2xl font-bold text-foreground">{totalNFs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-warning">{pendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Aceitas</p>
          <p className="text-2xl font-bold text-success">{aceitas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Valor Aceito</p>
          <p className="text-lg font-bold text-foreground">{fmt(valorTotal)}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar NF, fornecedor, empenho..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="vinculada">Vinculada</option>
            <option value="aceita">Aceita</option>
            <option value="rejeitada">Rejeitada</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">NF</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Empenho</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Emissão</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {nfsFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma nota fiscal encontrada</td></tr>
                ) : nfsFiltradas.map(nf => (
                  <tr key={nf.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-accent shrink-0" />
                        <div>
                          <p className="font-mono font-semibold text-foreground">NF {nf.numero}</p>
                          <p className="text-xs text-muted-foreground">Série {nf.serie}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{nf.fornecedor}</p>
                      <p className="text-xs text-muted-foreground">{nf.cnpj}</p>
                    </td>
                    <td className="p-3 hidden md:table-cell font-mono text-muted-foreground text-xs">{nf.empenhoNumero}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{new Date(nf.dataEmissao).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-right font-medium text-foreground">{fmt(nf.valor)}</td>
                    <td className="p-3"><Badge variant={statusVariant[nf.status] as any}>{statusLabel[nf.status]}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirDetalhe(nf)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(nf)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ══ Dialog ══════════════════════════════════ */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editando ? (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Nota Fiscal" : "Registrar Nota Fiscal"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div><Label>Nº NF *</Label><Input value={form.numero || ''} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} /></div>
                <div><Label>Série</Label><Input value={form.serie || ''} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))} /></div>
                <div><Label>Fornecedor *</Label><Input value={form.fornecedor || ''} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
                <div><Label>CNPJ *</Label><Input value={form.cnpj || ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
                <div><Label>Nº Empenho Vinculado</Label><Input value={form.empenhoNumero || ''} onChange={e => setForm(p => ({ ...p, empenhoNumero: e.target.value }))} placeholder="2026NE000000" /></div>
                <div><Label>Data Emissão</Label><Input type="date" value={form.dataEmissao || ''} onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Chave NFe</Label><Input value={form.chaveNFe || ''} onChange={e => setForm(p => ({ ...p, chaveNFe: e.target.value }))} placeholder="44 dígitos" maxLength={44} /></div>
                <div className="md:col-span-2"><Label>Observação</Label><Input value={form.observacao || ''} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} /></div>
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Itens da NF</Label>
                  <Button size="sm" variant="outline" onClick={adicionarItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
                </div>
                <div className="space-y-3">
                  {formItens.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-md">
                      <div className="col-span-12 md:col-span-5"><Label className="text-xs">Descrição</Label><Input value={item.descricao || ''} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-2"><Label className="text-xs">Unidade</Label><Input value={item.unidade || ''} onChange={e => atualizarItem(idx, 'unidade', e.target.value)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-2"><Label className="text-xs">Qtd</Label><Input type="number" value={item.quantidade || ''} onChange={e => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 0)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-2"><Label className="text-xs">Vlr Unit.</Label><Input type="number" step="0.01" value={item.valorUnitario || ''} onChange={e => atualizarItem(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className="h-9 text-sm" /></div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removerItem(idx)} className="h-9 w-9"><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-right text-sm font-semibold mt-3 text-foreground">
                  Total: {fmt(formItens.reduce((s, it) => s + (it.quantidade || 0) * (it.valorUnitario || 0), 0))}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button onClick={salvar}>Salvar NF</Button>
              </DialogFooter>
            </>
          ) : detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-accent" />NF {detalhe.numero} — Série {detalhe.serie}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
                <div><span className="text-muted-foreground">Fornecedor:</span><p className="font-medium text-foreground">{detalhe.fornecedor}</p></div>
                <div><span className="text-muted-foreground">CNPJ:</span><p className="font-mono font-medium text-foreground">{detalhe.cnpj}</p></div>
                <div><span className="text-muted-foreground">Empenho:</span><p className="font-mono font-medium text-foreground">{detalhe.empenhoNumero}</p></div>
                <div><span className="text-muted-foreground">Valor Total:</span><p className="font-bold text-foreground">{fmt(detalhe.valor)}</p></div>
                <div><span className="text-muted-foreground">Data Emissão:</span><p className="text-foreground">{new Date(detalhe.dataEmissao).toLocaleDateString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Data Entrada:</span><p className="text-foreground">{detalhe.dataEntrada ? new Date(detalhe.dataEntrada).toLocaleDateString('pt-BR') : '—'}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Chave NFe:</span><p className="font-mono text-xs text-foreground break-all">{detalhe.chaveNFe || '—'}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusVariant[detalhe.status] as any}>{statusLabel[detalhe.status]}</Badge></p></div>
                {detalhe.observacao && <div><span className="text-muted-foreground">Observação:</span><p className="text-foreground">{detalhe.observacao}</p></div>}
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Itens ({detalhe.itens.length})</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-muted-foreground font-medium">Descrição</th>
                      <th className="text-center p-2 text-muted-foreground font-medium">Un</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">Qtd</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">Vlr Unit.</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhe.itens.map(it => (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="p-2 text-foreground">{it.descricao}</td>
                        <td className="p-2 text-center text-muted-foreground">{it.unidade}</td>
                        <td className="p-2 text-right text-foreground">{it.quantidade}</td>
                        <td className="p-2 text-right text-foreground">{fmt(it.valorUnitario)}</td>
                        <td className="p-2 text-right font-medium text-foreground">{fmt(it.quantidade * it.valorUnitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ações de aceite */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {(detalhe.status === 'pendente' || detalhe.status === 'vinculada') && (
                  <>
                    <Button variant="destructive" onClick={() => rejeitarNF(detalhe.id)}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                    <Button variant="default" onClick={() => aceitarNF(detalhe.id)}><Check className="h-4 w-4 mr-1" />Aceitar e Dar Entrada</Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Fechar</Button>
                <Button onClick={() => abrirEditar(detalhe)}>Editar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
