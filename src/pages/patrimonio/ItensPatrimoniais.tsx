import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Search, Plus, Eye, Edit2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

interface BemPatrimonial {
  id: string;
  tombamento: string;
  descricao: string;
  categoria: string;
  localizacao: string;
  responsavel: string;
  estado: 'bom' | 'regular' | 'ruim' | 'inservível';
  dataAquisicao: string;
  valorAquisicao: number;
  notaFiscal: string;
  situacao: 'ativo' | 'baixado' | 'cedido' | 'transferido';
}

const CATEGORIAS = [
  'Equipamento de Informática',
  'Mobiliário',
  'Equipamento de Laboratório',
  'Veículo',
  'Equipamento Audiovisual',
  'Máquinas e Utensílios',
];

const LOCAIS = [
  'Almoxarifado Central',
  'Bloco A — Sala 101',
  'Bloco B — Laboratório 01',
  'Bloco C — Administração',
  'Bloco D — Biblioteca',
  'Garagem',
];

const MOCK_BENS: BemPatrimonial[] = [
  { id: '1', tombamento: '2024.0001', descricao: 'Notebook Dell Latitude 5520', categoria: 'Equipamento de Informática', localizacao: 'Bloco A — Sala 101', responsavel: 'João Silva', estado: 'bom', dataAquisicao: '2024-03-15', valorAquisicao: 5200, notaFiscal: 'NF-2024-0012', situacao: 'ativo' },
  { id: '2', tombamento: '2024.0002', descricao: 'Projetor Epson PowerLite E20', categoria: 'Equipamento Audiovisual', localizacao: 'Bloco B — Laboratório 01', responsavel: 'Maria Souza', estado: 'bom', dataAquisicao: '2024-03-15', valorAquisicao: 3100, notaFiscal: 'NF-2024-0012', situacao: 'ativo' },
  { id: '3', tombamento: '2023.0045', descricao: 'Mesa escritório 1.50m', categoria: 'Mobiliário', localizacao: 'Bloco C — Administração', responsavel: 'Carlos Pereira', estado: 'regular', dataAquisicao: '2023-06-10', valorAquisicao: 850, notaFiscal: 'NF-2023-0088', situacao: 'ativo' },
  { id: '4', tombamento: '2023.0046', descricao: 'Cadeira giratória ergonômica', categoria: 'Mobiliário', localizacao: 'Bloco C — Administração', responsavel: 'Carlos Pereira', estado: 'ruim', dataAquisicao: '2023-06-10', valorAquisicao: 620, notaFiscal: 'NF-2023-0088', situacao: 'ativo' },
  { id: '5', tombamento: '2022.0112', descricao: 'Microscópio binocular', categoria: 'Equipamento de Laboratório', localizacao: 'Bloco B — Laboratório 01', responsavel: 'Ana Lima', estado: 'bom', dataAquisicao: '2022-11-20', valorAquisicao: 4500, notaFiscal: 'NF-2022-0201', situacao: 'ativo' },
  { id: '6', tombamento: '2021.0078', descricao: 'Impressora HP LaserJet Pro', categoria: 'Equipamento de Informática', localizacao: 'Bloco D — Biblioteca', responsavel: 'Pedro Santos', estado: 'inservível', dataAquisicao: '2021-02-05', valorAquisicao: 2800, notaFiscal: 'NF-2021-0034', situacao: 'baixado' },
];

const estadoColor: Record<string, string> = {
  'bom': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'regular': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'ruim': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'inservível': 'bg-red-500/15 text-red-400 border-red-500/30',
};

const situacaoColor: Record<string, string> = {
  'ativo': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'baixado': 'bg-red-500/15 text-red-400 border-red-500/30',
  'cedido': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'transferido': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const EMPTY_BEM: Omit<BemPatrimonial, 'id'> = {
  tombamento: '', descricao: '', categoria: '', localizacao: '',
  responsavel: '', estado: 'bom', dataAquisicao: '', valorAquisicao: 0,
  notaFiscal: '', situacao: 'ativo',
};

export default function ItensPatrimoniais() {
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroSituacao, setFiltroSituacao] = useState('todos');
  const [bens, setBens] = useState<BemPatrimonial[]>(MOCK_BENS);
  const [modalAberto, setModalAberto] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState<BemPatrimonial | null>(null);
  const [form, setForm] = useState<Omit<BemPatrimonial, 'id'>>(EMPTY_BEM);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const filtrados = bens.filter(b => {
    const matchBusca = b.descricao.toLowerCase().includes(busca.toLowerCase())
      || b.tombamento.includes(busca)
      || b.responsavel.toLowerCase().includes(busca.toLowerCase());
    const matchCat = filtroCategoria === 'todos' || b.categoria === filtroCategoria;
    const matchSit = filtroSituacao === 'todos' || b.situacao === filtroSituacao;
    return matchBusca && matchCat && matchSit;
  });

  const totalValor = filtrados.reduce((s, b) => s + b.valorAquisicao, 0);
  const totalAtivos = filtrados.filter(b => b.situacao === 'ativo').length;
  const totalBaixados = filtrados.filter(b => b.situacao === 'baixado').length;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const abrirCadastro = () => {
    setForm(EMPTY_BEM);
    setEditandoId(null);
    setModalAberto(true);
  };

  const abrirEdicao = (bem: BemPatrimonial) => {
    const { id, ...rest } = bem;
    setForm(rest);
    setEditandoId(id);
    setModalAberto(true);
  };

  const salvar = () => {
    if (!form.tombamento.trim() || !form.descricao.trim()) return;
    if (editandoId) {
      setBens(prev => prev.map(b => b.id === editandoId ? { ...form, id: editandoId } : b));
    } else {
      setBens(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    }
    setModalAberto(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Itens Patrimoniais</h1>
          <p className="text-sm text-muted-foreground">Cadastro e consulta de bens patrimoniais</p>
        </div>
        <Button onClick={abrirCadastro}>
          <Plus className="h-4 w-4 mr-2" /> Novo Bem
        </Button>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total de Bens</p>
          <p className="text-lg font-bold text-foreground">{filtrados.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Ativos</p>
          <p className="text-lg font-bold text-emerald-400">{totalAtivos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Baixados</p>
          <p className="text-lg font-bold text-red-400">{totalBaixados}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold text-primary">{fmt(totalValor)}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por descrição, tombamento ou responsável..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todas situações</option>
          <option value="ativo">Ativo</option>
          <option value="baixado">Baixado</option>
          <option value="cedido">Cedido</option>
          <option value="transferido">Transferido</option>
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
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-left p-3 font-medium">Localização</th>
                  <th className="text-left p-3 font-medium">Responsável</th>
                  <th className="text-center p-3 font-medium">Estado</th>
                  <th className="text-center p-3 font-medium">Situação</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(bem => (
                  <tr key={bem.id} className="border-b hover:bg-muted/30">
                    <td className="p-3"><Badge variant="outline" className="font-mono text-xs">{bem.tombamento}</Badge></td>
                    <td className="p-3">{bem.descricao}</td>
                    <td className="p-3 text-xs"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{bem.localizacao}</span></td>
                    <td className="p-3 text-xs">{bem.responsavel}</td>
                    <td className="p-3 text-center"><Badge className={`text-xs ${estadoColor[bem.estado]}`}>{bem.estado}</Badge></td>
                    <td className="p-3 text-center"><Badge className={`text-xs capitalize ${situacaoColor[bem.situacao]}`}>{bem.situacao}</Badge></td>
                    <td className="p-3 text-right">{fmt(bem.valorAquisicao)}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetalheAberto(bem)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(bem)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum bem encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Bem Patrimonial' : 'Cadastrar Novo Bem'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tombamento</Label>
                <Input value={form.tombamento} onChange={e => setForm(f => ({ ...f, tombamento: e.target.value }))} placeholder="2024.0001" />
              </div>
              <div>
                <Label>Nota Fiscal</Label>
                <Input value={form.notaFiscal} onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} placeholder="NF-2024-0001" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do bem" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Localização</Label>
                <select value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>
                  {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div>
                <Label>Data Aquisição</Label>
                <Input type="date" value={form.dataAquisicao} onChange={e => setForm(f => ({ ...f, dataAquisicao: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Valor Aquisição</Label>
                <Input type="number" step="0.01" value={form.valorAquisicao || ''} onChange={e => setForm(f => ({ ...f, valorAquisicao: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Estado</Label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as BemPatrimonial['estado'] }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="ruim">Ruim</option>
                  <option value="inservível">Inservível</option>
                </select>
              </div>
              <div>
                <Label>Situação</Label>
                <select value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value as BemPatrimonial['situacao'] }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="ativo">Ativo</option>
                  <option value="baixado">Baixado</option>
                  <option value="cedido">Cedido</option>
                  <option value="transferido">Transferido</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editandoId ? 'Salvar Alterações' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={!!detalheAberto} onOpenChange={() => setDetalheAberto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Bem</DialogTitle>
          </DialogHeader>
          {detalheAberto && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Tombamento:</span><p className="font-semibold font-mono">{detalheAberto.tombamento}</p></div>
                <div><span className="text-muted-foreground">Nota Fiscal:</span><p className="font-semibold">{detalheAberto.notaFiscal}</p></div>
              </div>
              <div><span className="text-muted-foreground">Descrição:</span><p className="font-semibold">{detalheAberto.descricao}</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Categoria:</span><p className="font-semibold">{detalheAberto.categoria}</p></div>
                <div><span className="text-muted-foreground">Localização:</span><p className="font-semibold">{detalheAberto.localizacao}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Responsável:</span><p className="font-semibold">{detalheAberto.responsavel}</p></div>
                <div><span className="text-muted-foreground">Data Aquisição:</span><p className="font-semibold">{new Date(detalheAberto.dataAquisicao).toLocaleDateString('pt-BR')}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><span className="text-muted-foreground">Valor:</span><p className="font-semibold">{fmt(detalheAberto.valorAquisicao)}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><Badge className={`text-xs ${estadoColor[detalheAberto.estado]}`}>{detalheAberto.estado}</Badge></div>
                <div><span className="text-muted-foreground">Situação:</span><Badge className={`text-xs capitalize ${situacaoColor[detalheAberto.situacao]}`}>{detalheAberto.situacao}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
