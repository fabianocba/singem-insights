export function validateRequired(fields) {
  const errors = [];

  fields.forEach((field) => {
    if (!field || field.value === undefined || field.value === null || String(field.value).trim() === '') {
      errors.push(field.message || `Campo obrigatório: ${field.name || 'desconhecido'}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
