import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Search, FileText, Eye, Edit2, Trash2, Filter } from "lucide-react";
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
type StatusEmpenho = 'ativo' | 'parcial' | 'liquidado' | 'cancelado';

interface ItemEmpenho {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  quantidadeEntregue: number;
  catmat?: string;
}

interface Empenho {
  id: string;
  numero: string;
  ano: number;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  valor: number;
  contaContabil: string;
  subElemento: string;
  status: StatusEmpenho;
  itens: ItemEmpenho[];
  dataCriacao: string;
  dataVencimento: string;
  observacao: string;
}

// ── Mock data ──────────────────────────────────────
const SUBELEMENTOS: Record<string, { codigo: string; descricao: string }[]> = {
  almoxarifado: [
    { codigo: '07', descricao: 'Material de Expediente' },
    { codigo: '17', descricao: 'Material de Processamento de Dados' },
    { codigo: '22', descricao: 'Material de Limpeza e Prod. Higienização' },
    { codigo: '25', descricao: 'Material p/ Manutenção de Bens Móveis' },
    { codigo: '21', descricao: 'Material de Copa e Cozinha' },
    { codigo: '04', descricao: 'Material Farmacológico' },
  ],
  patrimonio: [
    { codigo: '52', descricao: 'Equipamentos e Material Permanente' },
  ],
};

const CONTAS: Record<string, string> = {
  almoxarifado: '339030',
  patrimonio: '449052',
};

const MOCK_EMPENHOS: Empenho[] = [
  {
    id: '1', numero: '2026NE000045', ano: 2026, fornecedor: 'Distribuidora Alpha', cnpj: '12.345.678/0001-90',
    valor: 15000, status: 'ativo', objeto: 'Aquisição de material de escritório para atender demandas administrativas',
    contaContabil: '339030', subElemento: '07', dataCriacao: '2026-02-15', dataVencimento: '2026-12-31', observacao: '',
    itens: [
      { id: 'i1', descricao: 'Papel A4 500fls', unidade: 'Resma', quantidade: 200, valorUnitario: 25.00, quantidadeEntregue: 50, catmat: '339030-07-001' },
      { id: 'i2', descricao: 'Caneta esferográfica azul', unidade: 'Cx', quantidade: 100, valorUnitario: 18.00, quantidadeEntregue: 0, catmat: '339030-07-002' },
      { id: 'i3', descricao: 'Grampeador 26/6', unidade: 'Un', quantidade: 50, valorUnitario: 32.00, quantidadeEntregue: 50, catmat: '339030-07-003' },
    ],
  },
  {
    id: '2', numero: '2026NE000046', ano: 2026, fornecedor: 'Tech Supplies LTDA', cnpj: '98.765.432/0001-10',
    valor: 28500, status: 'parcial', objeto: 'Aquisição de suprimentos de informática',
    contaContabil: '339030', subElemento: '17', dataCriacao: '2026-03-01', dataVencimento: '2026-12-31', observacao: 'Entrega parcial realizada em 15/03',
    itens: [
      { id: 'i4', descricao: 'Toner HP 85A', unidade: 'Un', quantidade: 50, valorUnitario: 89.00, quantidadeEntregue: 20, catmat: '339030-17-001' },
      { id: 'i5', descricao: 'Mouse USB Logitech', unidade: 'Un', quantidade: 100, valorUnitario: 45.00, quantidadeEntregue: 100, catmat: '339030-17-002' },
      { id: 'i6', descricao: 'Teclado USB ABNT2', unidade: 'Un', quantidade: 100, valorUnitario: 62.00, quantidadeEntregue: 30, catmat: '339030-17-003' },
    ],
  },
  {
    id: '3', numero: '2026NE000047', ano: 2026, fornecedor: 'Papelaria Central', cnpj: '11.222.333/0001-44',
    valor: 5200, status: 'liquidado', objeto: 'Papéis e formulários diversos',
    contaContabil: '339030', subElemento: '07', dataCriacao: '2026-01-20', dataVencimento: '2026-06-30', observacao: 'Empenho totalmente liquidado',
    itens: [
      { id: 'i7', descricao: 'Papel ofício 500fls', unidade: 'Resma', quantidade: 100, valorUnitario: 28.00, quantidadeEntregue: 100, catmat: '339030-07-004' },
      { id: 'i8', descricao: 'Envelope A4 pardo', unidade: 'Cx', quantidade: 40, valorUnitario: 35.00, quantidadeEntregue: 40, catmat: '339030-07-005' },
    ],
  },
  {
    id: '4', numero: '2025NE000198', ano: 2025, fornecedor: 'Limpamais Produtos', cnpj: '33.444.555/0001-66',
    valor: 12800, status: 'cancelado', objeto: 'Material de limpeza e higienização',
    contaContabil: '339030', subElemento: '22', dataCriacao: '2025-08-10', dataVencimento: '2025-12-31', observacao: 'Cancelado por inexecução do fornecedor',
    itens: [
      { id: 'i9', descricao: 'Detergente neutro 500ml', unidade: 'Un', quantidade: 500, valorUnitario: 3.50, quantidadeEntregue: 0 },
    ],
  },
];

const statusVariant: Record<StatusEmpenho, string> = {
  ativo: 'default', parcial: 'secondary', liquidado: 'success', cancelado: 'destructive',
};

const statusLabel: Record<StatusEmpenho, string> = {
  ativo: 'Ativo', parcial: 'Parcial', liquidado: 'Liquidado', cancelado: 'Cancelado',
};

const moduloLabels: Record<string, string> = {
  almoxarifado: 'Almoxarifado', patrimonio: 'Patrimônio', transportes: 'Transportes', servicos: 'Serviços Gerais',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Empenhos({ modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [empenhos, setEmpenhos] = useState<Empenho[]>(MOCK_EMPENHOS);

  // Dialog states
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [detalhe, setDetalhe] = useState<Empenho | null>(null);
  const [form, setForm] = useState<Partial<Empenho>>({});
  const [formItens, setFormItens] = useState<Partial<ItemEmpenho>[]>([]);

  const conta = CONTAS[modulo] || '339030';
  const subElementos = SUBELEMENTOS[modulo] || SUBELEMENTOS.almoxarifado;

  const empenhosFiltrados = empenhos.filter(e => {
    const matchBusca = e.numero.toLowerCase().includes(busca.toLowerCase()) ||
      e.fornecedor.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca);
    const matchStatus = filtroStatus === 'todos' || e.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // Totalizadores
  const totalEmpenhado = empenhos.filter(e => e.status !== 'cancelado').reduce((s, e) => s + e.valor, 0);
  const totalLiquidado = empenhos.filter(e => e.status === 'liquidado').reduce((s, e) => s + e.valor, 0);
  const emAtivos = empenhos.filter(e => e.status === 'ativo' || e.status === 'parcial').length;

  // CRUD
  function abrirNovo() {
    setForm({ ano: 2026, contaContabil: conta, status: 'ativo', subElemento: subElementos[0]?.codigo });
    setFormItens([{ id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0, quantidadeEntregue: 0 }]);
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function abrirDetalhe(emp: Empenho) {
    setDetalhe(emp);
    setEditando(false);
    setDialogAberto(true);
  }

  function abrirEditar(emp: Empenho) {
    setForm({ ...emp });
    setFormItens([...emp.itens]);
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function adicionarItem() {
    setFormItens(prev => [...prev, { id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0, quantidadeEntregue: 0 }]);
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
    const novoEmpenho: Empenho = {
      ...form,
      id: form.id || `e${Date.now()}`,
      valor: valorTotal,
      itens: formItens as ItemEmpenho[],
      dataCriacao: form.dataCriacao || new Date().toISOString().slice(0, 10),
    } as Empenho;

    if (form.id) {
      setEmpenhos(prev => prev.map(e => e.id === form.id ? novoEmpenho : e));
    } else {
      setEmpenhos(prev => [novoEmpenho, ...prev]);
    }
    setDialogAberto(false);
  }

  function excluir(id: string) {
    setEmpenhos(prev => prev.filter(e => e.id !== id));
  }

  // Calcula progresso de entrega
  function progressoEntrega(emp: Empenho) {
    const totalQtd = emp.itens.reduce((s, it) => s + it.quantidade, 0);
    const totalEntregue = emp.itens.reduce((s, it) => s + it.quantidadeEntregue, 0);
    return totalQtd > 0 ? Math.round((totalEntregue / totalQtd) * 100) : 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empenhos</h1>
          <p className="text-sm text-muted-foreground">{moduloLabels[modulo]} — Conta {conta}</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo Empenho</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Empenhos</p>
          <p className="text-2xl font-bold text-foreground">{empenhos.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ativos / Parciais</p>
          <p className="text-2xl font-bold text-primary">{emAtivos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Valor Empenhado</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalEmpenhado)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Valor Liquidado</p>
          <p className="text-lg font-bold text-success">{fmt(totalLiquidado)}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar NE, fornecedor, CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="parcial">Parcial</option>
            <option value="liquidado">Liquidado</option>
            <option value="cancelado">Cancelado</option>
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
                  <th className="text-left p-3 font-medium text-muted-foreground">Nº Empenho</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Sub. Elem.</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Entrega</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {empenhosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum empenho encontrado</td></tr>
                ) : empenhosFiltrados.map(emp => {
                  const progresso = progressoEntrega(emp);
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="font-mono font-semibold text-foreground">{emp.numero}</p>
                            <p className="text-xs text-muted-foreground">{emp.ano}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{emp.fornecedor}</p>
                        <p className="text-xs text-muted-foreground">{emp.cnpj}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-xs">{emp.subElemento}</Badge>
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">{fmt(emp.valor)}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${progresso === 100 ? 'bg-success' : progresso > 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} style={{ width: `${progresso}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{progresso}%</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant={statusVariant[emp.status] as any}>{statusLabel[emp.status]}</Badge></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirDetalhe(emp)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(emp)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
                          {emp.status === 'cancelado' && (
                            <Button variant="ghost" size="icon" onClick={() => excluir(emp.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <DialogTitle>{form.id ? "Editar Empenho" : "Novo Empenho"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div><Label>Nº Empenho *</Label><Input placeholder="2026NE000000" value={form.numero || ''} onChange={e => setForm(p => ({ ...p, numero: e.target.value.toUpperCase() }))} /></div>
                <div><Label>Ano</Label><Input type="number" value={form.ano || ''} onChange={e => setForm(p => ({ ...p, ano: parseInt(e.target.value) }))} /></div>
                <div><Label>Fornecedor *</Label><Input value={form.fornecedor || ''} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
                <div><Label>CNPJ *</Label><Input placeholder="00.000.000/0000-00" value={form.cnpj || ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Objeto</Label><Input value={form.objeto || ''} onChange={e => setForm(p => ({ ...p, objeto: e.target.value }))} /></div>
                <div>
                  <Label>Subelemento</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.subElemento || ''} onChange={e => setForm(p => ({ ...p, subElemento: e.target.value }))}>
                    {subElementos.map(s => <option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.status || 'ativo'} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusEmpenho }))}>
                    <option value="ativo">Ativo</option>
                    <option value="parcial">Parcial</option>
                    <option value="liquidado">Liquidado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div><Label>Data Vencimento</Label><Input type="date" value={form.dataVencimento || ''} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Observação</Label><Input value={form.observacao || ''} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} /></div>
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Itens do Empenho</Label>
                  <Button size="sm" variant="outline" onClick={adicionarItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
                </div>
                <div className="space-y-3">
                  {formItens.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-md">
                      <div className="col-span-12 md:col-span-4"><Label className="text-xs">Descrição</Label><Input value={item.descricao || ''} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-2"><Label className="text-xs">Unidade</Label><Input value={item.unidade || ''} onChange={e => atualizarItem(idx, 'unidade', e.target.value)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-2"><Label className="text-xs">Qtd</Label><Input type="number" value={item.quantidade || ''} onChange={e => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 0)} className="h-9 text-sm" /></div>
                      <div className="col-span-4 md:col-span-3"><Label className="text-xs">Vlr Unitário</Label><Input type="number" step="0.01" value={item.valorUnitario || ''} onChange={e => atualizarItem(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className="h-9 text-sm" /></div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removerItem(idx)} className="h-9 w-9"><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
                <Button onClick={salvar}>Salvar Empenho</Button>
              </DialogFooter>
            </>
          ) : detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />{detalhe.numero}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
                <div><span className="text-muted-foreground">Fornecedor:</span><p className="font-medium text-foreground">{detalhe.fornecedor}</p></div>
                <div><span className="text-muted-foreground">CNPJ:</span><p className="font-mono font-medium text-foreground">{detalhe.cnpj}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Objeto:</span><p className="font-medium text-foreground">{detalhe.objeto}</p></div>
                <div><span className="text-muted-foreground">Conta Contábil:</span><p className="font-mono font-medium text-foreground">{detalhe.contaContabil}</p></div>
                <div><span className="text-muted-foreground">Subelemento:</span><p className="font-medium text-foreground">{detalhe.subElemento} — {subElementos.find(s => s.codigo === detalhe.subElemento)?.descricao}</p></div>
                <div><span className="text-muted-foreground">Valor Total:</span><p className="font-bold text-foreground">{fmt(detalhe.valor)}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusVariant[detalhe.status] as any}>{statusLabel[detalhe.status]}</Badge></p></div>
                <div><span className="text-muted-foreground">Criação:</span><p className="text-foreground">{new Date(detalhe.dataCriacao).toLocaleDateString('pt-BR')}</p></div>
                <div><span className="text-muted-foreground">Vencimento:</span><p className="text-foreground">{detalhe.dataVencimento ? new Date(detalhe.dataVencimento).toLocaleDateString('pt-BR') : '—'}</p></div>
                {detalhe.observacao && <div className="col-span-2"><span className="text-muted-foreground">Observação:</span><p className="text-foreground">{detalhe.observacao}</p></div>}
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Itens ({detalhe.itens.length})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2 text-muted-foreground font-medium">Descrição</th>
                        <th className="text-center p-2 text-muted-foreground font-medium">Un</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Qtd</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Entregue</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Vlr Unit.</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhe.itens.map(it => (
                        <tr key={it.id} className="border-b last:border-0">
                          <td className="p-2 text-foreground">{it.descricao}{it.catmat && <span className="text-xs text-muted-foreground ml-1">({it.catmat})</span>}</td>
                          <td className="p-2 text-center text-muted-foreground">{it.unidade}</td>
                          <td className="p-2 text-right text-foreground">{it.quantidade}</td>
                          <td className="p-2 text-right">
                            <span className={it.quantidadeEntregue >= it.quantidade ? 'text-success' : it.quantidadeEntregue > 0 ? 'text-warning' : 'text-muted-foreground'}>
                              {it.quantidadeEntregue}
                            </span>
                          </td>
                          <td className="p-2 text-right text-foreground">{fmt(it.valorUnitario)}</td>
                          <td className="p-2 text-right font-medium text-foreground">{fmt(it.quantidade * it.valorUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter>
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
