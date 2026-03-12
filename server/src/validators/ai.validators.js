const { z } = require('./common');

const entityTypesSchema = z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]);

const searchBodySchema = z
  .object({
    query_text: z.string().trim().min(1).max(4000),
    entity_types: entityTypesSchema,
    context_module: z.string().trim().max(120).optional(),
    filters: z.record(z.any()).optional().default({}),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    page_size: z.coerce.number().int().min(1).max(100).optional().default(20)
  })
  .passthrough();

const suggestItemBodySchema = z
  .object({
    text: z.string().trim().min(1).max(4000),
    context_module: z.string().trim().max(120).optional(),
    hints: z.record(z.any()).optional().default({}),
    limit: z.coerce.number().int().min(1).max(20).optional().default(5)
  })
  .passthrough();

const suggestFornecedorBodySchema = z
  .object({
    text: z.string().trim().min(1).max(4000),
    cnpj: z.string().trim().max(30).optional(),
    context_module: z.string().trim().max(120).optional(),
    hints: z.record(z.any()).optional().default({}),
    limit: z.coerce.number().int().min(1).max(20).optional().default(5)
  })
  .passthrough();

const matchEntityBodySchema = z
  .object({
    source_entity_type: z.string().trim().min(1).max(80),
    source_entity_id: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') {
          return null;
        }
        return String(value);
      }),
    source_text: z.string().trim().min(1).max(4000),
    target_entity_types: entityTypesSchema,
    context: z.record(z.any()).optional().default({}),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10)
  })
  .passthrough();

const reportSummaryBodySchema = z
  .object({
    report_key: z.string().trim().min(1).max(200),
    context_module: z.string().trim().max(120).optional(),
    data: z.record(z.any()).optional().default({}),
    force_refresh: z.boolean().optional().default(false)
  })
  .passthrough();

const feedbackBodySchema = z
  .object({
    feature_name: z.string().trim().min(1).max(120),
    query_text: z.string().trim().min(1).max(4000),
    suggested_entity_type: z.string().trim().min(1).max(80),
    suggested_entity_id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    accepted: z.boolean(),
    user_id: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') {
          return undefined;
        }
        return String(value);
      }),
    context: z.record(z.any()).optional().default({})
  })
  .passthrough();

const reindexBodySchema = z
  .object({
    entity_types: entityTypesSchema,
    entity_id: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') {
          return undefined;
        }
        return String(value);
      }),
    clear_first: z.boolean().optional().default(false)
  })
  .passthrough();

const clearIndexBodySchema = z
  .object({
    entity_type: z.string().trim().max(80).optional(),
    entity_id: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === null || value === '') {
          return undefined;
        }
        return String(value);
      })
  })
  .passthrough();

module.exports = {
  aiSearchSchema: { body: searchBodySchema },
  aiSuggestItemSchema: { body: suggestItemBodySchema },
  aiSuggestFornecedorSchema: { body: suggestFornecedorBodySchema },
  aiMatchEntitySchema: { body: matchEntityBodySchema },
  aiReportSummarySchema: { body: reportSummaryBodySchema },
  aiFeedbackSchema: { body: feedbackBodySchema },
  aiReindexSchema: { body: reindexBodySchema },
  aiClearIndexSchema: { body: clearIndexBodySchema }
};
