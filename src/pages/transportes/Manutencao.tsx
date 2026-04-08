import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Wrench,
  Plus,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  Calendar,
  DollarSign,
  Filter,
} from "lucide-react";

type TipoManutencao = "preventiva" | "corretiva" | "preditiva";
type StatusManutencao = "agendada" | "em_andamento" | "concluida" | "cancelada";

interface Manutencao {
  id: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  tipo: TipoManutencao;
  status: StatusManutencao;
  descricao: string;
  oficina: string;
  dataAgendamento: string;
  dataConclusao?: string;
  kmAtual: number;
  kmProxima?: number;
  custo?: number;
  pecas: PecaManutencao[];
  observacoes?: string;
  responsavel: string;
}

interface PecaManutencao {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

const tipoLabels: Record<TipoManutencao, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  preditiva: "Preditiva",
};

const statusLabels: Record<StatusManutencao, string> = {
  agendada: "Agendada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<StatusManutencao, string> = {
  agendada: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  em_andamento: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  concluida: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  cancelada: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const tipoColors: Record<TipoManutencao, string> = {
  preventiva: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
  corretiva: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  preditiva: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
};

const dadosMock: Manutencao[] = [
  {
    id: "MNT-001",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    tipo: "preventiva",
    status: "agendada",
    descricao: "Troca de óleo e filtros — revisão 30.000 km",
    oficina: "Auto Center Silva",
    dataAgendamento: "2026-04-15",
    kmAtual: 29850,
    kmProxima: 40000,
    custo: 850,
    pecas: [
      { descricao: "Óleo 5W30 Sintético", quantidade: 7, valorUnitario: 45 },
      { descricao: "Filtro de óleo", quantidade: 1, valorUnitario: 65 },
      { descricao: "Filtro de ar", quantidade: 1, valorUnitario: 80 },
    ],
    responsavel: "Carlos Souza",
  },
  {
    id: "MNT-002",
    veiculoPlaca: "DEF-4G56",
    veiculoModelo: "Fiat Strada 2023",
    tipo: "corretiva",
    status: "em_andamento",
    descricao: "Substituição do alternador — falha de carga na bateria",
    oficina: "Elétrica Veicular JR",
    dataAgendamento: "2026-04-05",
    kmAtual: 45200,
    custo: 1200,
    pecas: [
      { descricao: "Alternador remanufaturado", quantidade: 1, valorUnitario: 750 },
      { descricao: "Correia do alternador", quantidade: 1, valorUnitario: 120 },
    ],
    responsavel: "Marcos Lima",
  },
  {
    id: "MNT-003",
    veiculoPlaca: "GHI-7J89",
    veiculoModelo: "VW Saveiro 2021",
    tipo: "preventiva",
    status: "concluida",
    descricao: "Alinhamento, balanceamento e rodízio de pneus",
    oficina: "Pneus & Cia",
    dataAgendamento: "2026-03-20",
    dataConclusao: "2026-03-20",
    kmAtual: 52300,
    kmProxima: 62300,
    custo: 320,
    pecas: [],
    responsavel: "Ana Paula",
  },
  {
    id: "MNT-004",
    veiculoPlaca: "JKL-0M12",
    veiculoModelo: "Renault Master 2020",
    tipo: "corretiva",
    status: "concluida",
    descricao: "Reparo no sistema de freios — pastilhas e discos dianteiros",
    oficina: "Freios Total",
    dataAgendamento: "2026-03-10",
    dataConclusao: "2026-03-12",
    kmAtual: 78600,
    custo: 1800,
    pecas: [
      { descricao: "Jogo de pastilhas dianteiras", quantidade: 1, valorUnitario: 280 },
      { descricao: "Par de discos dianteiros", quantidade: 1, valorUnitario: 650 },
    ],
    responsavel: "Carlos Souza",
  },
  {
    id: "MNT-005",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    tipo: "preditiva",
    status: "agendada",
    descricao: "Análise de vibração — suspensão dianteira",
    oficina: "Diagnóstico Automotivo Premium",
    dataAgendamento: "2026-04-20",
    kmAtual: 29850,
    custo: 450,
    pecas: [],
    responsavel: "Marcos Lima",
  },
];

export default function Manutencao() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>(dadosMock);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoManutencao | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<StatusManutencao | "todos">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Manutencao | null>(null);

  // Form state
  const [form, setForm] = useState({
    veiculoPlaca: "",
    veiculoModelo: "",
    tipo: "preventiva" as TipoManutencao,
    descricao: "",
    oficina: "",
    dataAgendamento: "",
    kmAtual: "",
    kmProxima: "",
    custo: "",
    responsavel: "",
    observacoes: "",
  });

  const filtered = manutencoes.filter((m) => {
    const matchBusca =
      m.veiculoPlaca.toLowerCase().includes(busca.toLowerCase()) ||
      m.veiculoModelo.toLowerCase().includes(busca.toLowerCase()) ||
      m.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      m.oficina.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
    return matchBusca && matchTipo && matchStatus;
  });

  const totalCustos = manutencoes.reduce((acc, m) => acc + (m.custo || 0), 0);
  const agendadas = manutencoes.filter((m) => m.status === "agendada").length;
  const emAndamento = manutencoes.filter((m) => m.status === "em_andamento").length;
  const concluidas = manutencoes.filter((m) => m.status === "concluida").length;

  function handleSubmit() {
    const nova: Manutencao = {
      id: `MNT-${String(manutencoes.length + 1).padStart(3, "0")}`,
      veiculoPlaca: form.veiculoPlaca,
      veiculoModelo: form.veiculoModelo,
      tipo: form.tipo,
      status: "agendada",
      descricao: form.descricao,
      oficina: form.oficina,
      dataAgendamento: form.dataAgendamento,
      kmAtual: Number(form.kmAtual),
      kmProxima: form.kmProxima ? Number(form.kmProxima) : undefined,
      custo: form.custo ? Number(form.custo) : undefined,
      pecas: [],
      responsavel: form.responsavel,
      observacoes: form.observacoes || undefined,
    };
    setManutencoes([nova, ...manutencoes]);
    setDialogOpen(false);
    setForm({
      veiculoPlaca: "",
      veiculoModelo: "",
      tipo: "preventiva",
      descricao: "",
      oficina: "",
      dataAgendamento: "",
      kmAtual: "",
      kmProxima: "",
      custo: "",
      responsavel: "",
      observacoes: "",
    });
  }

  function verDetalhes(m: Manutencao) {
    setSelecionada(m);
    setDetalhesOpen(true);
  }

  function atualizarStatus(id: string, novoStatus: StatusManutencao) {
    setManutencoes((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: novoStatus,
              dataConclusao: novoStatus === "concluida" ? new Date().toISOString().split("T")[0] : m.dataConclusao,
            }
          : m
      )
    );
    if (selecionada?.id === id) {
      setSelecionada((prev) =>
        prev
          ? {
              ...prev,
              status: novoStatus,
              dataConclusao: novoStatus === "concluida" ? new Date().toISOString().split("T")[0] : prev.dataConclusao,
            }
          : null
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção — Transportes</h1>
          <p className="text-sm text-muted-foreground">Controle de manutenções preventivas, corretivas e preditivas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Manutenção
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agendadas}</p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emAndamento}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{concluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalCustos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-xs text-muted-foreground">Custo Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, modelo, descrição ou oficina..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as TipoManutencao | "todos")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
                <option value="preditiva">Preditiva</option>
              </select>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusManutencao | "todos")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos os Status</option>
                <option value="agendada">Agendada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-primary" />
            Histórico de Manutenções ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma manutenção encontrada.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{m.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tipoColors[m.tipo]}`}>
                          {tipoLabels[m.tipo]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[m.status]}`}>
                          {statusLabels[m.status]}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{m.veiculoModelo} — {m.veiculoPlaca}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.descricao}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>📅 {new Date(m.dataAgendamento).toLocaleDateString("pt-BR")}</span>
                        <span>🏢 {m.oficina}</span>
                        {m.custo && (
                          <span>💰 {m.custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === "agendada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => atualizarStatus(m.id, "em_andamento")}
                        className="text-xs"
                      >
                        Iniciar
                      </Button>
                    )}
                    {m.status === "em_andamento" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => atualizarStatus(m.id, "concluida")}
                        className="text-xs"
                      >
                        Concluir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => verDetalhes(m)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova Manutenção */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Manutenção</DialogTitle>
            <DialogDescription>Registre uma nova manutenção para um veículo da frota</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Placa do Veículo *</Label>
              <Input
                placeholder="ABC-1D23"
                value={form.veiculoPlaca}
                onChange={(e) => setForm({ ...form, veiculoPlaca: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>Modelo do Veículo *</Label>
              <Input
                placeholder="Ex: Toyota Hilux 2022"
                value={form.veiculoModelo}
                onChange={(e) => setForm({ ...form, veiculoModelo: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo de Manutenção *</Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoManutencao })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
                <option value="preditiva">Preditiva</option>
              </select>
            </div>
            <div>
              <Label>Oficina *</Label>
              <Input
                placeholder="Nome da oficina"
                value={form.oficina}
                onChange={(e) => setForm({ ...form, oficina: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Agendamento *</Label>
              <Input
                type="date"
                value={form.dataAgendamento}
                onChange={(e) => setForm({ ...form, dataAgendamento: e.target.value })}
              />
            </div>
            <div>
              <Label>KM Atual *</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.kmAtual}
                onChange={(e) => setForm({ ...form, kmAtual: e.target.value })}
              />
            </div>
            <div>
              <Label>KM Próxima Manutenção</Label>
              <Input
                type="number"
                placeholder="Opcional"
                value={form.kmProxima}
                onChange={(e) => setForm({ ...form, kmProxima: e.target.value })}
              />
            </div>
            <div>
              <Label>Custo Estimado (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={form.custo}
                onChange={(e) => setForm({ ...form, custo: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição do Serviço *</Label>
              <Input
                placeholder="Descreva o serviço a ser realizado"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>Responsável *</Label>
              <Input
                placeholder="Nome do responsável"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                placeholder="Observações adicionais"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.veiculoPlaca || !form.descricao || !form.oficina || !form.dataAgendamento || !form.kmAtual || !form.responsavel}
            >
              Registrar Manutenção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Manutenção — {selecionada?.id}</DialogTitle>
            <DialogDescription>{selecionada?.veiculoModelo} — {selecionada?.veiculoPlaca}</DialogDescription>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tipoColors[selecionada.tipo]}`}>
                    {tipoLabels[selecionada.tipo]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[selecionada.status]}`}>
                    {statusLabels[selecionada.status]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data Agendamento</p>
                  <p className="text-sm font-medium">{new Date(selecionada.dataAgendamento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data Conclusão</p>
                  <p className="text-sm font-medium">
                    {selecionada.dataConclusao ? new Date(selecionada.dataConclusao).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KM Atual</p>
                  <p className="text-sm font-medium">{selecionada.kmAtual.toLocaleString("pt-BR")} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KM Próxima</p>
                  <p className="text-sm font-medium">
                    {selecionada.kmProxima ? `${selecionada.kmProxima.toLocaleString("pt-BR")} km` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Oficina</p>
                  <p className="text-sm font-medium">{selecionada.oficina}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="text-sm font-medium">{selecionada.responsavel}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição do Serviço</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selecionada.descricao}</p>
              </div>

              {selecionada.pecas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Peças Utilizadas</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-medium">Descrição</th>
                          <th className="text-center p-2 font-medium">Qtd</th>
                          <th className="text-right p-2 font-medium">Valor Unit.</th>
                          <th className="text-right p-2 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selecionada.pecas.map((p, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2">{p.descricao}</td>
                            <td className="p-2 text-center">{p.quantidade}</td>
                            <td className="p-2 text-right">
                              {p.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {(p.quantidade * p.valorUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selecionada.custo && (
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Custo Total</p>
                    <p className="text-xl font-bold text-primary">
                      {selecionada.custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>
              )}

              {selecionada.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selecionada.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                {selecionada.status === "agendada" && (
                  <>
                    <Button variant="outline" onClick={() => atualizarStatus(selecionada.id, "cancelada")}>
                      Cancelar Manutenção
                    </Button>
                    <Button onClick={() => atualizarStatus(selecionada.id, "em_andamento")}>
                      Iniciar Manutenção
                    </Button>
                  </>
                )}
                {selecionada.status === "em_andamento" && (
                  <Button onClick={() => atualizarStatus(selecionada.id, "concluida")}>
                    Concluir Manutenção
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
