import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Search, Plus, BookOpen, QrCode, Eye, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

interface Material {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  subElemento: string;
  variacao: string;
  catmat: string;
  saldo: number;
  valorMedio: number;
  localizacao: string;
  estoqueMinimo: number;
  ativo: boolean;
}

const SUB_ELEMENTOS = [
  { codigo: '07', descricao: 'Material de Expediente' },
  { codigo: '17', descricao: 'Material de Processamento de Dados' },
  { codigo: '22', descricao: 'Material de Limpeza e Prod. Higienização' },
  { codigo: '25', descricao: 'Material p/ Manutenção de Bens Móveis' },
  { codigo: '21', descricao: 'Material de Copa e Cozinha' },
  { codigo: '04', descricao: 'Material Farmacológico' },
];

const UNIDADES = ['Un', 'Resma', 'Cx', 'Pct', 'L', 'Kg', 'M', 'Rolo', 'Gl', 'Fr'];

const MOCK_MATERIAIS: Material[] = [
  { id: '1', codigo: '339030-07-001', descricao: 'Papel A4 500fls', unidade: 'Resma', subElemento: '07', variacao: '001', catmat: '44240', saldo: 120, valorMedio: 22.50, localizacao: 'Prateleira A-01', estoqueMinimo: 50, ativo: true },
  { id: '2', codigo: '339030-07-002', descricao: 'Caneta esferográfica azul', unidade: 'Un', subElemento: '07', variacao: '002', catmat: '27995', saldo: 550, valorMedio: 1.80, localizacao: 'Prateleira A-02', estoqueMinimo: 100, ativo: true },
  { id: '3', codigo: '339030-22-001', descricao: 'Detergente neutro 500ml', unidade: 'Un', subElemento: '22', variacao: '001', catmat: '21172', saldo: 120, valorMedio: 3.50, localizacao: 'Prateleira C-01', estoqueMinimo: 30, ativo: true },
  { id: '4', codigo: '339030-17-001', descricao: 'Toner HP 85A', unidade: 'Un', subElemento: '17', variacao: '001', catmat: '150539', saldo: 22, valorMedio: 89.00, localizacao: 'Prateleira B-01', estoqueMinimo: 5, ativo: true },
  { id: '5', codigo: '339030-25-001', descricao: 'Béquer 250ml', unidade: 'Un', subElemento: '25', variacao: '001', catmat: '319025', saldo: 22, valorMedio: 35.00, localizacao: 'Prateleira D-01', estoqueMinimo: 5, ativo: true },
  { id: '6', codigo: '339030-07-003', descricao: 'Grampeador 26/6', unidade: 'Un', subElemento: '07', variacao: '003', catmat: '44520', saldo: 15, valorMedio: 32.00, localizacao: 'Prateleira A-03', estoqueMinimo: 5, ativo: true },
  { id: '7', codigo: '339030-21-001', descricao: 'Copo descartável 200ml', unidade: 'Pct', subElemento: '21', variacao: '001', catmat: '21105', saldo: 80, valorMedio: 6.50, localizacao: 'Prateleira E-01', estoqueMinimo: 20, ativo: true },
  { id: '8', codigo: '339030-17-002', descricao: 'Mouse USB Logitech', unidade: 'Un', subElemento: '17', variacao: '002', catmat: '150215', saldo: 35, valorMedio: 45.00, localizacao: 'Prateleira B-02', estoqueMinimo: 10, ativo: true },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Catalogo() {
  const [busca, setBusca] = useState('');
  const [subElementoFiltro, setSubElementoFiltro] = useState('todos');
  const [materiais, setMateriais] = useState<Material[]>(MOCK_MATERIAIS);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [detalhe, setDetalhe] = useState<Material | null>(null);
  const [form, setForm] = useState<Partial<Material>>({});

  const filtrados = materiais.filter(m => {
    const matchBusca = m.descricao.toLowerCase().includes(busca.toLowerCase()) || m.codigo.includes(busca) || m.catmat.includes(busca);
    const matchSub = subElementoFiltro === 'todos' || m.subElemento === subElementoFiltro;
    return matchBusca && matchSub;
  });

  const totalItens = materiais.length;
  const abaixoMinimo = materiais.filter(m => m.saldo <= m.estoqueMinimo).length;

  function gerarCodigo(subEl: string) {
    const existentes = materiais.filter(m => m.subElemento === subEl);
    const proxVariacao = String(existentes.length + 1).padStart(3, '0');
    return { codigo: `339030-${subEl}-${proxVariacao}`, variacao: proxVariacao };
  }

  function abrirNovo() {
    const sub = SUB_ELEMENTOS[0].codigo;
    const { codigo, variacao } = gerarCodigo(sub);
    setForm({ subElemento: sub, codigo, variacao, unidade: 'Un', saldo: 0, valorMedio: 0, estoqueMinimo: 10, ativo: true });
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function abrirDetalhe(m: Material) {
    setDetalhe(m);
    setEditando(false);
    setDialogAberto(true);
  }

  function abrirEditar(m: Material) {
    setForm({ ...m });
    setEditando(true);
    setDetalhe(null);
    setDialogAberto(true);
  }

  function handleSubElementoChange(sub: string) {
    const { codigo, variacao } = gerarCodigo(sub);
    setForm(p => ({ ...p, subElemento: sub, codigo, variacao }));
  }

  function salvar() {
    if (!form.descricao || !form.subElemento) return;
    const novo: Material = { ...form, id: form.id || `m${Date.now()}` } as Material;
    if (form.id) {
      setMateriais(prev => prev.map(m => m.id === form.id ? novo : m));
    } else {
      setMateriais(prev => [...prev, novo]);
    }
    setDialogAberto(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Materiais</h1>
          <p className="text-sm text-muted-foreground">Conta 339030 — Código: CATMAT-SUBELEMENTO-VARIAÇÃO</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo Material</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Materiais</p>
          <p className="text-2xl font-bold text-foreground">{totalItens}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Subelementos Ativos</p>
          <p className="text-2xl font-bold text-primary">{new Set(materiais.map(m => m.subElemento)).size}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Abaixo do Mínimo</p>
          <p className="text-2xl font-bold text-destructive">{abaixoMinimo}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar descrição, código, CATMAT..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={subElementoFiltro} onChange={e => setSubElementoFiltro(e.target.value)}>
          <option value="todos">Todos os subelementos</option>
          {SUB_ELEMENTOS.map(s => <option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">Un</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">CATMAT</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Saldo</th>
                  <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Vlr Médio</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum material encontrado</td></tr>
                ) : filtrados.map(m => (
                  <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${m.saldo <= m.estoqueMinimo ? 'bg-destructive/5' : ''}`}>
                    <td className="p-3"><Badge variant="outline" className="font-mono text-xs">{m.codigo}</Badge></td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{m.descricao}</p>
                      <p className="text-xs text-muted-foreground">{m.localizacao}</p>
                    </td>
                    <td className="p-3 text-center text-muted-foreground hidden md:table-cell">{m.unidade}</td>
                    <td className="p-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{m.catmat}</td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${m.saldo <= m.estoqueMinimo ? 'text-destructive' : 'text-foreground'}`}>{m.saldo}</span>
                      {m.saldo <= m.estoqueMinimo && <p className="text-[10px] text-destructive">Mín: {m.estoqueMinimo}</p>}
                    </td>
                    <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{fmt(m.valorMedio)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirDetalhe(m)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(m)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {editando ? (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Material" : "Cadastrar Novo Material"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                  <Label>Subelemento *</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.subElemento || ''} onChange={e => handleSubElementoChange(e.target.value)}>
                    {SUB_ELEMENTOS.map(s => <option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Código Gerado</Label>
                  <Input value={form.codigo || ''} readOnly className="bg-muted font-mono" />
                </div>
                <div className="md:col-span-2"><Label>Descrição *</Label><Input value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                <div>
                  <Label>Unidade</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.unidade || 'Un'} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div><Label>CATMAT</Label><Input value={form.catmat || ''} onChange={e => setForm(p => ({ ...p, catmat: e.target.value }))} placeholder="Código CATMAT" /></div>
                <div><Label>Localização</Label><Input value={form.localizacao || ''} onChange={e => setForm(p => ({ ...p, localizacao: e.target.value }))} placeholder="Prateleira X-00" /></div>
                <div><Label>Estoque Mínimo</Label><Input type="number" value={form.estoqueMinimo || ''} onChange={e => setForm(p => ({ ...p, estoqueMinimo: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button onClick={salvar}>Salvar</Button>
              </DialogFooter>
            </>
          ) : detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />{detalhe.descricao}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
                <div><span className="text-muted-foreground">Código:</span><p className="font-mono font-medium text-foreground">{detalhe.codigo}</p></div>
                <div><span className="text-muted-foreground">CATMAT:</span><p className="font-mono font-medium text-foreground">{detalhe.catmat}</p></div>
                <div><span className="text-muted-foreground">Subelemento:</span><p className="text-foreground">{detalhe.subElemento} — {SUB_ELEMENTOS.find(s => s.codigo === detalhe.subElemento)?.descricao}</p></div>
                <div><span className="text-muted-foreground">Unidade:</span><p className="text-foreground">{detalhe.unidade}</p></div>
                <div><span className="text-muted-foreground">Saldo Atual:</span><p className={`font-bold ${detalhe.saldo <= detalhe.estoqueMinimo ? 'text-destructive' : 'text-foreground'}`}>{detalhe.saldo}</p></div>
                <div><span className="text-muted-foreground">Estoque Mínimo:</span><p className="text-foreground">{detalhe.estoqueMinimo}</p></div>
                <div><span className="text-muted-foreground">Valor Médio:</span><p className="font-medium text-foreground">{fmt(detalhe.valorMedio)}</p></div>
                <div><span className="text-muted-foreground">Valor Total Estoque:</span><p className="font-bold text-foreground">{fmt(detalhe.saldo * detalhe.valorMedio)}</p></div>
                <div><span className="text-muted-foreground">Localização:</span><p className="text-foreground">{detalhe.localizacao}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={detalhe.ativo ? 'default' : 'destructive'}>{detalhe.ativo ? 'Ativo' : 'Inativo'}</Badge></p></div>
              </div>
              <div className="flex justify-center py-4 border-t">
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">QR Code: {detalhe.codigo}</p>
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
