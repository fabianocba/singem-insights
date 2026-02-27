const { z, toInt } = require('./common');

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

module.exports = {
  listSaldosSchema,
  saldoByMaterialSchema,
  listMovimentosSchema,
  createMovimentoSchema
};
