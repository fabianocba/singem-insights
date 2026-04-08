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
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Car,
  DollarSign,
  Fuel,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Settings,
  FileText,
  Search,
} from "lucide-react";

type TipoAbastecimento = "gasolina" | "etanol" | "diesel" | "diesel_s10" | "gnv";

interface Abastecimento {
  id: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  data: string;
  combustivel: TipoAbastecimento;
  litros: number;
  valorLitro: number;
  valorTotal: number;
  kmAtual: number;
  posto: string;
  motorista: string;
}

interface Multa {
  id: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  data: string;
  descricao: string;
  local: string;
  valor: number;
  motorista: string;
  status: "pendente" | "paga" | "recorrida";
  autoInfracao: string;
}

const combustivelLabels: Record<TipoAbastecimento, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  diesel_s10: "Diesel S10",
  gnv: "GNV",
};

const abastecimentosMock: Abastecimento[] = [
  {
    id: "ABT-001",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    data: "2026-04-05",
    combustivel: "diesel_s10",
    litros: 65,
    valorLitro: 6.29,
    valorTotal: 408.85,
    kmAtual: 29700,
    posto: "Posto BR — Centro",
    motorista: "José da Silva",
  },
  {
    id: "ABT-002",
    veiculoPlaca: "DEF-4G56",
    veiculoModelo: "Fiat Strada 2023",
    data: "2026-04-03",
    combustivel: "gasolina",
    litros: 42,
    valorLitro: 5.89,
    valorTotal: 247.38,
    kmAtual: 45050,
    posto: "Posto Shell — Av. Principal",
    motorista: "Carlos Souza",
  },
  {
    id: "ABT-003",
    veiculoPlaca: "GHI-7J89",
    veiculoModelo: "VW Saveiro 2021",
    data: "2026-04-01",
    combustivel: "etanol",
    litros: 38,
    valorLitro: 3.99,
    valorTotal: 151.62,
    kmAtual: 52100,
    posto: "Posto Ipiranga — Rod. BA-262",
    motorista: "Marcos Lima",
  },
  {
    id: "ABT-004",
    veiculoPlaca: "JKL-0M12",
    veiculoModelo: "Renault Master 2020",
    data: "2026-03-28",
    combustivel: "diesel",
    litros: 80,
    valorLitro: 5.99,
    valorTotal: 479.20,
    kmAtual: 78400,
    posto: "Posto BR — Saída Sul",
    motorista: "José da Silva",
  },
];

const multasMock: Multa[] = [
  {
    id: "MLT-001",
    veiculoPlaca: "DEF-4G56",
    veiculoModelo: "Fiat Strada 2023",
    data: "2026-03-15",
    descricao: "Excesso de velocidade — 20% acima",
    local: "Rod. BA-262 Km 34",
    valor: 195.23,
    motorista: "Carlos Souza",
    status: "pendente",
    autoInfracao: "AI-2026-00234",
  },
  {
    id: "MLT-002",
    veiculoPlaca: "ABC-1D23",
    veiculoModelo: "Toyota Hilux 2022",
    data: "2026-02-20",
    descricao: "Estacionamento irregular",
    local: "Rua Barão do Rio Branco, 120",
    valor: 88.38,
    motorista: "José da Silva",
    status: "paga",
    autoInfracao: "AI-2026-00189",
  },
];

type AbaAtiva = "dashboard" | "abastecimentos" | "multas" | "configuracoes";

export default function AdmTransportes() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("dashboard");
  const [abastecimentos] = useState<Abastecimento[]>(abastecimentosMock);
  const [multas, setMultas] = useState<Multa[]>(multasMock);
  const [buscaAbast, setBuscaAbast] = useState("");
  const [buscaMulta, setBuscaMulta] = useState("");
  const [detalhesAbastOpen, setDetalhesAbastOpen] = useState(false);
  const [abastSelecionado, setAbastSelecionado] = useState<Abastecimento | null>(null);

  const totalCombustivel = abastecimentos.reduce((acc, a) => acc + a.valorTotal, 0);
  const totalLitros = abastecimentos.reduce((acc, a) => acc + a.litros, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _totalMultas = multas.reduce((acc, m) => acc + m.valor, 0);
  const multasPendentes = multas.filter((m) => m.status === "pendente").length;

  const filteredAbast = abastecimentos.filter(
    (a) =>
      a.veiculoPlaca.toLowerCase().includes(buscaAbast.toLowerCase()) ||
      a.veiculoModelo.toLowerCase().includes(buscaAbast.toLowerCase()) ||
      a.motorista.toLowerCase().includes(buscaAbast.toLowerCase())
  );

  const filteredMultas = multas.filter(
    (m) =>
      m.veiculoPlaca.toLowerCase().includes(buscaMulta.toLowerCase()) ||
      m.descricao.toLowerCase().includes(buscaMulta.toLowerCase()) ||
      m.motorista.toLowerCase().includes(buscaMulta.toLowerCase())
  );

  const abas: { key: AbaAtiva; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "abastecimentos", label: "Abastecimentos", icon: <Fuel className="h-4 w-4" /> },
    { key: "multas", label: "Multas", icon: <AlertTriangle className="h-4 w-4" /> },
    { key: "configuracoes", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ADM — Transportes</h1>
        <p className="text-sm text-muted-foreground">Painel administrativo, abastecimentos, multas e configurações</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-border pb-0">
        {abas.map((aba) => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              abaAtiva === aba.key
                ? "bg-card border border-b-0 border-border text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {aba.icon}
            {aba.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {abaAtiva === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Car className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">4</p>
                    <p className="text-xs text-muted-foreground">Veículos Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Fuel className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLitros.toLocaleString("pt-BR")} L</p>
                    <p className="text-xs text-muted-foreground">Combustível (mês)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {totalCombustivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-xs text-muted-foreground">Gasto Combustível</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{multasPendentes}</p>
                    <p className="text-xs text-muted-foreground">Multas Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo por veículo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Consumo por Veículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["ABC-1D23", "DEF-4G56", "GHI-7J89", "JKL-0M12"].map((placa) => {
                  const veicAbast = abastecimentos.filter((a) => a.veiculoPlaca === placa);
                  const totalV = veicAbast.reduce((acc, a) => acc + a.valorTotal, 0);
                  const litrosV = veicAbast.reduce((acc, a) => acc + a.litros, 0);
                  const modelo = veicAbast[0]?.veiculoModelo || placa;
                  const pct = totalCombustivel > 0 ? (totalV / totalCombustivel) * 100 : 0;
                  return (
                    <div key={placa} className="flex items-center gap-4">
                      <div className="w-40 text-sm font-medium truncate">{modelo}</div>
                      <div className="flex-1">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-right w-32">
                        <span className="font-medium">{litrosV}L</span>
                        <span className="text-muted-foreground ml-1">
                          ({totalV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Abastecimentos */}
      {abaAtiva === "abastecimentos" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, modelo ou motorista..."
                  value={buscaAbast}
                  onChange={(e) => setBuscaAbast(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fuel className="h-5 w-5 text-primary" />
                Registro de Abastecimentos ({filteredAbast.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAbast.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum abastecimento encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {filteredAbast.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setAbastSelecionado(a);
                        setDetalhesAbastOpen(true);
                      }}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <Fuel className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{a.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                              {combustivelLabels[a.combustivel]}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1">{a.veiculoModelo} — {a.veiculoPlaca}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>📅 {new Date(a.data).toLocaleDateString("pt-BR")}</span>
                            <span>⛽ {a.litros}L × R$ {a.valorLitro.toFixed(2)}</span>
                            <span>📍 {a.posto}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {a.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.kmAtual.toLocaleString("pt-BR")} km</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Multas */}
      {abaAtiva === "multas" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, descrição ou motorista..."
                  value={buscaMulta}
                  onChange={(e) => setBuscaMulta(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Registro de Multas ({filteredMultas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMultas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma multa encontrada.</p>
              ) : (
                <div className="space-y-3">
                  {filteredMultas.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-red-500/20">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{m.autoInfracao}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                m.status === "pendente"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : m.status === "paga"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {m.status === "pendente" ? "Pendente" : m.status === "paga" ? "Paga" : "Recorrida"}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1">{m.descricao}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>📅 {new Date(m.data).toLocaleDateString("pt-BR")}</span>
                            <span>🚗 {m.veiculoPlaca}</span>
                            <span>👤 {m.motorista}</span>
                            <span>📍 {m.local}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-red-400">
                          {m.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        {m.status === "pendente" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setMultas((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "paga" } : x)))
                            }
                          >
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configurações */}
      {abaAtiva === "configuracoes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-primary" />
                Configurações do Módulo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>KM Limite para Manutenção Preventiva</Label>
                  <Input type="number" defaultValue="10000" />
                  <p className="text-xs text-muted-foreground mt-1">Alerta ao atingir KM para revisão</p>
                </div>
                <div>
                  <Label>Dias Antes do Vencimento da CNH</Label>
                  <Input type="number" defaultValue="90" />
                  <p className="text-xs text-muted-foreground mt-1">Alerta de renovação de habilitação</p>
                </div>
                <div>
                  <Label>Limite Diário de Agendamentos</Label>
                  <Input type="number" defaultValue="5" />
                  <p className="text-xs text-muted-foreground mt-1">Máximo de viagens por dia</p>
                </div>
                <div>
                  <Label>Aprovação Obrigatória para Viagens</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="sim">Sim — Requer aprovação</option>
                    <option value="nao">Não — Aprovação automática</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Define se viagens precisam de autorização</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button>Salvar Configurações</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Relatórios Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Relatório Mensal de Abastecimentos",
                  "Relatório de Manutenções por Veículo",
                  "Relatório de Utilização da Frota",
                  "Relatório de Multas e Infrações",
                ].map((rel) => (
                  <Button key={rel} variant="outline" className="justify-start gap-2 h-auto py-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{rel}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Detalhes Abastecimento */}
      <Dialog open={detalhesAbastOpen} onOpenChange={setDetalhesAbastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes — {abastSelecionado?.id}</DialogTitle>
            <DialogDescription>{abastSelecionado?.veiculoModelo}</DialogDescription>
          </DialogHeader>
          {abastSelecionado && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Veículo</p>
                <p className="text-sm font-medium">{abastSelecionado.veiculoModelo} — {abastSelecionado.veiculoPlaca}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">{new Date(abastSelecionado.data).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Combustível</p>
                <p className="text-sm font-medium">{combustivelLabels[abastSelecionado.combustivel]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Litros</p>
                <p className="text-sm font-medium">{abastSelecionado.litros}L</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor/Litro</p>
                <p className="text-sm font-medium">R$ {abastSelecionado.valorLitro.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-sm font-bold text-primary">
                  {abastSelecionado.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">KM Atual</p>
                <p className="text-sm font-medium">{abastSelecionado.kmAtual.toLocaleString("pt-BR")} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posto</p>
                <p className="text-sm font-medium">{abastSelecionado.posto}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Motorista</p>
                <p className="text-sm font-medium">{abastSelecionado.motorista}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
