import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Search, Plus, Eye, Edit2, Car, User, Fuel } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

// ── Types ──────────────────────────────────────────────
type AbaAtiva = 'veiculos' | 'motoristas';
type StatusVeiculo = 'ativo' | 'manutenção' | 'inativo';
type StatusMotorista = 'ativo' | 'inativo' | 'férias';
type CategoriaHabilitacao = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  tipo: string;
  combustivel: string;
  lotacao: string;
  quilometragem: number;
  status: StatusVeiculo;
  renavam: string;
  chassi: string;
  dataAquisicao: string;
}

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCNH: CategoriaHabilitacao;
  validadeCNH: string;
  telefone: string;
  setor: string;
  status: StatusMotorista;
  dataAdmissao: string;
}

// ── Mock data ──────────────────────────────────────────
const VEICULOS_MOCK: Veiculo[] = [
  { id: "v1", placa: "QRA-1A23", modelo: "Hilux CD 4x4", marca: "Toyota", ano: 2022, tipo: "Caminhonete", combustivel: "Diesel", lotacao: "Reitoria", quilometragem: 45230, status: "ativo", renavam: "11223344556", chassi: "9BR53ZEC4L8123456", dataAquisicao: "2022-03-15" },
  { id: "v2", placa: "QRB-2B34", modelo: "Gol 1.6", marca: "Volkswagen", ano: 2020, tipo: "Passeio", combustivel: "Flex", lotacao: "Campus Guanambi", quilometragem: 78500, status: "ativo", renavam: "22334455667", chassi: "9BWAB45U0L4567890", dataAquisicao: "2020-06-10" },
  { id: "v3", placa: "QRC-3C45", modelo: "Micro-ônibus Volare V8L", marca: "Marcopolo", ano: 2019, tipo: "Micro-ônibus", combustivel: "Diesel", lotacao: "Campus Guanambi", quilometragem: 120340, status: "manutenção", renavam: "33445566778", chassi: "93PB18H0XL3123456", dataAquisicao: "2019-01-20" },
  { id: "v4", placa: "QRD-4D56", modelo: "Duster 1.6", marca: "Renault", ano: 2021, tipo: "SUV", combustivel: "Flex", lotacao: "DAP", quilometragem: 53200, status: "ativo", renavam: "44556677889", chassi: "93YASR6THML012345", dataAquisicao: "2021-08-01" },
  { id: "v5", placa: "QRE-5E67", modelo: "Ônibus OF 1519", marca: "Mercedes-Benz", ano: 2018, tipo: "Ônibus", combustivel: "Diesel", lotacao: "Campus Guanambi", quilometragem: 198700, status: "inativo", renavam: "55667788990", chassi: "9BM384078L1234567", dataAquisicao: "2018-04-12" },
];

const MOTORISTAS_MOCK: Motorista[] = [
  { id: "m1", nome: "Carlos Alberto da Silva", cpf: "123.456.789-00", cnh: "04512345678", categoriaCNH: "D", validadeCNH: "2027-05-10", telefone: "(77) 99988-1234", setor: "Transportes", status: "ativo", dataAdmissao: "2015-03-01" },
  { id: "m2", nome: "José Antônio Oliveira", cpf: "234.567.890-11", cnh: "05623456789", categoriaCNH: "E", validadeCNH: "2026-11-20", telefone: "(77) 99877-2345", setor: "Transportes", status: "ativo", dataAdmissao: "2017-07-15" },
  { id: "m3", nome: "Francisco Souza Santos", cpf: "345.678.901-22", cnh: "06734567890", categoriaCNH: "D", validadeCNH: "2025-08-05", telefone: "(77) 99766-3456", setor: "Transportes", status: "férias", dataAdmissao: "2019-01-10" },
  { id: "m4", nome: "Pedro Henrique Lima", cpf: "456.789.012-33", cnh: "07845678901", categoriaCNH: "B", validadeCNH: "2026-02-28", telefone: "(77) 99655-4567", setor: "Administrativo", status: "ativo", dataAdmissao: "2020-09-01" },
];

const TIPOS_VEICULO = ["Passeio", "Caminhonete", "SUV", "Micro-ônibus", "Ônibus", "Caminhão", "Utilitário"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Diesel", "Elétrico", "GNV"];

// ── Status helpers ─────────────────────────────────────
function statusVeiculoVariant(s: StatusVeiculo) {
  return s === "ativo" ? "default" : s === "manutenção" ? "secondary" : "destructive";
}
function statusMotoristaVariant(s: StatusMotorista) {
  return s === "ativo" ? "default" : s === "férias" ? "secondary" : "destructive";
}

// ── Component ──────────────────────────────────────────
export default function Cadastros() {
  const [aba, setAba] = useState<AbaAtiva>("veiculos");
  const [busca, setBusca] = useState("");

  // Veículos state
  const [veiculos, setVeiculos] = useState<Veiculo[]>(VEICULOS_MOCK);
  const [dialogVeiculo, setDialogVeiculo] = useState(false);
  const [veiculoDetalhe, setVeiculoDetalhe] = useState<Veiculo | null>(null);
  const [editandoVeiculo, setEditandoVeiculo] = useState(false);
  const [formVeiculo, setFormVeiculo] = useState<Partial<Veiculo>>({});

  // Motoristas state
  const [motoristas, setMotoristas] = useState<Motorista[]>(MOTORISTAS_MOCK);
  const [dialogMotorista, setDialogMotorista] = useState(false);
  const [motoristaDetalhe, setMotoristaDetalhe] = useState<Motorista | null>(null);
  const [editandoMotorista, setEditandoMotorista] = useState(false);
  const [formMotorista, setFormMotorista] = useState<Partial<Motorista>>({});

  // ── Filter ─────────────────────────────────────────
  const veiculosFiltrados = veiculos.filter(v =>
    v.placa.toLowerCase().includes(busca.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busca.toLowerCase()) ||
    v.marca.toLowerCase().includes(busca.toLowerCase()) ||
    v.lotacao.toLowerCase().includes(busca.toLowerCase())
  );
  const motoristasFiltrados = motoristas.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.cpf.includes(busca) ||
    m.cnh.includes(busca)
  );

  // ── Counters ───────────────────────────────────────
  const veiculosAtivos = veiculos.filter(v => v.status === "ativo").length;
  const veiculosManut = veiculos.filter(v => v.status === "manutenção").length;
  const motoristasAtivos = motoristas.filter(m => m.status === "ativo").length;

  // ── Veículo CRUD ──────────────────────────────────
  function abrirNovoVeiculo() {
    setFormVeiculo({ status: "ativo", ano: new Date().getFullYear(), quilometragem: 0 });
    setEditandoVeiculo(true);
    setDialogVeiculo(true);
  }
  function abrirDetalheVeiculo(v: Veiculo) {
    setVeiculoDetalhe(v);
    setEditandoVeiculo(false);
    setDialogVeiculo(true);
  }
  function abrirEditarVeiculo(v: Veiculo) {
    setFormVeiculo({ ...v });
    setEditandoVeiculo(true);
    setDialogVeiculo(true);
  }
  function salvarVeiculo() {
    if (!formVeiculo.placa || !formVeiculo.modelo || !formVeiculo.marca) return;
    if (formVeiculo.id) {
      setVeiculos(prev => prev.map(v => v.id === formVeiculo.id ? { ...v, ...formVeiculo } as Veiculo : v));
    } else {
      const novo: Veiculo = { ...formVeiculo, id: `v${Date.now()}` } as Veiculo;
      setVeiculos(prev => [...prev, novo]);
    }
    setDialogVeiculo(false);
  }

  // ── Motorista CRUD ────────────────────────────────
  function abrirNovoMotorista() {
    setFormMotorista({ status: "ativo" });
    setEditandoMotorista(true);
    setDialogMotorista(true);
  }
  function abrirDetalheMotorista(m: Motorista) {
    setMotoristaDetalhe(m);
    setEditandoMotorista(false);
    setDialogMotorista(true);
  }
  function abrirEditarMotorista(m: Motorista) {
    setFormMotorista({ ...m });
    setEditandoMotorista(true);
    setDialogMotorista(true);
  }
  function salvarMotorista() {
    if (!formMotorista.nome || !formMotorista.cpf || !formMotorista.cnh) return;
    if (formMotorista.id) {
      setMotoristas(prev => prev.map(m => m.id === formMotorista.id ? { ...m, ...formMotorista } as Motorista : m));
    } else {
      const novo: Motorista = { ...formMotorista, id: `m${Date.now()}` } as Motorista;
      setMotoristas(prev => [...prev, novo]);
    }
    setDialogMotorista(false);
  }

  // ── CNH validity check ────────────────────────────
  function cnhVencida(data: string) {
    return new Date(data) < new Date();
  }
  function cnhProximaVencer(data: string) {
    const diff = new Date(data).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastros — Transportes</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciamento de veículos e motoristas da frota institucional</p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Car className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{veiculos.length}</p><p className="text-xs text-muted-foreground">Veículos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><Car className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground">{veiculosAtivos}</p><p className="text-xs text-muted-foreground">Ativos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Fuel className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold text-foreground">{veiculosManut}</p><p className="text-xs text-muted-foreground">Em Manutenção</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><User className="h-5 w-5 text-info" /></div>
            <div><p className="text-2xl font-bold text-foreground">{motoristasAtivos}</p><p className="text-xs text-muted-foreground">Motoristas Ativos</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search + Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => { setAba("veiculos"); setBusca(""); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${aba === "veiculos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Car className="inline h-4 w-4 mr-1.5 -mt-0.5" />Veículos
          </button>
          <button onClick={() => { setAba("motoristas"); setBusca(""); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${aba === "motoristas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <User className="inline h-4 w-4 mr-1.5 -mt-0.5" />Motoristas
          </button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={aba === "veiculos" ? "Buscar placa, modelo..." : "Buscar nome, CPF, CNH..."} value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>
          <Button size="sm" onClick={aba === "veiculos" ? abrirNovoVeiculo : abrirNovoMotorista}>
            <Plus className="h-4 w-4 mr-1" />{aba === "veiculos" ? "Novo Veículo" : "Novo Motorista"}
          </Button>
        </div>
      </div>

      {/* ── Veículos Table ────────────────────────── */}
      {aba === "veiculos" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Placa</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Modelo / Marca</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Lotação</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">KM</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculosFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum veículo encontrado</td></tr>
                  ) : veiculosFiltrados.map(v => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">{v.placa}</td>
                      <td className="p-3"><span className="font-medium text-foreground">{v.modelo}</span><br/><span className="text-xs text-muted-foreground">{v.marca} · {v.ano}</span></td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{v.tipo}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{v.lotacao}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{v.quilometragem.toLocaleString("pt-BR")} km</td>
                      <td className="p-3"><Badge variant={statusVeiculoVariant(v.status)}>{v.status}</Badge></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirDetalheVeiculo(v)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => abrirEditarVeiculo(v)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Motoristas Table ──────────────────────── */}
      {aba === "motoristas" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">CPF</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">CNH</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Validade CNH</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Setor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {motoristasFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum motorista encontrado</td></tr>
                  ) : motoristasFiltrados.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">{m.nome}</td>
                      <td className="p-3 hidden md:table-cell font-mono text-muted-foreground">{m.cpf}</td>
                      <td className="p-3">
                        <span className="font-mono text-foreground">{m.cnh}</span>
                        <br/><span className="text-xs text-muted-foreground">Cat. {m.categoriaCNH}</span>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className={`text-sm ${cnhVencida(m.validadeCNH) ? "text-destructive font-semibold" : cnhProximaVencer(m.validadeCNH) ? "text-warning font-semibold" : "text-muted-foreground"}`}>
                          {new Date(m.validadeCNH).toLocaleDateString("pt-BR")}
                        </span>
                        {cnhVencida(m.validadeCNH) && <Badge variant="destructive" className="ml-2 text-[10px]">Vencida</Badge>}
                        {cnhProximaVencer(m.validadeCNH) && <Badge variant="secondary" className="ml-2 text-[10px]">Próx. vencer</Badge>}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{m.setor}</td>
                      <td className="p-3"><Badge variant={statusMotoristaVariant(m.status)}>{m.status}</Badge></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirDetalheMotorista(m)} title="Detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => abrirEditarMotorista(m)} title="Editar"><Edit2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ Dialog Veículo ══════════════════════════ */}
      <Dialog open={dialogVeiculo} onOpenChange={setDialogVeiculo}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {editandoVeiculo ? (
            <>
              <DialogHeader>
                <DialogTitle>{formVeiculo.id ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div><Label>Placa *</Label><Input value={formVeiculo.placa || ""} onChange={e => setFormVeiculo(p => ({ ...p, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1D23" maxLength={8} /></div>
                <div><Label>Modelo *</Label><Input value={formVeiculo.modelo || ""} onChange={e => setFormVeiculo(p => ({ ...p, modelo: e.target.value }))} /></div>
                <div><Label>Marca *</Label><Input value={formVeiculo.marca || ""} onChange={e => setFormVeiculo(p => ({ ...p, marca: e.target.value }))} /></div>
                <div><Label>Ano</Label><Input type="number" value={formVeiculo.ano || ""} onChange={e => setFormVeiculo(p => ({ ...p, ano: parseInt(e.target.value) }))} /></div>
                <div>
                  <Label>Tipo</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formVeiculo.tipo || ""} onChange={e => setFormVeiculo(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="">Selecione</option>
                    {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Combustível</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formVeiculo.combustivel || ""} onChange={e => setFormVeiculo(p => ({ ...p, combustivel: e.target.value }))}>
                    <option value="">Selecione</option>
                    {COMBUSTIVEIS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Lotação</Label><Input value={formVeiculo.lotacao || ""} onChange={e => setFormVeiculo(p => ({ ...p, lotacao: e.target.value }))} /></div>
                <div><Label>Quilometragem</Label><Input type="number" value={formVeiculo.quilometragem || ""} onChange={e => setFormVeiculo(p => ({ ...p, quilometragem: parseInt(e.target.value) }))} /></div>
                <div><Label>RENAVAM</Label><Input value={formVeiculo.renavam || ""} onChange={e => setFormVeiculo(p => ({ ...p, renavam: e.target.value }))} /></div>
                <div><Label>Chassi</Label><Input value={formVeiculo.chassi || ""} onChange={e => setFormVeiculo(p => ({ ...p, chassi: e.target.value }))} /></div>
                <div><Label>Data Aquisição</Label><Input type="date" value={formVeiculo.dataAquisicao || ""} onChange={e => setFormVeiculo(p => ({ ...p, dataAquisicao: e.target.value }))} /></div>
                <div>
                  <Label>Status</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formVeiculo.status || "ativo"} onChange={e => setFormVeiculo(p => ({ ...p, status: e.target.value as StatusVeiculo }))}>
                    <option value="ativo">Ativo</option>
                    <option value="manutenção">Em Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogVeiculo(false)}>Cancelar</Button>
                <Button onClick={salvarVeiculo}>Salvar</Button>
              </DialogFooter>
            </>
          ) : veiculoDetalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />{veiculoDetalhe.placa} — {veiculoDetalhe.modelo}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
                <div><span className="text-muted-foreground">Marca:</span><p className="font-medium text-foreground">{veiculoDetalhe.marca}</p></div>
                <div><span className="text-muted-foreground">Ano:</span><p className="font-medium text-foreground">{veiculoDetalhe.ano}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p className="font-medium text-foreground">{veiculoDetalhe.tipo}</p></div>
                <div><span className="text-muted-foreground">Combustível:</span><p className="font-medium text-foreground">{veiculoDetalhe.combustivel}</p></div>
                <div><span className="text-muted-foreground">Lotação:</span><p className="font-medium text-foreground">{veiculoDetalhe.lotacao}</p></div>
                <div><span className="text-muted-foreground">Quilometragem:</span><p className="font-medium text-foreground">{veiculoDetalhe.quilometragem.toLocaleString("pt-BR")} km</p></div>
                <div><span className="text-muted-foreground">RENAVAM:</span><p className="font-mono font-medium text-foreground">{veiculoDetalhe.renavam}</p></div>
                <div><span className="text-muted-foreground">Chassi:</span><p className="font-mono font-medium text-foreground">{veiculoDetalhe.chassi}</p></div>
                <div><span className="text-muted-foreground">Data Aquisição:</span><p className="font-medium text-foreground">{new Date(veiculoDetalhe.dataAquisicao).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusVeiculoVariant(veiculoDetalhe.status)}>{veiculoDetalhe.status}</Badge></p></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogVeiculo(false)}>Fechar</Button>
                <Button onClick={() => abrirEditarVeiculo(veiculoDetalhe)}>Editar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Dialog Motorista ════════════════════════ */}
      <Dialog open={dialogMotorista} onOpenChange={setDialogMotorista}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {editandoMotorista ? (
            <>
              <DialogHeader>
                <DialogTitle>{formMotorista.id ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="md:col-span-2"><Label>Nome Completo *</Label><Input value={formMotorista.nome || ""} onChange={e => setFormMotorista(p => ({ ...p, nome: e.target.value }))} /></div>
                <div><Label>CPF *</Label><Input value={formMotorista.cpf || ""} onChange={e => setFormMotorista(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
                <div><Label>Telefone</Label><Input value={formMotorista.telefone || ""} onChange={e => setFormMotorista(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                <div><Label>CNH *</Label><Input value={formMotorista.cnh || ""} onChange={e => setFormMotorista(p => ({ ...p, cnh: e.target.value }))} /></div>
                <div>
                  <Label>Categoria CNH</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formMotorista.categoriaCNH || ""} onChange={e => setFormMotorista(p => ({ ...p, categoriaCNH: e.target.value as CategoriaHabilitacao }))}>
                    <option value="">Selecione</option>
                    {(["A","B","C","D","E","AB","AC","AD","AE"] as CategoriaHabilitacao[]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Validade CNH</Label><Input type="date" value={formMotorista.validadeCNH || ""} onChange={e => setFormMotorista(p => ({ ...p, validadeCNH: e.target.value }))} /></div>
                <div><Label>Setor</Label><Input value={formMotorista.setor || ""} onChange={e => setFormMotorista(p => ({ ...p, setor: e.target.value }))} /></div>
                <div><Label>Data Admissão</Label><Input type="date" value={formMotorista.dataAdmissao || ""} onChange={e => setFormMotorista(p => ({ ...p, dataAdmissao: e.target.value }))} /></div>
                <div>
                  <Label>Status</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={formMotorista.status || "ativo"} onChange={e => setFormMotorista(p => ({ ...p, status: e.target.value as StatusMotorista }))}>
                    <option value="ativo">Ativo</option>
                    <option value="férias">Férias</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogMotorista(false)}>Cancelar</Button>
                <Button onClick={salvarMotorista}>Salvar</Button>
              </DialogFooter>
            </>
          ) : motoristaDetalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />{motoristaDetalhe.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
                <div><span className="text-muted-foreground">CPF:</span><p className="font-mono font-medium text-foreground">{motoristaDetalhe.cpf}</p></div>
                <div><span className="text-muted-foreground">Telefone:</span><p className="font-medium text-foreground">{motoristaDetalhe.telefone}</p></div>
                <div><span className="text-muted-foreground">CNH:</span><p className="font-mono font-medium text-foreground">{motoristaDetalhe.cnh}</p></div>
                <div><span className="text-muted-foreground">Categoria:</span><p className="font-medium text-foreground">{motoristaDetalhe.categoriaCNH}</p></div>
                <div>
                  <span className="text-muted-foreground">Validade CNH:</span>
                  <p className={`font-medium ${cnhVencida(motoristaDetalhe.validadeCNH) ? "text-destructive" : cnhProximaVencer(motoristaDetalhe.validadeCNH) ? "text-warning" : "text-foreground"}`}>
                    {new Date(motoristaDetalhe.validadeCNH).toLocaleDateString("pt-BR")}
                    {cnhVencida(motoristaDetalhe.validadeCNH) && " — VENCIDA"}
                  </p>
                </div>
                <div><span className="text-muted-foreground">Setor:</span><p className="font-medium text-foreground">{motoristaDetalhe.setor}</p></div>
                <div><span className="text-muted-foreground">Admissão:</span><p className="font-medium text-foreground">{new Date(motoristaDetalhe.dataAdmissao).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusMotoristaVariant(motoristaDetalhe.status)}>{motoristaDetalhe.status}</Badge></p></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogMotorista(false)}>Fechar</Button>
                <Button onClick={() => abrirEditarMotorista(motoristaDetalhe)}>Editar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
