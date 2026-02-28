import { buscarEmpenhoPorId, compararComEmpenho, salvarNotaFiscal } from '../api/notaFiscalApi.js';
import { validarCamposBasicos } from '../validators/notaFiscalValidators.js';
import { confirmAction } from '../../../shared/ui/modal.js';

export function createNotaFiscalFeature(app) {
  return {
    validarEntrada({ empenhoId, valorTotalNFInput, formData, itens }) {
      return validarCamposBasicos({
        empenhoId,
        valorTotalNF: valorTotalNFInput,
        formData,
        itens,
        parseMoney: (value) => app.money2(app.parseMoneyInputBR(value))
      });
    },

    async validarContraEmpenhoComNFValidator({ empenhoId, formData, itens }) {
      if (!window.NFValidator) {
        return { ok: true };
      }

      const empenho = await buscarEmpenhoPorId(empenhoId);
      const nfObj = {
        numero: formData.get('numeroNotaFiscal'),
        dataNotaFiscal: formData.get('dataNotaFiscal'),
        cnpjEmitente: formData.get('cnpjEmitente'),
        valorTotal: app.calcularValorTotalItens(itens),
        itens
      };

      const resultado = window.NFValidator.validateNF(nfObj, empenho);
      if (resultado.ok || !resultado.errors?.length) {
        return { ok: true };
      }

      const errosCriticos = resultado.errors.map((e) => `• ${e.message}`).join('\n');
      const confirmar = confirmAction(
        `⚠️ DIVERGÊNCIAS ENCONTRADAS:\n\n${errosCriticos}\n\nDeseja salvar mesmo assim?\n\n[OK] = Salvar com divergências\n[Cancelar] = Corrigir antes de salvar`
      );

      return { ok: confirmar };
    },

    async montarNotaFiscal({ formData, itens, cnpjDestinatario, empenhoId, currentNotaFiscal }) {
      const notaFiscal = {
        numero: formData.get('numeroNotaFiscal'),
        dataNotaFiscal: formData.get('dataNotaFiscal'),
        cnpjEmitente: formData.get('cnpjEmitente'),
        cnpjDestinatario,
        chaveAcesso: formData.get('chaveAcesso'),
        empenhoId,
        itens,
        valorTotal: app.calcularValorTotalItens(itens),
        pdfData: currentNotaFiscal ? await app.fileToBase64(currentNotaFiscal.file) : null
      };

      if (notaFiscal.empenhoId) {
        notaFiscal.divergencias = await compararComEmpenho(notaFiscal, notaFiscal.empenhoId);
      }

      return notaFiscal;
    },

    async salvarNotaFiscalCompleta(notaFiscal) {
      return salvarNotaFiscal(notaFiscal);
    }
  };
}
