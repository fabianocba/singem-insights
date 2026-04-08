// Tipos de perfil por módulo
export type PerfilModulo = 'gestor' | 'chefe' | 'usuario' | 'nenhum';

export interface PermissoesUsuario {
  almoxarifado: PerfilModulo;
  patrimonio: PerfilModulo;
  transportes: PerfilModulo;
  servicos: PerfilModulo;
  solicitacoes: PerfilModulo;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  setor: string;
  ativo: boolean;
  permissoes: PermissoesUsuario;
}

export type ModuloId = 'almoxarifado' | 'patrimonio' | 'transportes' | 'servicos' | 'solicitacoes';

export interface Empenho {
  id: string;
  numero: string;
  ano: number;
  fornecedor: string;
  cnpj: string;
  objeto: string;
  valor: number;
  contaContabil: string;
  subElemento: string;
  status: 'ativo' | 'parcial' | 'liquidado' | 'cancelado';
  modulo: ModuloId;
  itens: ItemEmpenho[];
  dataCriacao: string;
}

export interface ItemEmpenho {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  quantidadeEntregue: number;
  codigo?: string; // CATMAT p/ almox, tombo p/ patrimônio
}

export interface NotaFiscal {
  id: string;
  numero: string;
  serie: string;
  fornecedor: string;
  cnpj: string;
  empenhoId: string;
  valor: number;
  dataEmissao: string;
  status: 'pendente' | 'vinculada' | 'aceita' | 'rejeitada';
  modulo: ModuloId;
  itens: ItemNotaFiscal[];
}

export interface ItemNotaFiscal {
  id: string;
  itemEmpenhoId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface SolicitacaoMaterial {
  id: string;
  numero: string;
  solicitante: string;
  setor: string;
  data: string;
  status: 'rascunho' | 'enviada' | 'autorizada' | 'rejeitada' | 'atendida' | 'parcial';
  modulo: ModuloId;
  itens: ItemSolicitacao[];
  autorizadoPor?: string;
  dataAutorizacao?: string;
  observacao?: string;
}

export interface ItemSolicitacao {
  id: string;
  materialId: string;
  descricao: string;
  quantidade: number;
  quantidadeAtendida: number;
  unidade: string;
}

export interface ItemEstoque {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  saldoAnterior: number;
  entradas: number;
  saidas: number;
  saldoAtual: number;
  subElemento: string;
  valorMedio: number;
  localizacao?: string;
}
