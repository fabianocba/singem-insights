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
  CalendarDays,
  Plus,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Car,
  AlertTriangle,
} from "lucide-react";

type StatusAgendamento = "pendente" | "aprovado" | "em_uso" | "concluido" | "cancelado";
type TurnoAgendamento = "matutino" | "vespertino" | "integral" | "noturno";

interface Agendamento {
  id: string;
  solicitante: string;
  setor: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  motorista: string;
  dataInicio: string;
  dataFim: string;
  turno: TurnoAgendamento;
  destino: string;
  finalidade: string;
  numPassageiros: number;
  status: StatusAgendamento;
  kmSaida?: number;
  kmRetorno?: number;
  observacoes?: string;
}

const statusLabels: Record<StatusAgendamento, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_uso: "Em Uso",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColors: Record<StatusAgendamento, string> = {
  pendente: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  aprovado: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  em_uso: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
  concluido: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  cancelado: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const turnoLabels: Record<TurnoAgendamento, string> = {
  matutino: "Matutino (07h–12h)",
  vespertino: "Vespertino (13h–18h)",
  integral: "Integral (07h–18h)",
  noturno: "Noturno (18h–22h)",
};

const dadosMock: Agendamento[] = [
  {
    id: "AGD-001",
    solicitante: "Prof. Maria Oliveira",
    setor: "Coordenação de Ensino",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    motorista: "José da Silva",
    dataInicio: "2026-04-10",
    dataFim: "2026-04-10",
    turno: "matutino",
    destino: "IF Baiano — Campus Itapetinga",
    finalidade: "Reunião pedagógica intercampi",
    numPassageiros: 3,
    status: "aprovado",
    observacoes: "Levar documentos do PPPC",
  },
  {
    id: "AGD-002",
    solicitante: "Coord. Administrativa",
    setor: "Administração",
    veiculoPlaca: "DEF-4G56",
    veiculoModelo: "Fiat Strada 2023",
    motorista: "Carlos Souza",
    dataInicio: "2026-04-08",
    dataFim: "2026-04-08",
    turno: "integral",
    destino: "Guanambi — Fornecedores",
    finalidade: "Retirada de materiais de expediente",
    numPassageiros: 1,
    status: "em_uso",
    kmSaida: 45200,
  },
  {
    id: "AGD-003",
    solicitante: "Prof. João Santos",
    setor: "Coordenação de Pesquisa",
    veiculoPlaca: "GHI-7J89",
    veiculoModelo: "VW Saveiro 2021",
    motorista: "Marcos Lima",
    dataInicio: "2026-04-07",
    dataFim: "2026-04-07",
    turno: "vespertino",
    destino: "Fazenda Experimental — Km 12",
    finalidade: "Coleta de amostras para laboratório",
    numPassageiros: 4,
    status: "concluido",
    kmSaida: 52300,
    kmRetorno: 52348,
  },
  {
    id: "AGD-004",
    solicitante: "Ana Paula Reis",
    setor: "Assistência Estudantil",
    veiculoPlaca: "JKL-0M12",
    veiculoModelo: "Renault Master 2020",
    motorista: "José da Silva",
    dataInicio: "2026-04-12",
    dataFim: "2026-04-12",
    turno: "integral",
    destino: "Salvador — UFBA",
    finalidade: "Transporte de alunos para evento acadêmico",
    numPassageiros: 14,
    status: "pendente",
  },
  {
    id: "AGD-005",
    solicitante: "Direção Geral",
    setor: "Gabinete",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    motorista: "Carlos Souza",
    dataInicio: "2026-04-15",
    dataFim: "2026-04-16",
    turno: "integral",
    destino: "Brasília — MEC",
    finalidade: "Audiência sobre expansão do campus",
    numPassageiros: 2,
    status: "pendente",
    observacoes: "Hospedagem já reservada",
  },
];

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(dadosMock);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusAgendamento | "todos">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);

  const [form, setForm] = useState({
    solicitante: "",
    setor: "",
    veiculoPlaca: "",
    veiculoModelo: "",
    motorista: "",
    dataInicio: "",
    dataFim: "",
    turno: "matutino" as TurnoAgendamento,
    destino: "",
    finalidade: "",
    numPassageiros: "",
    observacoes: "",
  });

  const filtered = agendamentos.filter((a) => {
    const matchBusca =
      a.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      a.destino.toLowerCase().includes(busca.toLowerCase()) ||
      a.veiculoPlaca.toLowerCase().includes(busca.toLowerCase()) ||
      a.motorista.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || a.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const pendentes = agendamentos.filter((a) => a.status === "pendente").length;
  const aprovados = agendamentos.filter((a) => a.status === "aprovado").length;
  const emUso = agendamentos.filter((a) => a.status === "em_uso").length;
  const concluidos = agendamentos.filter((a) => a.status === "concluido").length;

  function handleSubmit() {
    const novo: Agendamento = {
      id: `AGD-${String(agendamentos.length + 1).padStart(3, "0")}`,
      solicitante: form.solicitante,
      setor: form.setor,
      veiculoPlaca: form.veiculoPlaca,
      veiculoModelo: form.veiculoModelo,
      motorista: form.motorista,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || form.dataInicio,
      turno: form.turno,
      destino: form.destino,
      finalidade: form.finalidade,
      numPassageiros: Number(form.numPassageiros) || 1,
      status: "pendente",
      observacoes: form.observacoes || undefined,
    };
    setAgendamentos([novo, ...agendamentos]);
    setDialogOpen(false);
    setForm({
      solicitante: "",
      setor: "",
      veiculoPlaca: "",
      veiculoModelo: "",
      motorista: "",
      dataInicio: "",
      dataFim: "",
      turno: "matutino",
      destino: "",
      finalidade: "",
      numPassageiros: "",
      observacoes: "",
    });
  }

  function atualizarStatus(id: string, novoStatus: StatusAgendamento) {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)));
    if (selecionado?.id === id) {
      setSelecionado((prev) => (prev ? { ...prev, status: novoStatus } : null));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos — Transportes</h1>
          <p className="text-sm text-muted-foreground">Reserva e controle de uso dos veículos da frota</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{aprovados}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Car className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emUso}</p>
                <p className="text-xs text-muted-foreground">Em Uso</p>
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
                <p className="text-2xl font-bold">{concluidos}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
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
                placeholder="Buscar por solicitante, destino, placa ou motorista..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusAgendamento | "todos")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="em_uso">Em Uso</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Agendamentos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{a.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>
                          {statusLabels[a.status]}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {a.destino}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.finalidade}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>
                          📅 {new Date(a.dataInicio).toLocaleDateString("pt-BR")}
                          {a.dataFim !== a.dataInicio && ` — ${new Date(a.dataFim).toLocaleDateString("pt-BR")}`}
                        </span>
                        <span>🚗 {a.veiculoPlaca}</span>
                        <span>👤 {a.motorista}</span>
                        <span>👥 {a.numPassageiros} passageiro(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "pendente" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => atualizarStatus(a.id, "cancelado")} className="text-xs">
                          Recusar
                        </Button>
                        <Button size="sm" onClick={() => atualizarStatus(a.id, "aprovado")} className="text-xs">
                          Aprovar
                        </Button>
                      </>
                    )}
                    {a.status === "aprovado" && (
                      <Button size="sm" onClick={() => atualizarStatus(a.id, "em_uso")} className="text-xs">
                        Registrar Saída
                      </Button>
                    )}
                    {a.status === "em_uso" && (
                      <Button size="sm" onClick={() => atualizarStatus(a.id, "concluido")} className="text-xs">
                        Registrar Retorno
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelecionado(a);
                        setDetalhesOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Agendamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Solicite a reserva de um veículo para viagem ou serviço</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Solicitante *</Label>
              <Input value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} placeholder="Nome do solicitante" />
            </div>
            <div>
              <Label>Setor *</Label>
              <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Setor de origem" />
            </div>
            <div>
              <Label>Veículo — Placa *</Label>
              <Input value={form.veiculoPlaca} onChange={(e) => setForm({ ...form, veiculoPlaca: e.target.value.toUpperCase() })} placeholder="ABC-1D23" />
            </div>
            <div>
              <Label>Veículo — Modelo</Label>
              <Input value={form.veiculoModelo} onChange={(e) => setForm({ ...form, veiculoModelo: e.target.value })} placeholder="Ex: Toyota Hilux" />
            </div>
            <div>
              <Label>Motorista *</Label>
              <Input value={form.motorista} onChange={(e) => setForm({ ...form, motorista: e.target.value })} placeholder="Nome do motorista" />
            </div>
            <div>
              <Label>Turno *</Label>
              <select
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value as TurnoAgendamento })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(turnoLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Destino *</Label>
              <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Cidade/local de destino" />
            </div>
            <div className="sm:col-span-2">
              <Label>Finalidade *</Label>
              <Input value={form.finalidade} onChange={(e) => setForm({ ...form, finalidade: e.target.value })} placeholder="Motivo da viagem" />
            </div>
            <div>
              <Label>Nº de Passageiros</Label>
              <Input type="number" value={form.numPassageiros} onChange={(e) => setForm({ ...form, numPassageiros: e.target.value })} placeholder="1" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações adicionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.solicitante || !form.setor || !form.veiculoPlaca || !form.motorista || !form.dataInicio || !form.destino || !form.finalidade}
            >
              Solicitar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes — {selecionado?.id}</DialogTitle>
            <DialogDescription>{selecionado?.destino}</DialogDescription>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[selecionado.status]}`}>
                    {statusLabels[selecionado.status]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Turno</p>
                  <p className="text-sm font-medium">{turnoLabels[selecionado.turno]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="text-sm font-medium">{selecionado.solicitante}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setor</p>
                  <p className="text-sm font-medium">{selecionado.setor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Veículo</p>
                  <p className="text-sm font-medium">{selecionado.veiculoModelo} — {selecionado.veiculoPlaca}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="text-sm font-medium">{selecionado.motorista}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="text-sm font-medium">
                    {new Date(selecionado.dataInicio).toLocaleDateString("pt-BR")}
                    {selecionado.dataFim !== selecionado.dataInicio &&
                      ` a ${new Date(selecionado.dataFim).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Passageiros</p>
                  <p className="text-sm font-medium">{selecionado.numPassageiros}</p>
                </div>
                {selecionado.kmSaida !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">KM Saída</p>
                    <p className="text-sm font-medium">{selecionado.kmSaida.toLocaleString("pt-BR")} km</p>
                  </div>
                )}
                {selecionado.kmRetorno !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">KM Retorno</p>
                    <p className="text-sm font-medium">{selecionado.kmRetorno.toLocaleString("pt-BR")} km</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Destino</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selecionado.destino}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Finalidade</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selecionado.finalidade}</p>
              </div>

              {selecionado.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selecionado.observacoes}</p>
                </div>
              )}

              {selecionado.kmSaida !== undefined && selecionado.kmRetorno !== undefined && (
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Distância Percorrida</p>
                  <p className="text-xl font-bold text-primary">
                    {(selecionado.kmRetorno - selecionado.kmSaida).toLocaleString("pt-BR")} km
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
