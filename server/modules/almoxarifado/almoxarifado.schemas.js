const { z, toInt, idParam } = require('../../src/validators/common');

const movementTypes = ['entrada', 'saida', 'transferencia', 'ajuste', 'devolucao'];
const itemStatuses = ['ativo', 'inativo', 'bloqueado'];
const solicitationStatuses = [
  'rascunho',
  'enviada',
  'em_analise',
  'aprovada',
  'em_separacao',
  'atendida',
  'parcial',
  'parcialmente_atendida',
  'recusada',
  'cancelada',
  'estornada'
];
const priorityLevels = ['baixa', 'normal', 'alta', 'urgente'];

const toBoolean = (defaultValue = false) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      return ['true', '1', 'sim', 'yes'].includes(String(value).toLowerCase());
    });

const numericValue = z.union([z.number(), z.string()]).transform((value) => Number.parseFloat(String(value)));

const itemImageSchema = z.object({
  url: z.string().trim().min(1),
  tipo: z.string().trim().optional().default('principal')
});

const createItemSchemaBody = z.object({
  codigo_interno: z.string().trim().optional(),
  descricao: z.string().trim().min(3, 'Descrição é obrigatória'),
  descricao_resumida: z.string().trim().optional(),
  catmat_codigo: z.string().trim().min(1, 'CATMAT é obrigatório'),
  catmat_descricao: z.string().trim().min(1, 'Descrição do CATMAT é obrigatória'),
  unidade: z.string().trim().optional().default('UN'),
  grupo_id: z.coerce.number().int().positive().optional(),
  grupo: z.string().trim().optional(),
  subgrupo_id: z.coerce.number().int().positive().optional(),
  subgrupo: z.string().trim().optional(),
  conta_contabil_id: z.coerce.number().int().positive('Conta contábil é obrigatória'),
  estoque_minimo: numericValue.optional(),
  estoque_maximo: numericValue.optional(),
  ponto_reposicao: numericValue.optional(),
  localizacao_id: z.coerce.number().int().positive().optional(),
  localizacao: z.string().trim().optional(),
  status: z.enum(itemStatuses).optional().default('ativo'),
  imagens: z.array(itemImageSchema).optional().default([]),
  ignorar_duplicidade: toBoolean(false)
});

const createContaContabilSchema = {
  body: z.object({
    codigo: z.string().trim().min(1, 'Código é obrigatório'),
    descricao: z.string().trim().min(3, 'Descrição é obrigatória'),
    categoria: z.string().trim().optional()
  })
};

const listContasContabeisSchema = {
  query: z.object({
    q: z.string().trim().optional(),
    limit: toInt(50),
    page: toInt(1)
  })
};

const listItensSchema = {
  query: z.object({
    page: toInt(1),
    limit: toInt(20),
    sort: z.string().trim().optional(),
    busca: z.string().trim().optional(),
    q: z.string().trim().optional(),
    grupo: z.string().trim().optional(),
    subgrupo: z.string().trim().optional(),
    status: z.string().trim().optional(),
    conta_contabil_id: toInt(undefined),
    catmat_codigo: z.string().trim().optional(),
    somenteCriticos: toBoolean(false)
  })
};

const getItemSchema = { params: idParam };

const createItemSchema = { body: createItemSchemaBody };

const updateItemSchema = {
  params: idParam,
  body: createItemSchemaBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Nenhum campo para atualizar'
  })
};

const createNotaItemSchema = z
  .object({
    material_id: z.coerce.number().int().positive().optional(),
    item_numero: z.coerce.number().int().positive().optional(),
    descricao_nf: z.string().trim().min(3, 'Descrição do item da NF é obrigatória'),
    quantidade: numericValue,
    valor_unitario: numericValue,
    conta_contabil_id: z.coerce.number().int().positive().optional(),
    create_item: createItemSchemaBody.partial()
  })
  .superRefine((value, ctx) => {
    if (!value.material_id && !value.create_item) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['material_id'],
        message: 'Informe material_id ou create_item para cada item da NF'
      });
    }
  });

const createNotaEntradaSchema = {
  body: z.object({
    empenho_id: z.coerce.number().int().positive().optional(),
    numero: z.string().trim().min(1, 'Número é obrigatório'),
    serie: z.string().trim().optional(),
    chave_acesso: z.string().trim().optional(),
    data_emissao: z.string().trim().min(1, 'Data de emissão é obrigatória'),
    data_entrada: z.string().trim().optional(),
    fornecedor: z.string().trim().min(1, 'Fornecedor é obrigatório'),
    fornecedor_id: z.coerce.number().int().positive().optional(),
    cnpj_fornecedor: z.string().trim().optional(),
    valor_total: numericValue,
    tipo: z.enum(['entrada', 'devolucao']).optional().default('entrada'),
    xml_data: z.string().optional(),
    pdf_data: z.string().optional(),
    observacoes: z.string().trim().optional(),
    itens: z.array(createNotaItemSchema).min(1, 'Informe ao menos um item')
  })
};

const listNotasEntradaSchema = {
  query: z.object({
    page: toInt(1),
    limit: toInt(20),
    sort: z.string().trim().optional(),
    q: z.string().trim().optional(),
    fornecedor: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional()
  })
};

const createMovimentacaoSchema = {
  body: z.object({
    item_id: z.coerce.number().int().positive(),
    tipo: z.enum(movementTypes),
    quantidade: numericValue,
    valor_unitario: numericValue.optional(),
    origem: z.string().trim().optional().default('manual'),
    documento: z.string().trim().optional(),
    observacoes: z.string().trim().optional(),
    justificativa: z.string().trim().optional(),
    solicitacao_id: z.coerce.number().int().positive().optional(),
    localizacao_destino: z.string().trim().optional()
  })
};

const listMovimentacoesSchema = {
  query: z.object({
    page: toInt(1),
    limit: toInt(20),
    sort: z.string().trim().optional(),
    item_id: toInt(undefined),
    tipo: z.string().trim().optional(),
    origem: z.string().trim().optional(),
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional()
  })
};

const createSolicitacaoSchema = {
  body: z.object({
    setor: z.string().trim().min(2, 'Setor é obrigatório'),
    solicitante: z.string().trim().min(2, 'Solicitante é obrigatório'),
    prioridade: z.enum(priorityLevels).optional().default('normal'),
    centro_custo: z.string().trim().optional(),
    status: z.enum(solicitationStatuses).optional().default('enviada'),
    observacoes: z.string().trim().optional(),
    itens: z
      .array(
        z.object({
          item_id: z.coerce.number().int().positive(),
          quantidade: numericValue
        })
      )
      .min(1, 'Informe ao menos um item')
  })
};

const listSolicitacoesSchema = {
  query: z.object({
    page: toInt(1),
    limit: toInt(20),
    sort: z.string().trim().optional(),
    status: z.string().trim().optional(),
    prioridade: z.string().trim().optional(),
    setor: z.string().trim().optional(),
    solicitante: z.string().trim().optional(),
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional()
  })
};

const updateSolicitacaoStatusSchema = {
  params: idParam,
  body: z
    .object({
      status: z.enum(solicitationStatuses),
      observacoes: z.string().trim().optional(),
      itens: z
        .array(
          z.object({
            item_id: z.coerce.number().int().positive(),
            quantidade_atendida: numericValue
          })
        )
        .optional()
    })
    .superRefine((value, ctx) => {
      if (
        ['atendida', 'parcial', 'parcialmente_atendida'].includes(value.status) &&
        (!value.itens || value.itens.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['itens'],
          message: 'Informe os itens atendidos para concluir a solicitação'
        });
      }
    })
};

const dashboardSchema = {
  query: z.object({
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional()
  })
};

const relatorioResumoSchema = {
  query: z.object({
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional(),
    setor: z.string().trim().optional()
  })
};

const listAuditoriaSchema = {
  query: z.object({
    page: toInt(1),
    limit: toInt(20),
    sort: z.string().trim().optional(),
    acao: z.string().trim().optional(),
    entidade_tipo: z.string().trim().optional(),
    usuario_id: toInt(undefined)
  })
};

module.exports = {
  dashboardSchema,
  listContasContabeisSchema,
  createContaContabilSchema,
  listItensSchema,
  getItemSchema,
  createItemSchema,
  updateItemSchema,
  listNotasEntradaSchema,
  createNotaEntradaSchema,
  listMovimentacoesSchema,
  createMovimentacaoSchema,
  listSolicitacoesSchema,
  createSolicitacaoSchema,
  updateSolicitacaoStatusSchema,
  relatorioResumoSchema,
  listAuditoriaSchema,
  movementTypes,
  itemStatuses,
  solicitationStatuses,
  priorityLevels
};
