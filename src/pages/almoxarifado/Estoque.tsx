import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, PackageOpen, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_ESTOQUE = [
  { id: '1', codigo: '339030-07-001', descricao: 'Papel A4 500fls', unidade: 'Resma', saldoAnterior: 100, entradas: 50, saidas: 30, saldoAtual: 120, subElemento: '07', valorMedio: 22.50 },
  { id: '2', codigo: '339030-07-002', descricao: 'Caneta esferográfica azul', unidade: 'Un', saldoAnterior: 500, entradas: 200, saidas: 150, saldoAtual: 550, subElemento: '07', valorMedio: 1.80 },
  { id: '3', codigo: '339030-22-001', descricao: 'Detergente neutro 500ml', unidade: 'Un', saldoAnterior: 80, entradas: 100, saidas: 60, saldoAtual: 120, subElemento: '22', valorMedio: 3.50 },
  { id: '4', codigo: '339030-17-001', descricao: 'Toner HP 85A', unidade: 'Un', saldoAnterior: 10, entradas: 20, saidas: 8, saldoAtual: 22, subElemento: '17', valorMedio: 89.00 },
  { id: '5', codigo: '339030-25-001', descricao: 'Béquer 250ml', unidade: 'Un', saldoAnterior: 15, entradas: 10, saidas: 3, saldoAtual: 22, subElemento: '25', valorMedio: 35.00 },
];

const SUB_ELEMENTOS = [
  { codigo: '07', descricao: 'Material de Expediente' },
  { codigo: '17', descricao: 'Material de Processamento de Dados' },
  { codigo: '22', descricao: 'Material de Limpeza e Prod. Higienização' },
  { codigo: '25', descricao: 'Material p/ Manutenção de Bens Móveis' },
];

export default function Estoque() {
  const [busca, setBusca] = useState('');
  const [subElementoFiltro, setSubElementoFiltro] = useState<string>('todos');
  const [aglutinar, setAglutinar] = useState(false);

  const itensFiltrados = MOCK_ESTOQUE.filter(item => {
    const matchBusca = item.descricao.toLowerCase().includes(busca.toLowerCase()) || item.codigo.includes(busca);
    const matchSub = subElementoFiltro === 'todos' || item.subElemento === subElementoFiltro;
    return matchBusca && matchSub;
  });

  const totais = itensFiltrados.reduce((acc, item) => ({
    saldoAnterior: acc.saldoAnterior + item.saldoAnterior * item.valorMedio,
    entradas: acc.entradas + item.entradas * item.valorMedio,
    saidas: acc.saidas + item.saidas * item.valorMedio,
    saldoAtual: acc.saldoAtual + item.saldoAtual * item.valorMedio,
  }), { saldoAnterior: 0, entradas: 0, saidas: 0, saldoAtual: 0 });

  // Aglutinação por subelemento
  const dadosAglutinados = aglutinar
    ? SUB_ELEMENTOS.map(sub => {
        const itens = MOCK_ESTOQUE.filter(i => i.subElemento === sub.codigo);
        return {
          subElemento: sub.codigo,
          descricao: sub.descricao,
          saldoAnterior: itens.reduce((s, i) => s + i.saldoAnterior * i.valorMedio, 0),
          entradas: itens.reduce((s, i) => s + i.entradas * i.valorMedio, 0),
          saidas: itens.reduce((s, i) => s + i.saidas * i.valorMedio, 0),
          saldoAtual: itens.reduce((s, i) => s + i.saldoAtual * i.valorMedio, 0),
        };
      }).filter(d => d.saldoAtual > 0)
    : null;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque — Almoxarifado</h1>
        <div className="flex gap-2">
          <Button variant={aglutinar ? 'default' : 'outline'} size="sm" onClick={() => setAglutinar(!aglutinar)}>
            <ArrowUpDown className="h-4 w-4 mr-1" /> Aglutinar Subelemento
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar item..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select
          value={subElementoFiltro}
          onChange={e => setSubElementoFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos os subelementos</option>
          {SUB_ELEMENTOS.map(s => (
            <option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>
          ))}
        </select>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Saldo Anterior</p>
          <p className="text-lg font-bold text-foreground">{fmt(totais.saldoAnterior)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-lg font-bold text-success">{fmt(totais.entradas)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Saídas</p>
          <p className="text-lg font-bold text-destructive">{fmt(totais.saidas)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Saldo Atual</p>
          <p className="text-lg font-bold text-primary">{fmt(totais.saldoAtual)}</p>
        </CardContent></Card>
      </div>

      {/* Tabela */}
      {aglutinar && dadosAglutinados ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Subelemento</th>
                    <th className="text-right p-3 font-medium">Saldo Anterior</th>
                    <th className="text-right p-3 font-medium">Entradas</th>
                    <th className="text-right p-3 font-medium">Saídas</th>
                    <th className="text-right p-3 font-medium">Saldo Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosAglutinados.map(d => (
                    <tr key={d.subElemento} className="border-b hover:bg-muted/30">
                      <td className="p-3"><Badge variant="outline">{d.subElemento}</Badge> {d.descricao}</td>
                      <td className="p-3 text-right">{fmt(d.saldoAnterior)}</td>
                      <td className="p-3 text-right text-success">{fmt(d.entradas)}</td>
                      <td className="p-3 text-right text-destructive">{fmt(d.saidas)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(d.saldoAtual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Código</th>
                    <th className="text-left p-3 font-medium">Descrição</th>
                    <th className="text-center p-3 font-medium">Un</th>
                    <th className="text-right p-3 font-medium">Sld Ant</th>
                    <th className="text-right p-3 font-medium">Entradas</th>
                    <th className="text-right p-3 font-medium">Saídas</th>
                    <th className="text-right p-3 font-medium">Saldo</th>
                    <th className="text-right p-3 font-medium">Vlr Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map(item => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 cursor-pointer">
                      <td className="p-3"><Badge variant="outline" className="font-mono text-xs">{item.codigo}</Badge></td>
                      <td className="p-3">{item.descricao}</td>
                      <td className="p-3 text-center">{item.unidade}</td>
                      <td className="p-3 text-right">{item.saldoAnterior}</td>
                      <td className="p-3 text-right text-success">{item.entradas}</td>
                      <td className="p-3 text-right text-destructive">{item.saidas}</td>
                      <td className="p-3 text-right font-semibold">{item.saldoAtual}</td>
                      <td className="p-3 text-right">{fmt(item.valorMedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
