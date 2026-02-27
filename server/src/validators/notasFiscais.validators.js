const { z, toInt, idParam } = require('./common');

const listNotasSchema = {
  query: z.object({
    empenho_id: toInt(undefined),
    status: z.string().optional(),
    cnpj: z.string().optional(),
    data_inicio: z.string().optional(),
    data_fim: z.string().optional(),
    busca: z.string().optional(),
    limite: toInt(100),
    offset: toInt(0)
  })
};

const idNotaSchema = {
  params: idParam
};

const chaveNotaSchema = {
  params: z.object({
    chave: z.string().min(1)
  })
};

const createNotaSchema = {
  body: z.object({
    empenho_id: z.number().int().optional().nullable(),
    numero: z.union([z.string(), z.number()]),
    serie: z.string().optional(),
    chave_acesso: z.string().optional(),
    data_emissao: z.string().optional(),
    data_entrada: z.string().optional(),
    fornecedor: z.string().optional(),
    cnpj_fornecedor: z.string().optional(),
    valor_total: z.union([z.string(), z.number()]).optional(),
    valor_icms: z.union([z.string(), z.number()]).optional(),
    valor_ipi: z.union([z.string(), z.number()]).optional(),
    valor_frete: z.union([z.string(), z.number()]).optional(),
    valor_desconto: z.union([z.string(), z.number()]).optional(),
    xml_data: z.any().optional(),
    observacoes: z.string().optional(),
    itens: z.array(z.any()).optional()
  })
};

module.exports = {
  listNotasSchema,
  idNotaSchema,
  chaveNotaSchema,
  createNotaSchema
};
