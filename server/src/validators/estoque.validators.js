const { z, toInt, idParam } = require('./common');

const listSaldosSchema = {
  query: z.object({
    busca: z.string().optional(),
    limite: toInt(100),
    offset: toInt(0)
  })
};

const saldoByMaterialSchema = {
  params: z.object({
    materialId: z
      .string()
      .regex(/^\d+$/, 'materialId deve ser numérico')
      .transform((value) => Number.parseInt(value, 10))
  })
};

const listMovimentosSchema = {
  query: z.object({
    material_id: toInt(undefined),
    tipo: z.string().optional(),
    data_inicio: z.string().optional(),
    data_fim: z.string().optional(),
    limite: toInt(100),
    offset: toInt(0)
  })
};

const createMovimentoSchema = {
  body: z.object({
    material_id: z.number().int(),
    tipo: z.enum(['entrada', 'saida', 'ajuste']),
    quantidade: z.union([z.string(), z.number()]),
    valor_unitario: z.union([z.string(), z.number()]).optional(),
    documento: z.string().optional(),
    observacoes: z.string().optional()
  })
};

const listMateriaisSchema = {
  query: z.object({
    busca: z.string().optional(),
    natureza: z.string().optional(),
    limite: toInt(200),
    offset: toInt(0)
  })
};

const createMaterialSchema = {
  body: z.object({
    codigo: z.string().optional(),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    unidade: z.string().optional(),
    natureza_despesa: z.string().optional(),
    subelemento: z.string().optional()
  })
};

const updateMaterialSchema = {
  params: idParam,
  body: z
    .object({
      codigo: z.string().optional(),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      natureza_despesa: z.string().optional(),
      subelemento: z.string().optional(),
      ativo: z.boolean().optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'Nenhum campo para atualizar'
    })
};

module.exports = {
  listSaldosSchema,
  saldoByMaterialSchema,
  listMovimentosSchema,
  createMovimentoSchema,
  listMateriaisSchema,
  createMaterialSchema,
  updateMaterialSchema
};
