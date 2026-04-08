import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ── Tipos unificados ──────────────────────────────────────────────
export type TipoSolicitacao = 'almoxarifado' | 'patrimonio' | 'transportes' | 'servicos';
export type StatusSolicitacao = 'rascunho' | 'enviada' | 'aprovada' | 'rejeitada' | 'atendida' | 'parcial';

export interface ItemSolicitacao {
  id: string;
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
}

export interface SolicitacaoUnificada {
  id: string;
  numero: string;
  tipo: TipoSolicitacao;
  solicitante: string;
  setor: string;
  data: string;
  status: StatusSolicitacao;
  justificativa: string;
  observacao: string;
  aprovadoPor: string;
  dataAprovacao: string;
  itens: ItemSolicitacao[];
  // Campos específicos de veículo
  destino?: string;
  motivo?: string;
  dataViagem?: string;
  horaPartida?: string;
  horaRetorno?: string;
  passageiros?: number;
  tipoVeiculo?: string;
  veiculoDesignado?: string;
  motoristaDesignado?: string;
  // Campos específicos de serviço
  tipoServico?: string;
  prioridade?: string;
  descricaoServico?: string;
  local?: string;
  osGerada?: string;
}

// ── Dados iniciais ────────────────────────────────────────────────
const DADOS_INICIAIS: SolicitacaoUnificada[] = [
  // SM Almoxarifado
  { id: 'sm-1', numero: 'SM-2026-001', tipo: 'almoxarifado', solicitante: 'João Silva', setor: 'Coordenação de TI', data: '2026-04-01', status: 'enviada', justificativa: 'Reposição de material de escritório', observacao: '', aprovadoPor: '', dataAprovacao: '',
    itens: [
      { id: '1', codigo: '001.001', descricao: 'Resma papel A4', unidade: 'Resma', quantidade: 10 },
      { id: '2', codigo: '001.015', descricao: 'Caneta esferográfica azul', unidade: 'Cx', quantidade: 5 },
      { id: '3', codigo: '001.022', descricao: 'Grampeador de mesa', unidade: 'Un', quantidade: 2 },
    ] },
  { id: 'sm-2', numero: 'SM-2026-002', tipo: 'almoxarifado', solicitante: 'Maria Souza', setor: 'Lab. Química', data: '2026-04-03', status: 'aprovada', justificativa: 'Material para aulas práticas', observacao: 'Entregar até 10/04', aprovadoPor: 'Gestor Almox.', dataAprovacao: '2026-04-04',
    itens: [
      { id: '1', codigo: '003.005', descricao: 'Luva de procedimento M', unidade: 'Cx', quantidade: 20 },
      { id: '2', codigo: '003.012', descricao: 'Béquer 250ml', unidade: 'Un', quantidade: 10 },
    ] },
  { id: 'sm-3', numero: 'SM-2026-003', tipo: 'almoxarifado', solicitante: 'Carlos Oliveira', setor: 'Biblioteca', data: '2026-04-05', status: 'rascunho', justificativa: '', observacao: '', aprovadoPor: '', dataAprovacao: '',
    itens: [{ id: '1', codigo: '001.003', descricao: 'Envelope pardo A4', unidade: 'Un', quantidade: 50 }] },
  { id: 'sm-4', numero: 'SM-2026-004', tipo: 'almoxarifado', solicitante: 'Ana Lima', setor: 'Direção', data: '2026-04-06', status: 'atendida', justificativa: 'Reposição mensal', observacao: '', aprovadoPor: 'Gestor Almox.', dataAprovacao: '2026-04-06',
    itens: [
      { id: '1', codigo: '001.001', descricao: 'Resma papel A4', unidade: 'Resma', quantidade: 5 },
      { id: '2', codigo: '002.001', descricao: 'Toner HP 85A', unidade: 'Un', quantidade: 3 },
    ] },
  { id: 'sm-5', numero: 'SM-2026-005', tipo: 'almoxarifado', solicitante: 'Pedro Santos', setor: 'CGAE', data: '2026-04-07', status: 'rejeitada', justificativa: 'Necessidade de materiais', observacao: 'Item sem estoque', aprovadoPor: 'Gestor Almox.', dataAprovacao: '2026-04-07',
    itens: [{ id: '1', codigo: '004.010', descricao: 'Cartucho tinta preta', unidade: 'Un', quantidade: 10 }] },

  // SB Patrimônio
  { id: 'sb-1', numero: 'SB-2026-001', tipo: 'patrimonio', solicitante: 'Lucia Mendes', setor: 'Lab. Informática', data: '2026-04-01', status: 'enviada', justificativa: 'Substituição de equipamentos defeituosos', observacao: '', aprovadoPor: '', dataAprovacao: '',
    itens: [
      { id: '1', codigo: 'PAT-001', descricao: 'Monitor LED 24"', unidade: 'Un', quantidade: 3 },
      { id: '2', codigo: 'PAT-002', descricao: 'Teclado USB', unidade: 'Un', quantidade: 5 },
    ] },
  { id: 'sb-2', numero: 'SB-2026-002', tipo: 'patrimonio', solicitante: 'Roberto Alves', setor: 'Coordenação', data: '2026-04-03', status: 'aprovada', justificativa: 'Necessidade de novo mobiliário', observacao: '', aprovadoPor: 'Gestor Patrim.', dataAprovacao: '2026-04-04',
    itens: [
      { id: '1', codigo: 'PAT-015', descricao: 'Cadeira giratória', unidade: 'Un', quantidade: 2 },
      { id: '2', codigo: 'PAT-020', descricao: 'Mesa escritório 1.20m', unidade: 'Un', quantidade: 1 },
    ] },
  { id: 'sb-3', numero: 'SB-2026-003', tipo: 'patrimonio', solicitante: 'Fernanda Costa', setor: 'Direção', data: '2026-04-05', status: 'rascunho', justificativa: '', observacao: '', aprovadoPor: '', dataAprovacao: '',
    itens: [{ id: '1', codigo: 'PAT-030', descricao: 'Ar-condicionado Split 12000 BTUs', unidade: 'Un', quantidade: 1 }] },

  // SV Transportes
  { id: 'sv-1', numero: 'SV-2026-001', tipo: 'transportes', solicitante: 'João Silva', setor: 'Coordenação de TI', data: '2026-04-01', status: 'enviada', justificativa: 'Reunião institucional', observacao: '', aprovadoPor: '', dataAprovacao: '',
    destino: 'Itapetinga - Secretaria de Educação', motivo: 'Reunião institucional', dataViagem: '2026-04-10', horaPartida: '07:00', horaRetorno: '18:00', passageiros: 3, tipoVeiculo: 'Carro', veiculoDesignado: '', motoristaDesignado: '',
    itens: [{ id: '1', descricao: 'Viagem a Itapetinga', unidade: 'viagem', quantidade: 1 }] },
  { id: 'sv-2', numero: 'SV-2026-002', tipo: 'transportes', solicitante: 'Maria Souza', setor: 'Direção Geral', data: '2026-04-03', status: 'aprovada', justificativa: 'Capacitação servidores', observacao: 'Levar documentação', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-04',
    destino: 'Salvador - SETEC/MEC', motivo: 'Capacitação servidores', dataViagem: '2026-04-15', horaPartida: '05:00', horaRetorno: '22:00', passageiros: 8, tipoVeiculo: 'Micro-ônibus', veiculoDesignado: 'Micro-ônibus Volare', motoristaDesignado: 'Carlos Motorista',
    itens: [{ id: '1', descricao: 'Viagem a Salvador', unidade: 'viagem', quantidade: 1 }] },
  { id: 'sv-3', numero: 'SV-2026-003', tipo: 'transportes', solicitante: 'Carlos Oliveira', setor: 'CGAE', data: '2026-04-05', status: 'rascunho', justificativa: 'Visita técnica', observacao: '', aprovadoPor: '', dataAprovacao: '',
    destino: 'Vitória da Conquista', motivo: 'Visita técnica', dataViagem: '2026-04-20', horaPartida: '08:00', horaRetorno: '17:00', passageiros: 2, tipoVeiculo: 'Carro', veiculoDesignado: '', motoristaDesignado: '',
    itens: [{ id: '1', descricao: 'Viagem a Vitória da Conquista', unidade: 'viagem', quantidade: 1 }] },
  { id: 'sv-4', numero: 'SV-2026-004', tipo: 'transportes', solicitante: 'Ana Lima', setor: 'Ensino', data: '2026-04-06', status: 'rejeitada', justificativa: 'Aula de campo', observacao: 'Sem ônibus disponível na data', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-07',
    destino: 'Jequié', motivo: 'Aula de campo', dataViagem: '2026-04-12', horaPartida: '06:00', horaRetorno: '19:00', passageiros: 25, tipoVeiculo: 'Ônibus', veiculoDesignado: '', motoristaDesignado: '',
    itens: [{ id: '1', descricao: 'Viagem a Jequié', unidade: 'viagem', quantidade: 1 }] },
  { id: 'sv-5', numero: 'SV-2026-005', tipo: 'transportes', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '2026-04-07', status: 'atendida', justificativa: 'Manutenção de equipamentos', observacao: '', aprovadoPor: 'Coord. Transportes', dataAprovacao: '2026-04-07',
    destino: 'Guanambi - Campus IF Baiano', motivo: 'Manutenção de equipamentos', dataViagem: '2026-04-08', horaPartida: '07:30', horaRetorno: '16:00', passageiros: 2, tipoVeiculo: 'Carro', veiculoDesignado: 'Hilux HNS-1234', motoristaDesignado: 'José Motorista',
    itens: [{ id: '1', descricao: 'Viagem a Guanambi', unidade: 'viagem', quantidade: 1 }] },

  // SS Serviços
  { id: 'ss-1', numero: 'SS-2026-001', tipo: 'servicos', solicitante: 'Ana Lima', setor: 'Biblioteca', data: '2026-04-01', status: 'enviada', justificativa: 'Lâmpadas queimadas no setor de periódicos', observacao: '5 lâmpadas no corredor principal', aprovadoPor: '', dataAprovacao: '',
    tipoServico: 'Elétrica', prioridade: 'Alta', descricaoServico: 'Lâmpadas queimadas no setor de periódicos', local: 'Bloco B - Biblioteca', osGerada: '',
    itens: [{ id: '1', descricao: 'Troca de lâmpadas', unidade: 'serviço', quantidade: 1 }] },
  { id: 'ss-2', numero: 'SS-2026-002', tipo: 'servicos', solicitante: 'Pedro Santos', setor: 'Lab. Informática', data: '2026-04-02', status: 'aprovada', justificativa: 'Ar-condicionado do laboratório parou', observacao: 'Temperatura acima de 35°C', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-03',
    tipoServico: 'Ar-condicionado', prioridade: 'Urgente', descricaoServico: 'Ar-condicionado do laboratório parou de funcionar', local: 'Bloco C - Lab 02', osGerada: 'OS-2026-047',
    itens: [{ id: '1', descricao: 'Manutenção ar-condicionado', unidade: 'serviço', quantidade: 1 }] },
  { id: 'ss-3', numero: 'SS-2026-003', tipo: 'servicos', solicitante: 'Maria Souza', setor: 'Direção Geral', data: '2026-04-03', status: 'rascunho', justificativa: 'Pintura da sala de reuniões', observacao: '', aprovadoPor: '', dataAprovacao: '',
    tipoServico: 'Pintura', prioridade: 'Baixa', descricaoServico: 'Pintura da sala de reuniões', local: 'Bloco Principal - Sala 3', osGerada: '',
    itens: [{ id: '1', descricao: 'Pintura sala', unidade: 'serviço', quantidade: 1 }] },
  { id: 'ss-4', numero: 'SS-2026-004', tipo: 'servicos', solicitante: 'João Costa', setor: 'Coordenação', data: '2026-04-05', status: 'atendida', justificativa: 'Vazamento na torneira', observacao: 'Urgente, está molhando o piso', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-05',
    tipoServico: 'Hidráulica', prioridade: 'Alta', descricaoServico: 'Vazamento na torneira do banheiro do corredor', local: 'Bloco A - Térreo', osGerada: 'OS-2026-044',
    itens: [{ id: '1', descricao: 'Reparo hidráulico', unidade: 'serviço', quantidade: 1 }] },
  { id: 'ss-5', numero: 'SS-2026-005', tipo: 'servicos', solicitante: 'Lucia Mendes', setor: 'Refeitório', data: '2026-04-06', status: 'rejeitada', justificativa: 'Porta com fechadura emperrada', observacao: 'Serviço de competência da empresa terceirizada', aprovadoPor: 'Gestor Serviços', dataAprovacao: '2026-04-07',
    tipoServico: 'Manutenção Geral', prioridade: 'Normal', descricaoServico: 'Porta do depósito com fechadura emperrada', local: 'Refeitório - Depósito', osGerada: '',
    itens: [{ id: '1', descricao: 'Reparo fechadura', unidade: 'serviço', quantidade: 1 }] },
];

// ── Contadores por tipo ───────────────────────────────────────────
const contadoresPorTipo: Record<TipoSolicitacao, number> = {
  almoxarifado: 6,
  patrimonio: 4,
  transportes: 6,
  servicos: 6,
};

// ── Context ───────────────────────────────────────────────────────
interface SolicitacoesContextType {
  solicitacoes: SolicitacaoUnificada[];
  getPorTipo: (tipo: TipoSolicitacao) => SolicitacaoUnificada[];
  adicionar: (sol: Omit<SolicitacaoUnificada, 'id' | 'numero' | 'data' | 'aprovadoPor' | 'dataAprovacao'>) => SolicitacaoUnificada;
  atualizarStatus: (id: string, status: StatusSolicitacao, obs?: string) => void;
  enviar: (id: string) => void;
  getProximoNumero: (tipo: TipoSolicitacao) => string;
}

const SolicitacoesContext = createContext<SolicitacoesContextType | null>(null);

export function useSolicitacoes() {
  const ctx = useContext(SolicitacoesContext);
  if (!ctx) throw new Error("useSolicitacoes deve ser usado dentro de SolicitacoesProvider");
  return ctx;
}

const prefixos: Record<TipoSolicitacao, string> = {
  almoxarifado: 'SM',
  patrimonio: 'SB',
  transportes: 'SV',
  servicos: 'SS',
};

export function SolicitacoesProvider({ children }: { children: ReactNode }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoUnificada[]>(DADOS_INICIAIS);
  const [contadores, setContadores] = useState(contadoresPorTipo);

  const getPorTipo = useCallback((tipo: TipoSolicitacao) => {
    return solicitacoes.filter(s => s.tipo === tipo);
  }, [solicitacoes]);

  const getProximoNumero = useCallback((tipo: TipoSolicitacao) => {
    const next = contadores[tipo] + 1;
    return `${prefixos[tipo]}-2026-${String(next).padStart(3, '0')}`;
  }, [contadores]);

  const adicionar = useCallback((sol: Omit<SolicitacaoUnificada, 'id' | 'numero' | 'data' | 'aprovadoPor' | 'dataAprovacao'>) => {
    const num = contadores[sol.tipo] + 1;
    const numero = `${prefixos[sol.tipo]}-2026-${String(num).padStart(3, '0')}`;
    const nova: SolicitacaoUnificada = {
      ...sol,
      id: `${sol.tipo}-${Date.now()}`,
      numero,
      data: new Date().toISOString().split('T')[0],
      aprovadoPor: '',
      dataAprovacao: '',
    };
    setSolicitacoes(prev => [nova, ...prev]);
    setContadores(prev => ({ ...prev, [sol.tipo]: num }));
    return nova;
  }, [contadores]);

  const atualizarStatus = useCallback((id: string, status: StatusSolicitacao, obs?: string) => {
    setSolicitacoes(prev => prev.map(s =>
      s.id === id
        ? {
          ...s,
          status,
          observacao: obs ?? s.observacao,
          aprovadoPor: (status === 'aprovada' || status === 'rejeitada') ? 'Gestor' : s.aprovadoPor,
          dataAprovacao: (status === 'aprovada' || status === 'rejeitada') ? new Date().toISOString().split('T')[0] : s.dataAprovacao,
        }
        : s
    ));
  }, []);

  const enviar = useCallback((id: string) => {
    setSolicitacoes(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'enviada' as StatusSolicitacao } : s
    ));
  }, []);

  return (
    <SolicitacoesContext.Provider value={{ solicitacoes, getPorTipo, adicionar, atualizarStatus, enviar, getProximoNumero }}>
      {children}
    </SolicitacoesContext.Provider>
  );
}
