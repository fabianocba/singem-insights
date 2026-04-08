import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ClipboardList, Check, Search, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

interface ItemSM {
  id: string;
  descricao: string;
  codigo: string;
  unidade: string;
  quantidadeSolicitada: number;
  quantidadeLiberada: number;
  saldoDisponivel: number;
}

interface SMPendente {
  id: string;
  numero: string;
  solicitante: string;
  setor: string;
  data: string;
  dataAutorizacao: string;
  autorizadoPor: string;
  status: 'autorizada' | 'liberada' | 'parcial';
  itens: ItemSM[];
  observacao: string;
}

const MOCK_PENDENTES: SMPendente[] = [
  {
    id: '1', numero: 'SM-2026-001', solicitante: 'João Silva', setor: 'Coordenação de TI',
    data: '2026-04-01', dataAutorizacao: '2026-04-02', autorizadoPor: 'Maria Diretora',
    status: 'autorizada', observacao: 'Urgente — semestre letivo',
    itens: [
      { id: 's1', descricao: 'Papel A4 500fls', codigo: '339030-07-001', unidade: 'Resma', quantidadeSolicitada: 20, quantidadeLiberada: 0, saldoDisponivel: 120 },
      { id: 's2', descricao: 'Toner HP 85A', codigo: '339030-17-001', unidade: 'Un', quantidadeSolicitada: 5, quantidadeLiberada: 0, saldoDisponivel: 22 },
      { id: 's3', descricao: 'Caneta esferográfica azul', codigo: '339030-07-002', unidade: 'Un', quantidadeSolicitada: 50, quantidadeLiberada: 0, saldoDisponivel: 550 },
    ],
  },
  {
    id: '2', numero: 'SM-2026-002', solicitante: 'Maria Souza', setor: 'Laboratório de Química',
    data: '2026-04-03', dataAutorizacao: '2026-04-04', autorizadoPor: 'Carlos Coordenador',
    status: 'autorizada', observacao: '',
    itens: [
      { id: 's4', descricao: 'Béquer 250ml', codigo: '339030-25-001', unidade: 'Un', quantidadeSolicitada: 10, quantidadeLiberada: 0, saldoDisponivel: 22 },
      { id: 's5', descricao: 'Detergente neutro 500ml', codigo: '339030-22-001', unidade: 'Un', quantidadeSolicitada: 20, quantidadeLiberada: 0, saldoDisponivel: 120 },
    ],
  },
  {
    id: '3', numero: 'SM-2026-003', solicitante: 'Ana Costa', setor: 'Secretaria Acadêmica',
    data: '2026-04-05', dataAutorizacao: '2026-04-06', autorizadoPor: 'Maria Diretora',
    status: 'autorizada', observacao: 'Período de matrícula',
    itens: [
      { id: 's6', descricao: 'Papel A4 500fls', codigo: '339030-07-001', unidade: 'Resma', quantidadeSolicitada: 30, quantidadeLiberada: 0, saldoDisponivel: 120 },
      { id: 's7', descricao: 'Envelope A4 pardo', codigo: '339030-07-005', unidade: 'Cx', quantidadeSolicitada: 10, quantidadeLiberada: 0, saldoDisponivel: 40 },
      { id: 's8', descricao: 'Grampeador 26/6', codigo: '339030-07-003', unidade: 'Un', quantidadeSolicitada: 3, quantidadeLiberada: 0, saldoDisponivel: 15 },
      { id: 's9', descricao: 'Copo descartável 200ml', codigo: '339030-21-001', unidade: 'Pct', quantidadeSolicitada: 10, quantidadeLiberada: 0, saldoDisponivel: 80 },
    ],
  },
];

export default function LiberarMaterial() {
  const [busca, setBusca] = useState('');
  const [sms, setSms] = useState<SMPendente[]>(MOCK_PENDENTES);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [smSelecionada, setSmSelecionada] = useState<SMPendente | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  const smsFiltradas = sms.filter(sm =>
    sm.status === 'autorizada' && (
      sm.numero.toLowerCase().includes(busca.toLowerCase()) ||
      sm.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      sm.setor.toLowerCase().includes(busca.toLowerCase())
    )
  );

  const liberadas = sms.filter(sm => sm.status === 'liberada' || sm.status === 'parcial');

  function abrirLiberacao(sm: SMPendente) {
    setSmSelecionada(sm);
    const qtds: Record<string, number> = {};
    sm.itens.forEach(it => { qtds[it.id] = Math.min(it.quantidadeSolicitada, it.saldoDisponivel); });
    setQuantidades(qtds);
    setDialogAberto(true);
  }

  function confirmarLiberacao() {
    if (!smSelecionada) return;
    const itensAtualizados = smSelecionada.itens.map(it => ({
      ...it,
      quantidadeLiberada: quantidades[it.id] || 0,
    }));
    const todosAtendidos = itensAtualizados.every(it => it.quantidadeLiberada >= it.quantidadeSolicitada);
    setSms(prev => prev.map(sm =>
      sm.id === smSelecionada.id
        ? { ...sm, itens: itensAtualizados, status: todosAtendidos ? 'liberada' as const : 'parcial' as const }
        : sm
    ));
    setDialogAberto(false);
  }

  const totalPendentes = smsFiltradas.length;
  const totalItens = smsFiltradas.reduce((s, sm) => s + sm.itens.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Liberar Material</h1>
        <p className="text-sm text-muted-foreground">SMs autorizadas aguardando liberação pelo almoxarifado</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">SMs Pendentes</p>
          <p className="text-2xl font-bold text-warning">{totalPendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Itens a Liberar</p>
          <p className="text-2xl font-bold text-foreground">{totalItens}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Liberadas Hoje</p>
          <p className="text-2xl font-bold text-success">{liberadas.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Parciais</p>
          <p className="text-2xl font-bold text-info">{sms.filter(s => s.status === 'parcial').length}</p>
        </CardContent></Card>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar SM, solicitante, setor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {/* Lista de SMs pendentes */}
      {smsFiltradas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Nenhuma SM pendente de liberação</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {smsFiltradas.map(sm => (
            <Card key={sm.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{sm.numero}</p>
                      <p className="text-sm text-muted-foreground">{sm.solicitante} — {sm.setor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">{sm.itens.length} itens</Badge>
                    <Button size="sm" onClick={() => abrirLiberacao(sm)}>
                      <Check className="h-4 w-4 mr-1" />Liberar
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Solicitado: {new Date(sm.data).toLocaleDateString('pt-BR')}</span>
                  <span>Autorizado: {new Date(sm.dataAutorizacao).toLocaleDateString('pt-BR')} por {sm.autorizadoPor}</span>
                  {sm.observacao && <span className="text-accent">• {sm.observacao}</span>}
                </div>
                {/* Preview dos itens */}
                <div className="mt-3 space-y-1">
                  {sm.itens.map(it => (
                    <div key={it.id} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/30 rounded">
                      <span className="text-foreground">{it.descricao} <span className="text-muted-foreground text-xs">({it.codigo})</span></span>
                      <span className="text-muted-foreground">{it.quantidadeSolicitada} {it.unidade} <span className="text-xs">(disp: {it.saldoDisponivel})</span></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recentemente liberadas */}
      {liberadas.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recentemente Liberadas</h2>
          <div className="space-y-2">
            {liberadas.map(sm => (
              <Card key={sm.id} className="opacity-75">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-semibold text-foreground">{sm.numero}</p>
                      <p className="text-xs text-muted-foreground">{sm.solicitante} — {sm.setor}</p>
                    </div>
                  </div>
                  <Badge variant={sm.status === 'liberada' ? 'success' : 'secondary'}>{sm.status === 'liberada' ? 'Totalmente Liberada' : 'Parcialmente Liberada'}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ══ Dialog Liberação ════════════════════════ */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {smSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />Liberar {smSelecionada.numero}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-3 text-sm">
                <div><span className="text-muted-foreground">Solicitante:</span><p className="font-medium text-foreground">{smSelecionada.solicitante}</p></div>
                <div><span className="text-muted-foreground">Setor:</span><p className="font-medium text-foreground">{smSelecionada.setor}</p></div>
                <div><span className="text-muted-foreground">Autorizado por:</span><p className="text-foreground">{smSelecionada.autorizadoPor}</p></div>
                <div><span className="text-muted-foreground">Data:</span><p className="text-foreground">{new Date(smSelecionada.dataAutorizacao).toLocaleDateString('pt-BR')}</p></div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Itens — Informe a quantidade a liberar</p>
                <div className="space-y-3">
                  {smSelecionada.itens.map(it => {
                    const qtdLib = quantidades[it.id] || 0;
                    const excede = qtdLib > it.saldoDisponivel;
                    return (
                      <div key={it.id} className="p-3 bg-muted/30 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground text-sm">{it.descricao}</p>
                            <p className="text-xs text-muted-foreground">{it.codigo} · {it.unidade}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Solicitado: <strong className="text-foreground">{it.quantidadeSolicitada}</strong></p>
                            <p>Disponível: <strong className={it.saldoDisponivel < it.quantidadeSolicitada ? 'text-warning' : 'text-success'}>{it.saldoDisponivel}</strong></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Liberar:</Label>
                          <Input
                            type="number"
                            min={0}
                            max={it.saldoDisponivel}
                            value={qtdLib}
                            onChange={e => setQuantidades(prev => ({ ...prev, [it.id]: parseInt(e.target.value) || 0 }))}
                            className={`h-9 w-24 text-sm ${excede ? 'border-destructive' : ''}`}
                          />
                          {excede && <span className="text-xs text-destructive">Excede saldo!</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button onClick={confirmarLiberacao} disabled={Object.values(quantidades).every(v => v === 0)}>
                  <Check className="h-4 w-4 mr-1" />Confirmar Liberação
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
