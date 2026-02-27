const { z } = require('zod');

const toInt = (defaultValue) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return defaultValue;
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? defaultValue : parsed;
    });

const idParam = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'id deve ser numérico')
    .transform((value) => Number.parseInt(value, 10))
});

module.exports = {
  z,
  toInt,
  idParam
};
