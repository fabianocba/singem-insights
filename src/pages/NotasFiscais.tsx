import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Plus, Search, Receipt, Eye, Edit2, Check, X, Filter, ScanBarcode, ArrowRight, ArrowLeft, Link2, CheckCircle2, AlertTriangle, Loader2, Upload, FileText, Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import type { ModuloId } from "../types";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────
type StatusNF = 'pendente' | 'vinculada' | 'aceita' | 'rejeitada';

interface ItemEmpenhoMock {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  saldoDisponivel: number;
  catmat?: string;
}

interface ItemNF {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  validado?: boolean;
  catmat?: string;
  empenhoItemId?: string; // ID do item do empenho vinculado
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
  pdfNome?: string;
  pdfUrl?: string;
}

type StepRegistro = 'chave' | 'revisao' | 'empenho' | 'itens' | 'validacao';

// ── NFe key parser ─────────────────────────────────
function parseChaveNFe(chave: string) {
  const clean = chave.replace(/\s/g, '');
  if (clean.length !== 44 || !/^\d{44}$/.test(clean)) return null;

  const uf = clean.substring(0, 2);
  const aamm = clean.substring(2, 6);
  const cnpj = clean.substring(6, 20);
  const modelo = clean.substring(20, 22);
  const serie = clean.substring(22, 25);
  const numero = clean.substring(25, 34);
  const tpEmis = clean.substring(34, 35);
  const cNF = clean.substring(35, 43);
  const dv = clean.substring(43, 44);

  const ano = `20${aamm.substring(0, 2)}`;
  const mes = aamm.substring(2, 4);

  const cnpjFmt = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

  return {
    uf, ano, mes, cnpj: cnpjFmt, cnpjRaw: cnpj,
    modelo, serie: String(parseInt(serie)),
    numero: String(parseInt(numero)),
    tpEmis, cNF, dv,
    dataEmissao: `${ano}-${mes}-01`,
  };
}

// ── Mock empenhos for linking ──────────────────────
const MOCK_EMPENHOS = [
  { numero: '2026NE000045', fornecedor: 'Distribuidora Alpha', cnpj: '12.345.678/0001-90', valor: 12000, saldo: 4500 },
  { numero: '2026NE000046', fornecedor: 'Tech Supplies LTDA', cnpj: '98.765.432/0001-10', valor: 25000, saldo: 11000 },
  { numero: '2026NE000047', fornecedor: 'Papelaria Central', cnpj: '11.222.333/0001-44', valor: 8000, saldo: 3800 },
  { numero: '2026NE000048', fornecedor: 'Info Norte LTDA', cnpj: '55.666.777/0001-88', valor: 18000, saldo: 18000 },
];

// ── Mock NFs ───────────────────────────────────────
const MOCK_NFS: NotaFiscal[] = [
  {
    id: '1', numero: '001234', serie: '1', fornecedor: 'Distribuidora Alpha', cnpj: '12.345.678/0001-90',
    empenhoNumero: '2026NE000045', valor: 7500, dataEmissao: '2026-03-10', dataEntrada: '2026-03-15',
    chaveNFe: '29260612345678000190550010012340001001234560', status: 'aceita', observacao: 'Entrega parcial',
    itens: [
      { id: 'n1', descricao: 'Papel A4 500fls', unidade: 'Resma', quantidade: 50, valorUnitario: 25.00, validado: true },
      { id: 'n2', descricao: 'Grampeador 26/6', unidade: 'Un', quantidade: 50, valorUnitario: 32.00, validado: true },
      { id: 'n3', descricao: 'Clips niquelado cx', unidade: 'Cx', quantidade: 100, valorUnitario: 4.50, validado: true },
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
      { id: 'n7', descricao: 'Papel ofício 500fls', unidade: 'Resma', quantidade: 100, valorUnitario: 28.00, validado: true },
      { id: 'n8', descricao: 'Envelope A4 pardo', unidade: 'Cx', quantidade: 40, valorUnitario: 35.00, validado: true },
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

const UF_NAMES: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

// ── Simulated item extraction from NFe ─────────────
function simulateNFeItems(numero: string): ItemNF[] {
  const seed = parseInt(numero) || 1;
  const items: ItemNF[] = [];
  const produtos = [
    { d: 'Papel A4 Chamex 500fls', u: 'Resma', v: 24.90 },
    { d: 'Caneta esferográfica azul cx12', u: 'Cx', v: 18.50 },
    { d: 'Toner HP 85A compatível', u: 'Un', v: 89.00 },
    { d: 'Envelope pardo A4 cx100', u: 'Cx', v: 35.00 },
    { d: 'Grampeador 26/6 metal', u: 'Un', v: 32.00 },
    { d: 'Clips niquelado nº3 cx100', u: 'Cx', v: 4.50 },
    { d: 'Pasta suspensa cx50', u: 'Cx', v: 42.00 },
    { d: 'Mouse USB óptico', u: 'Un', v: 28.00 },
  ];
  const count = (seed % 4) + 2;
  for (let i = 0; i < count; i++) {
    const p = produtos[(seed + i) % produtos.length];
    items.push({
      id: `ext-${Date.now()}-${i}`,
      descricao: p.d,
      unidade: p.u,
      quantidade: ((seed + i) % 10) + 5,
      valorUnitario: p.v,
      validado: false,
    });
  }
  return items;
}

// ── Simulated supplier lookup ──────────────────────
function simulateFornecedor(cnpjRaw: string) {
  const match = MOCK_EMPENHOS.find(e => e.cnpj.replace(/\D/g, '') === cnpjRaw);
  return match?.fornecedor || `Fornecedor CNPJ ${cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}`;
}

// ════════════════════════════════════════════════════
// STEP INDICATORS
// ════════════════════════════════════════════════════
const STEPS: { key: StepRegistro; label: string; icon: React.ReactNode }[] = [
  { key: 'chave', label: 'Chave NFe', icon: <ScanBarcode className="h-4 w-4" /> },
  { key: 'revisao', label: 'Revisão', icon: <Eye className="h-4 w-4" /> },
  { key: 'empenho', label: 'Empenho', icon: <Link2 className="h-4 w-4" /> },
  { key: 'itens', label: 'Itens', icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'validacao', label: 'Validação', icon: <Check className="h-4 w-4" /> },
];

function StepIndicator({ currentStep }: { currentStep: StepRegistro }) {
  const idx = STEPS.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i < idx ? 'bg-primary/20 text-primary' :
            i === idx ? 'bg-primary text-primary-foreground' :
            'bg-muted text-muted-foreground'
          }`}>
            {step.icon}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════
export default function NotasFiscais({ modulo }: { modulo: ModuloId }) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [nfs, setNfs] = useState<NotaFiscal[]>(MOCK_NFS);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [detalhe, setDetalhe] = useState<NotaFiscal | null>(null);
  const [form, setForm] = useState<Partial<NotaFiscal>>({});
  const [formItens, setFormItens] = useState<ItemNF[]>([]);

  // ── Multi-step state ────────────────────────────
  const [step, setStep] = useState<StepRegistro>('chave');
  const [chaveInput, setChaveInput] = useState('');
  const [chaveValida, setChaveValida] = useState<boolean | null>(null);
  const [lendo, setLendo] = useState(false);
  const [empenhoSelecionado, setEmpenhoSelecionado] = useState<string>('');
  const [buscaEmpenho, setBuscaEmpenho] = useState('');
  const chaveRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const nfsFiltradas = nfs.filter(nf => {
    const matchBusca = nf.numero.includes(busca) || nf.fornecedor.toLowerCase().includes(busca.toLowerCase()) || nf.empenhoNumero.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || nf.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // KPIs
  const totalNFs = nfs.length;
  const pendentes = nfs.filter(n => n.status === 'pendente').length;
  const aceitas = nfs.filter(n => n.status === 'aceita').length;
  const valorTotalAceito = nfs.filter(n => n.status === 'aceita').reduce((s, n) => s + n.valor, 0);

  // ── Handlers ────────────────────────────────────
  function abrirNova() {
    setForm({ status: 'pendente', serie: '1' });
    setFormItens([]);
    setEditando(true);
    setDetalhe(null);
    setStep('chave');
    setChaveInput('');
    setChaveValida(null);
    setEmpenhoSelecionado('');
    setBuscaEmpenho('');
    setPdfFile(null);
    setDialogAberto(true);
    setTimeout(() => chaveRef.current?.focus(), 200);
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
    setStep('revisao');
    setChaveInput(nf.chaveNFe || '');
    setChaveValida(true);
    setEmpenhoSelecionado(nf.empenhoNumero || '');
    setDialogAberto(true);
  }

  // ── Chave NFe processing ────────────────────────
  const processarChave = useCallback((valor: string) => {
    const clean = valor.replace(/\s/g, '');
    setChaveInput(clean);

    if (clean.length === 44) {
      setLendo(true);
      // Simulate barcode reader delay
      setTimeout(() => {
        const parsed = parseChaveNFe(clean);
        if (parsed) {
          const fornecedor = simulateFornecedor(parsed.cnpjRaw);
          const itens = simulateNFeItems(parsed.numero);
          const valorTotal = itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0);

          setForm({
            numero: parsed.numero,
            serie: parsed.serie,
            cnpj: parsed.cnpj,
            fornecedor,
            dataEmissao: parsed.dataEmissao,
            chaveNFe: clean,
            status: 'pendente',
            valor: valorTotal,
          });
          setFormItens(itens);
          setChaveValida(true);
          toast.success('Chave NFe lida com sucesso!', {
            description: `NF ${parsed.numero} — ${fornecedor}`,
          });
          // Auto-advance after brief pause
          setTimeout(() => setStep('revisao'), 600);
        } else {
          setChaveValida(false);
          toast.error('Chave NFe inválida', { description: 'Verifique os 44 dígitos.' });
        }
        setLendo(false);
      }, 800);
    } else {
      setChaveValida(null);
    }
  }, []);

  function toggleItemValidado(idx: number) {
    setFormItens(prev => prev.map((it, i) => i === idx ? { ...it, validado: !it.validado } : it));
  }

  function atualizarItem(idx: number, campo: string, valor: string | number) {
    setFormItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  }

  function adicionarItem() {
    setFormItens(prev => [...prev, { id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0, validado: false }]);
  }

  function removerItem(idx: number) {
    setFormItens(prev => prev.filter((_, i) => i !== idx));
  }

  const todosItensValidados = formItens.length > 0 && formItens.every(it => it.validado);
  const valorTotalNF = formItens.reduce((s, it) => s + (it.quantidade || 0) * (it.valorUnitario || 0), 0);

  // ── Validation checks ──────────────────────────
  const problemas: string[] = [];
  if (!form.numero) problemas.push('Número da NF não informado');
  if (!form.cnpj) problemas.push('CNPJ do fornecedor não identificado');
  if (!form.fornecedor) problemas.push('Fornecedor não identificado');
  if (formItens.length === 0) problemas.push('Nenhum item na nota fiscal');
  if (!todosItensValidados) problemas.push('Nem todos os itens foram validados');
  if (!empenhoSelecionado) problemas.push('Nota não vinculada a empenho');

  function salvarNF() {
    if (problemas.length > 0 && !todosItensValidados) {
      toast.error('Corrija os problemas antes de salvar');
      return;
    }

    const novaNF: NotaFiscal = {
      ...form,
      id: form.id || `nf${Date.now()}`,
      valor: valorTotalNF,
      itens: formItens,
      empenhoNumero: empenhoSelecionado,
      dataEntrada: new Date().toISOString().slice(0, 10),
      status: empenhoSelecionado ? 'vinculada' : 'pendente',
      pdfNome: pdfFile?.name || form.pdfNome,
      pdfUrl: pdfFile ? URL.createObjectURL(pdfFile) : form.pdfUrl,
    } as NotaFiscal;

    if (form.id) {
      setNfs(prev => prev.map(n => n.id === form.id ? novaNF : n));
      toast.success('Nota fiscal atualizada!');
    } else {
      setNfs(prev => [novaNF, ...prev]);
      toast.success('Nota fiscal registrada com sucesso!', {
        description: `NF ${novaNF.numero} — ${fmt(novaNF.valor)}`,
      });
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

  function exportarPdfNF(nf: NotaFiscal) {
    // Generate a printable HTML and open print dialog
    const itensHtml = nf.itens.map(it => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee">${it.descricao}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${it.unidade}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${it.quantidade}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${fmt(it.valorUnitario)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(it.quantidade * it.valorUnitario)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NF ${nf.numero}</title>
      <style>body{font-family:Inter,Arial,sans-serif;margin:40px;color:#1a1a1a}
      h1{font-size:20px;color:#377566;margin-bottom:4px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #377566;padding-bottom:16px;margin-bottom:20px}
      .badge{background:#377566;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{text-align:left;padding:8px 6px;border-bottom:2px solid #377566;font-size:13px;color:#377566}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
      .field{font-size:13px}.field label{color:#666;font-size:11px;display:block;margin-bottom:2px}
      .field p{margin:0;font-weight:600}.chave{font-family:monospace;font-size:11px;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:6px;margin:12px 0}
      .total{text-align:right;font-size:18px;font-weight:700;margin-top:12px;padding-top:8px;border-top:2px solid #377566}
      .footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
      @media print{body{margin:20px}}</style></head><body>
      <div class="header"><div><h1>NOTA FISCAL Nº ${nf.numero} — Série ${nf.serie}</h1>
      <p style="margin:0;font-size:13px;color:#666">SINGEM — Sistema Inteligente de Gestão de Materiais</p></div>
      <span class="badge">${statusLabel[nf.status].toUpperCase()}</span></div>
      <div class="grid">
        <div class="field"><label>Fornecedor</label><p>${nf.fornecedor}</p></div>
        <div class="field"><label>CNPJ</label><p>${nf.cnpj}</p></div>
        <div class="field"><label>Data Emissão</label><p>${new Date(nf.dataEmissao).toLocaleDateString('pt-BR')}</p></div>
        <div class="field"><label>Data Entrada</label><p>${nf.dataEntrada ? new Date(nf.dataEntrada).toLocaleDateString('pt-BR') : '—'}</p></div>
        <div class="field"><label>Empenho Vinculado</label><p>${nf.empenhoNumero || 'Não vinculado'}</p></div>
        <div class="field"><label>Status</label><p>${statusLabel[nf.status]}</p></div>
      </div>
      ${nf.chaveNFe ? `<div class="chave"><strong>Chave NFe:</strong> ${nf.chaveNFe}</div>` : ''}
      <h3 style="font-size:14px;color:#377566;margin-bottom:4px">Itens (${nf.itens.length})</h3>
      <table><thead><tr><th>Descrição</th><th style="text-align:center">Un</th><th style="text-align:right">Qtd</th><th style="text-align:right">Vlr Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${itensHtml}</tbody></table>
      <div class="total">VALOR TOTAL: ${fmt(nf.valor)}</div>
      ${nf.observacao ? `<p style="margin-top:16px;font-size:13px"><strong>Observação:</strong> ${nf.observacao}</p>` : ''}
      <div class="footer">Gerado pelo SINGEM em ${new Date().toLocaleString('pt-BR')} — IF Baiano</div>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
    toast.success('PDF gerado para impressão/download');
  }

  const empenhosMatch = MOCK_EMPENHOS.filter(e => {
    if (!buscaEmpenho) return true;
    return e.numero.toLowerCase().includes(buscaEmpenho.toLowerCase()) ||
      e.fornecedor.toLowerCase().includes(buscaEmpenho.toLowerCase());
  });

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
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
          <p className="text-lg font-bold text-foreground">{fmt(valorTotalAceito)}</p>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editando ? (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Nota Fiscal" : "Registrar Nota Fiscal"}</DialogTitle>
              </DialogHeader>

              <StepIndicator currentStep={step} />

              {/* ─── STEP 1: Chave NFe ─── */}
              {step === 'chave' && (
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ScanBarcode className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Leitura da Chave de Acesso NFe</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Posicione o cursor no campo abaixo e utilize o leitor de código de barras para ler a chave da NFe.
                      Os dados serão extraídos automaticamente.
                    </p>
                  </div>

                  <div className="max-w-lg mx-auto space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Chave de Acesso NFe (44 dígitos)</Label>
                      <div className="relative mt-1">
                        <Input
                          ref={chaveRef}
                          value={chaveInput}
                          onChange={e => processarChave(e.target.value)}
                          placeholder="Escaneie ou cole a chave de 44 dígitos..."
                          className={`font-mono text-center text-lg h-14 tracking-wider ${
                            chaveValida === true ? 'border-green-500 bg-green-500/5' :
                            chaveValida === false ? 'border-destructive bg-destructive/5' : ''
                          }`}
                          autoFocus
                        />
                        {lendo && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {chaveInput.replace(/\s/g, '').length}/44 dígitos {chaveInput.length !== chaveInput.replace(/\s/g, '').length && '(espaços ignorados)'}
                      </p>
                    </div>

                    {chaveValida === true && (
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-1">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Chave válida — dados extraídos
                        </div>
                        <p className="text-sm text-muted-foreground">
                          NF {form.numero} · Série {form.serie} · {form.fornecedor} · UF {UF_NAMES[chaveInput.substring(0, 2)] || chaveInput.substring(0, 2)}
                        </p>
                      </div>
                    )}

                    {chaveValida === false && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          Chave inválida — verifique os dígitos
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setForm({ status: 'pendente', serie: '1' });
                          setFormItens([{ id: `tmp-${Date.now()}`, descricao: '', unidade: 'Un', quantidade: 1, valorUnitario: 0, validado: false }]);
                          setStep('revisao');
                        }}
                      >
                        Preencher manualmente
                      </Button>
                      <Button
                        onClick={() => setStep('revisao')}
                        disabled={!chaveValida}
                      >
                        Avançar <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Revisão dos dados ─── */}
              {step === 'revisao' && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Revise e corrija os dados extraídos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Nº NF *</Label><Input value={form.numero || ''} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} /></div>
                    <div><Label>Série</Label><Input value={form.serie || ''} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))} /></div>
                    <div><Label>Fornecedor *</Label><Input value={form.fornecedor || ''} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
                    <div><Label>CNPJ *</Label><Input value={form.cnpj || ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
                    <div><Label>Data Emissão</Label><Input type="date" value={form.dataEmissao || ''} onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))} /></div>
                    <div><Label>Chave NFe</Label><Input value={form.chaveNFe || ''} className="font-mono text-xs" readOnly disabled /></div>
                    <div className="md:col-span-2"><Label>Observação</Label><Input value={form.observacao || ''} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} /></div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('chave')}>
                      <ArrowLeft className="h-4 w-4 mr-1" />Voltar
                    </Button>
                    <Button onClick={() => setStep('empenho')} disabled={!form.numero || !form.fornecedor}>
                      Avançar <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: Vinculação com Empenho ─── */}
              {step === 'empenho' && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Vincular com Nota de Empenho</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione o empenho correspondente a esta nota fiscal.
                  </p>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número do empenho ou fornecedor..."
                      value={buscaEmpenho}
                      onChange={e => setBuscaEmpenho(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {empenhosMatch.map(emp => (
                      <div
                        key={emp.numero}
                        onClick={() => setEmpenhoSelecionado(emp.numero === empenhoSelecionado ? '' : emp.numero)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          empenhoSelecionado === emp.numero
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono font-semibold text-foreground">{emp.numero}</p>
                            <p className="text-sm text-muted-foreground">{emp.fornecedor} — {emp.cnpj}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{fmt(emp.valor)}</p>
                            <p className="text-xs text-muted-foreground">Saldo: {fmt(emp.saldo)}</p>
                          </div>
                        </div>
                        {empenhoSelecionado === emp.numero && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                            <CheckCircle2 className="h-3 w-3" />Empenho selecionado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('revisao')}>
                      <ArrowLeft className="h-4 w-4 mr-1" />Voltar
                    </Button>
                    <div className="flex gap-2">
                      {!empenhoSelecionado && (
                        <Button variant="ghost" onClick={() => setStep('itens')}>
                          Pular (sem empenho)
                        </Button>
                      )}
                      <Button onClick={() => setStep('itens')} disabled={false}>
                        Avançar <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 4: Validação de Itens ─── */}
              {step === 'itens' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Validação dos Itens</h3>
                      <p className="text-sm text-muted-foreground">
                        Confira cada item e marque como validado. Você pode editar quantidades e valores.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={adicionarItem}>
                      <Plus className="h-3 w-3 mr-1" />Adicionar Item
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formItens.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition-all ${
                          item.validado
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 md:col-span-4">
                            <Label className="text-xs">Descrição</Label>
                            <Input value={item.descricao || ''} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} className="h-9 text-sm" />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Unidade</Label>
                            <Input value={item.unidade || ''} onChange={e => atualizarItem(idx, 'unidade', e.target.value)} className="h-9 text-sm" />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Qtd</Label>
                            <Input type="number" value={item.quantidade || ''} onChange={e => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Vlr Unit.</Label>
                            <Input type="number" step="0.01" value={item.valorUnitario || ''} onChange={e => atualizarItem(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                          </div>
                          <div className="col-span-3 md:col-span-2 flex gap-1 justify-end">
                            <Button
                              variant={item.validado ? "default" : "outline"}
                              size="sm"
                              className="h-9"
                              onClick={() => toggleItemValidado(idx)}
                              title={item.validado ? 'Desmarcar validação' : 'Validar item'}
                            >
                              <CheckCircle2 className={`h-4 w-4 ${item.validado ? '' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => removerItem(idx)} className="h-9 w-9">
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs">
                          <span className={item.validado ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                            {item.validado ? '✓ Item validado' : 'Aguardando validação'}
                          </span>
                          <span className="font-medium text-foreground">
                            Subtotal: {fmt((item.quantidade || 0) * (item.valorUnitario || 0))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      {formItens.filter(i => i.validado).length}/{formItens.length} itens validados
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-lg font-bold text-foreground">{fmt(valorTotalNF)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('empenho')}>
                      <ArrowLeft className="h-4 w-4 mr-1" />Voltar
                    </Button>
                    <Button onClick={() => setStep('validacao')}>
                      Avançar <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── STEP 5: Validação Final ─── */}
              {step === 'validacao' && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Validação Final da Nota Fiscal</h3>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Nº NF</span>
                      <p className="font-mono font-semibold text-foreground">{form.numero || '—'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Série</span>
                      <p className="font-semibold text-foreground">{form.serie || '—'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Fornecedor</span>
                      <p className="font-semibold text-foreground">{form.fornecedor || '—'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">CNPJ</span>
                      <p className="font-mono font-semibold text-foreground">{form.cnpj || '—'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Empenho</span>
                      <p className="font-mono font-semibold text-foreground">{empenhoSelecionado || 'Não vinculado'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Valor Total</span>
                      <p className="font-bold text-foreground text-lg">{fmt(valorTotalNF)}</p>
                    </div>
                  </div>

                  {/* Chave */}
                  {form.chaveNFe && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">Chave NFe</span>
                      <p className="font-mono text-xs text-foreground break-all">{form.chaveNFe}</p>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Itens ({formItens.length})</span>
                    <div className="mt-2 space-y-1">
                      {formItens.map((it, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="flex items-center gap-1 text-foreground">
                            {it.validado ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                            {it.descricao}
                          </span>
                          <span className="font-medium text-foreground">{it.quantidade} × {fmt(it.valorUnitario)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Problemas */}
                  {problemas.length > 0 && (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Atenção — {problemas.length} pendência(s)
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {problemas.map((p, i) => <li key={i}>• {p}</li>)}
                      </ul>
                    </div>
                  )}

                  {problemas.length === 0 && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Nota fiscal pronta para registro!
                      </div>
                    </div>
                  )}

                  {/* PDF Upload */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF da Nota Fiscal
                    </h4>
                    {pdfFile ? (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{pdfFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(pdfFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setPdfFile(null)} title="Remover PDF">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-foreground">Clique para anexar o PDF da NF</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, máx. 10MB</p>
                        <input
                          ref={pdfInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error('Arquivo muito grande', { description: 'Máximo 10MB.' });
                                return;
                              }
                              if (file.type !== 'application/pdf') {
                                toast.error('Formato inválido', { description: 'Apenas arquivos PDF.' });
                                return;
                              }
                              setPdfFile(file);
                              toast.success('PDF anexado!', { description: file.name });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('itens')}>
                      <ArrowLeft className="h-4 w-4 mr-1" />Voltar
                    </Button>
                    <Button onClick={salvarNF} className="min-w-[180px]">
                      <Check className="h-4 w-4 mr-1" />
                      {form.id ? 'Atualizar NF' : 'Registrar Nota Fiscal'}
                    </Button>
                  </div>
                </div>
              )}
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

              {/* PDF anexado */}
              {detalhe.pdfNome && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> PDF da Nota Fiscal
                  </p>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{detalhe.pdfNome}</p>
                    </div>
                    {detalhe.pdfUrl && (
                      <Button size="sm" variant="outline" onClick={() => window.open(detalhe.pdfUrl, '_blank')}>
                        <Eye className="h-4 w-4 mr-1" />Visualizar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Ações */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {(detalhe.status === 'pendente' || detalhe.status === 'vinculada') && (
                  <>
                    <Button variant="destructive" onClick={() => rejeitarNF(detalhe.id)}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                    <Button variant="default" onClick={() => aceitarNF(detalhe.id)}><Check className="h-4 w-4 mr-1" />Aceitar e Dar Entrada</Button>
                  </>
                )}
                <Button variant="outline" onClick={() => exportarPdfNF(detalhe)}>
                  <Download className="h-4 w-4 mr-1" />Exportar PDF
                </Button>
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
