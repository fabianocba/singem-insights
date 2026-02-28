import InputValidator from '../../../core/inputValidator.js';
import { validateRequired } from '../../../shared/lib/validation.js';

export function validarCamposBasicos({ empenhoId, valorTotalNF, formData, itens, parseMoney }) {
  const required = validateRequired([
    { name: 'empenhoAssociado', value: empenhoId, message: 'Empenho é obrigatório.' },
    { name: 'numeroNotaFiscal', value: formData.get('numeroNotaFiscal'), message: 'Número da NF é obrigatório.' },
    { name: 'dataNotaFiscal', value: formData.get('dataNotaFiscal'), message: 'Data da NF é obrigatória.' }
  ]);

  if (!required.valid) {
    return required;
  }

  if (parseMoney(valorTotalNF) <= 0) {
    return { valid: false, errors: ['Valor Total da NF é obrigatório.'] };
  }

  const nfParaValidar = {
    numero: formData.get('numeroNotaFiscal'),
    dataNotaFiscal: formData.get('dataNotaFiscal'),
    cnpjEmitente: formData.get('cnpjEmitente'),
    cnpjDestinatario: formData.get('cnpjDestinatario'),
    valorTotal: itens.reduce((sum, item) => sum + Number(item.valorTotal || 0), 0),
    itens
  };

  const validation = InputValidator.validateNotaFiscal(nfParaValidar);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors };
  }

  return { valid: true, errors: [] };
}
