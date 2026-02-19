/**
 * Parser de XML de NF-e Modelo 55 (nfeProc v4.00)
 * Namespace-aware, padrão ERP robusto
 *
 * @module nfeXmlParser
 * @version 2.0.0 - Reescrito com suporte completo a namespace
 */

// Namespace padrão da NF-e
const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';

/**
 * Parse XML text para Document
 * @param {string} xmlText - Conteúdo XML
 * @returns {Document} Document parseado
 * @throws {Error} Se XML inválido
 */
function parseXmlText(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') {
    throw new Error('XML vazio ou inválido');
  }

  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    throw new Error('XML mal formado: ' + err.textContent.slice(0, 120));
  }
  return doc;
}

/**
 * Query element by path using namespace
 * @param {Document} doc - Documento XML
 * @param {string} path - Caminho separado por '/' (ex: 'ide/dhEmi')
 * @param {Element} [ctx] - Contexto inicial (default: doc)
 * @returns {Element|null}
 */
function q(doc, path, ctx) {
  const base = ctx || doc;
  const parts = path.split('/');
  let node = base;

  for (const p of parts) {
    if (!node) {
      return null;
    }
    // Usa getElementsByTagNameNS para suportar namespace
    const children = node.getElementsByTagNameNS
      ? node.getElementsByTagNameNS(NFE_NS, p)
      : node.getElementsByTagName(p);
    node = children[0] || null;
  }
  return node;
}

/**
 * Get text content by path
 * @param {Document} doc - Documento XML
 * @param {string} path - Caminho
 * @param {Element} [ctx] - Contexto
 * @returns {string} Texto ou string vazia
 */
function t(doc, path, ctx) {
  const n = q(doc, path, ctx);
  return n ? (n.textContent || '').trim() : '';
}

/**
 * Remove tudo que não é dígito
 * @param {string} s - String
 * @returns {string} Apenas dígitos
 */
function onlyDigits(s) {
  return String(s || '').replace(/\D+/g, '');
}

/**
 * Parse número com ponto decimal (padrão XML)
 * @param {string} s - String numérica
 * @returns {number}
 */
function parseNumberDot(s) {
  const x = String(s || '').trim();
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Arredonda para N casas decimais
 * @param {number} n - Número
 * @param {number} places - Casas decimais
 * @returns {number}
 */
function roundTo(n, places) {
  const p = Math.pow(10, places);
  return Math.round((n + Number.EPSILON) * p) / p;
}

/**
 * Converte para valor monetário (2 casas)
 * @param {string} s - String
 * @returns {number}
 */
function money2(s) {
  return roundTo(parseNumberDot(s), 2);
}

/**
 * Converte para quantidade (4 casas)
 * @param {string} s - String
 * @returns {number}
 */
function qty4(s) {
  return roundTo(parseNumberDot(s), 4);
}

/**
 * Converte para valor unitário (10 casas - precisão NF-e)
 * @param {string} s - String
 * @returns {number}
 */
function unit10(s) {
  return roundTo(parseNumberDot(s), 10);
}

/**
 * Parse dhEmi (ISO com timezone) para ISO date e formato BR
 * IMPORTANTE: Extrai a data diretamente do texto para evitar bugs de timezone
 * @param {string} dhEmi - Data no formato "2026-02-09T08:56:51-03:00"
 * @returns {{raw: string, iso: string, br: string}}
 */
function parseDhEmiToISOandBR(dhEmi) {
  if (!dhEmi) {
    return { raw: '', iso: '', br: '' };
  }

  // Extrai YYYY-MM-DD diretamente do texto (evita conversão timezone)
  const m = dhEmi.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    return { raw: dhEmi, iso: '', br: '' };
  }

  const iso = `${m[1]}-${m[2]}-${m[3]}`; // YYYY-MM-DD
  const br = `${m[3]}/${m[2]}/${m[1]}`; // DD/MM/YYYY

  return { raw: dhEmi, iso, br };
}

/**
 * Formata valor monetário para exibição BR
 * @param {number} n - Número
 * @returns {string} Ex: "28.167,50"
 */
function fmtMoney(n) {
  return (Number(n) || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formata quantidade para exibição
 * @param {number} n - Número
 * @returns {string} Ex: "475" ou "475,5"
 */
function fmtQty(n) {
  const x = Number(n) || 0;
  // Remove zeros à direita desnecessários
  const str = x.toFixed(4).replace(/\.?0+$/, '');
  return str.replace('.', ',');
}

/**
 * Formata valor unitário (4 casas) para exibição
 * @param {number} n - Número
 * @returns {string} Ex: "20,9000"
 */
function fmtUnit(n) {
  return (Number(n) || 0).toFixed(4).replace('.', ',');
}

/**
 * Formata CNPJ para exibição
 * @param {string} cnpj - 14 dígitos
 * @returns {string} Ex: "51.561.070/0001-50"
 */
function fmtCNPJ(cnpj) {
  const d = onlyDigits(cnpj);
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj;
}

/**
 * Parse completo do nfeProc
 * @param {Document} doc - Documento XML parseado
 * @returns {{header: Object, itens: Array, conciliacao: Object}}
 * @throws {Error} Se estrutura inválida
 */
function parseNFeProc(doc) {
  // Localiza elementos principais
  const nfeProc = doc.getElementsByTagNameNS(NFE_NS, 'nfeProc')[0] || doc.documentElement;
  const nfe = doc.getElementsByTagNameNS(NFE_NS, 'NFe')[0];
  const infNFe = doc.getElementsByTagNameNS(NFE_NS, 'infNFe')[0];

  if (!nfe || !infNFe) {
    throw new Error('Estrutura NF-e não encontrada (NFe/infNFe).');
  }

  // Contextos
  const ide = q(doc, 'ide', infNFe);
  const emit = q(doc, 'emit', infNFe);
  const dest = q(doc, 'dest', infNFe);
  const icmsTot = q(doc, 'total/ICMSTot', infNFe);

  // Data de emissão (dhEmi v4.00 ou dEmi v3.10)
  const dhEmi = t(doc, 'dhEmi', ide) || t(doc, 'dEmi', ide);
  const dt = parseDhEmiToISOandBR(dhEmi);

  // Chave de acesso (protNFe > infProt > chNFe ou infNFe@Id)
  let chNFe = '';
  const protNFe = doc.getElementsByTagNameNS(NFE_NS, 'protNFe')[0];
  if (protNFe) {
    const infProt = q(doc, 'infProt', protNFe);
    chNFe = t(doc, 'chNFe', infProt);
  }
  if (!chNFe) {
    const idAttr = infNFe.getAttribute('Id') || '';
    chNFe = idAttr.replace(/^NFe/, '');
  }

  // Header
  const header = {
    // Identificação
    modelo: t(doc, 'mod', ide),
    serie: t(doc, 'serie', ide),
    numeroNF: t(doc, 'nNF', ide),
    chave: chNFe,
    naturezaOperacao: t(doc, 'natOp', ide),

    // Datas
    dhEmiRaw: dt.raw,
    dataISO: dt.iso, // YYYY-MM-DD (para salvar)
    dataBR: dt.br, // DD/MM/YYYY (para exibir)

    // Emitente (fornecedor)
    emitCNPJ: onlyDigits(t(doc, 'CNPJ', emit) || t(doc, 'CPF', emit)),
    emitNome: t(doc, 'xNome', emit),
    emitIE: t(doc, 'IE', emit),

    // Destinatário
    destCNPJ: onlyDigits(t(doc, 'CNPJ', dest) || t(doc, 'CPF', dest)),
    destNome: t(doc, 'xNome', dest),

    // Totais
    totalNF: money2(t(doc, 'vNF', icmsTot)),
    totalProdutos: money2(t(doc, 'vProd', icmsTot)),
    totalFrete: money2(t(doc, 'vFrete', icmsTot)),
    totalDesconto: money2(t(doc, 'vDesc', icmsTot)),
    totalSeguro: money2(t(doc, 'vSeg', icmsTot)),
    totalOutros: money2(t(doc, 'vOutro', icmsTot))
  };

  // Itens (det)
  const dets = Array.from(infNFe.getElementsByTagNameNS(NFE_NS, 'det'));
  const itens = dets.map((det) => {
    const nItem = det.getAttribute('nItem') || '';
    const prod = det.getElementsByTagNameNS(NFE_NS, 'prod')[0];

    const qCom = qty4(t(doc, 'qCom', prod));
    const vUnCom = unit10(t(doc, 'vUnCom', prod));
    const vProdTxt = t(doc, 'vProd', prod);
    // Se vProd existe, usa; senão calcula
    const vProd = vProdTxt ? money2(vProdTxt) : money2(roundTo(qCom * vUnCom, 2));

    return {
      sequencia: Number(nItem) || null,
      codigo: t(doc, 'cProd', prod),
      descricao: (t(doc, 'xProd', prod) || '').toUpperCase().trim(),
      unidade: (t(doc, 'uCom', prod) || '').toUpperCase().trim(),
      quantidade: qCom,
      valorUnitario: vUnCom,
      valorTotal: vProd,
      ncm: t(doc, 'NCM', prod),
      cfop: t(doc, 'CFOP', prod)
    };
  });

  // Conciliação (soma itens vs total NF)
  const somaItens = roundTo(
    itens.reduce((acc, it) => acc + (Number(it.valorTotal) || 0), 0),
    2
  );
  const diff = roundTo(somaItens - header.totalNF, 2);
  const tolerancia = 0.05; // 5 centavos

  const conciliacao = {
    somaItens,
    totalNF: header.totalNF,
    diff,
    ok: Math.abs(diff) <= tolerancia,
    tolerancia
  };

  return { header, itens, conciliacao };
}

/**
 * Parse completo a partir de texto XML
 * @param {string} xmlText - Conteúdo XML
 * @returns {{header: Object, itens: Array, conciliacao: Object}}
 */
function parseNFeFromText(xmlText) {
  const doc = parseXmlText(xmlText);
  return parseNFeProc(doc);
}

// Export para uso no browser
if (typeof window !== 'undefined') {
  window.NfeXmlParser = {
    parseXmlText,
    parseNFeProc,
    parseNFeFromText,
    fmtMoney,
    fmtQty,
    fmtUnit,
    fmtCNPJ,
    onlyDigits
  };
}

// Export ES Module
export { parseXmlText, parseNFeProc, parseNFeFromText, fmtMoney, fmtQty, fmtUnit, fmtCNPJ, onlyDigits, NFE_NS };
