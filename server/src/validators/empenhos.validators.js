const { z, toInt, idParam } = require('./common');

const listEmpenhosSchema = {
  query: z.object({
    ano: toInt(undefined),
    status: z.string().optional(),
    cnpj: z.string().optional(),
    busca: z.string().optional(),
    limite: toInt(100),
    offset: toInt(0)
  })
};

const idEmpenhoSchema = {
  params: idParam
};

const slugEmpenhoSchema = {
  params: z.object({
    slug: z.string().min(1)
  })
};

const createEmpenhoSchema = {
  body: z.object({
    numero: z.union([z.string(), z.number()]),
    ano: z.number().int().optional(),
    dataEmpenho: z.string().optional(),
    data_empenho: z.string().optional(),
    fornecedor: z.string().optional(),
    cnpjFornecedor: z.string().optional(),
    cnpj_fornecedor: z.string().optional(),
    valorTotal: z.union([z.string(), z.number()]).optional(),
    valor_total: z.union([z.string(), z.number()]).optional(),
    naturezaDespesa: z.string().optional(),
    natureza_despesa: z.string().optional(),
    processoSuap: z.string().optional(),
    processo_suap: z.string().optional(),
    statusValidacao: z.string().optional(),
    status_validacao: z.string().optional(),
    itens: z.array(z.any()).optional(),
    pdfData: z.any().optional(),
    pdf_data: z.any().optional()
  })
};

const updateEmpenhoSchema = {
  params: idParam,
  body: z.object({
    fornecedor: z.string().optional(),
    cnpjFornecedor: z.string().optional(),
    valorTotal: z.union([z.string(), z.number()]).optional(),
    naturezaDespesa: z.string().optional(),
    processoSuap: z.string().optional(),
    dataEmpenho: z.string().optional(),
    itens: z.array(z.any()).optional(),
    pdfData: z.any().optional(),
    statusValidacao: z.string().optional()
  })
};

module.exports = {
  listEmpenhosSchema,
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema
};
