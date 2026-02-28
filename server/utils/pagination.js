const { z } = require('zod');

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGE_DEFAULT),
  limit: z.coerce.number().int().min(1).max(LIMIT_MAX).default(LIMIT_DEFAULT),
  sort: z.string().trim().optional()
});

function parseSort(sort, defaultSort, allowedSortFields = []) {
  if (!sort) {
    return defaultSort;
  }

  const [rawField, rawDir] = String(sort).split(':');
  const sortField = String(rawField || '').trim();
  const sortDir = String(rawDir || 'asc')
    .trim()
    .toLowerCase();

  if (!sortField) {
    return defaultSort;
  }

  if (sortDir !== 'asc' && sortDir !== 'desc') {
    return defaultSort;
  }

  if (Array.isArray(allowedSortFields) && allowedSortFields.length > 0 && !allowedSortFields.includes(sortField)) {
    return defaultSort;
  }

  return {
    sortField,
    sortDir,
    sort: `${sortField}:${sortDir}`
  };
}

function parsePagination(
  query = {},
  defaultSort = { sortField: 'id', sortDir: 'desc', sort: 'id:desc' },
  allowedSortFields = []
) {
  const parsed = paginationSchema.parse(query);
  const normalizedSort = parseSort(parsed.sort, defaultSort, allowedSortFields);

  return {
    page: parsed.page,
    limit: parsed.limit,
    offset: (parsed.page - 1) * parsed.limit,
    sortField: normalizedSort.sortField,
    sortDir: normalizedSort.sortDir,
    sort: normalizedSort.sort
  };
}

function buildMeta({ page, limit, total, sort }) {
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
  const pages = safeTotal > 0 ? Math.ceil(safeTotal / limit) : 0;

  return {
    page,
    limit,
    total: safeTotal,
    pages,
    sort
  };
}

module.exports = {
  parsePagination,
  buildMeta,
  LIMIT_MAX
};
