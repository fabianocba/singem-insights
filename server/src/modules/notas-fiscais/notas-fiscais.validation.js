const { idNotaSchema, chaveNotaSchema, createNotaSchema } = require('../../validators/notasFiscais.validators');
const { z } = require('../../validators/common');

const listNotasSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    limite: z.coerce.number().int().min(1).max(5000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z.string().trim().optional(),
    q: z.string().trim().optional(),
    situacao: z.string().trim().optional(),
    fornecedor: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    chaveAcesso: z.string().trim().optional(),
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional(),
    status: z.string().trim().optional(),
    cnpj: z.string().trim().optional(),
    busca: z.string().trim().optional(),
    empenho_id: z.coerce.number().int().optional(),
    data_inicio: z.string().trim().optional(),
    data_fim: z.string().trim().optional()
  })
};

const updateNotaSchema = {
  params: idNotaSchema.params,
  body: z
    .object({
      empenho_id: z.union([z.number().int(), z.null()]).optional(),
      numero: z.union([z.string(), z.number()]).optional(),
      serie: z.string().optional(),
      data_emissao: z.string().optional(),
      data_entrada: z.string().optional(),
      fornecedor: z.string().optional(),
      cnpj_fornecedor: z.string().optional(),
      valor_total: z.union([z.string(), z.number()]).optional(),
      valor_icms: z.union([z.string(), z.number()]).optional(),
      valor_ipi: z.union([z.string(), z.number()]).optional(),
      valor_frete: z.union([z.string(), z.number()]).optional(),
      valor_desconto: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      observacoes: z.string().optional()
    })
    .passthrough()
};

const idNotaArquivoSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
    arquivoId: z.coerce.number().int().positive()
  })
};

module.exports = {
  listNotasSchema,
  idNotaSchema,
  idNotaArquivoSchema,
  chaveNotaSchema,
  createNotaSchema,
  updateNotaSchema
};
