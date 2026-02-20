/**
 * Teste do parser namespace-aware com XML real
 * Para executar: node tests/testXmlReal.js
 */

import fs from 'fs';
import { DOMParser } from 'xmldom';

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';

function qNS(doc, tagPath, ctx = null) {
  const parts = tagPath.split('/');
  let node = ctx || doc;
  for (const p of parts) {
    const elems = node.getElementsByTagNameNS ? node.getElementsByTagNameNS(NFE_NS, p) : [];
    if (!elems.length) {
      return null;
    }
    node = elems[0];
  }
  return node;
}

function tNS(doc, tagPath, ctx = null) {
  const el = qNS(doc, tagPath, ctx);
  return el?.textContent?.trim() || '';
}

function money2(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}
function qty4(v) {
  return Math.round((Number(v) || 0) * 10000) / 10000;
}
function unit10(v) {
  return Math.round((Number(v) || 0) * 1e10) / 1e10;
}

const xmlPath = 'd:\\SINGEM\\02_NOTAS_FISCAIS\\2026\\29260251561070000150550010000004851300001174.xml';
const xmlText = fs.readFileSync(xmlPath, 'utf8');
const parser = new DOMParser();
const doc = parser.parseFromString(xmlText, 'application/xml');

// Valores esperados (do checklist do usuário)
const EXPECTED = {
  chave: '29260251561070000150550010000004851300001174',
  dataBR: '09/02/2026',
  destCNPJ: '10724903000411',
  emitCNPJ: '51561070000150',
  totalNF: 28167.5,
  itensCount: 3,
  item1: { qCom: 475, vUnCom: 20.9, vProd: 9927.5 },
  item2: { qCom: 240, vUnCom: 15, vProd: 3600 },
  item3: { qCom: 488, vUnCom: 30, vProd: 14640 }
};

// Extrair valores
const protNFe = qNS(doc, 'protNFe');
const chNFe = tNS(doc, 'chNFe', protNFe) || tNS(doc, 'infProt/chNFe', protNFe);
const dhEmi = tNS(doc, 'NFe/infNFe/ide/dhEmi');

// Data: extrair YYYY-MM-DD direto da string para evitar problemas de timezone
const match = dhEmi.match(/^(\d{4})-(\d{2})-(\d{2})/);
const dataISO = match ? match[0] : '';
const dataBR = match ? `${match[3]}/${match[2]}/${match[1]}` : '';

const emitCNPJ = tNS(doc, 'NFe/infNFe/emit/CNPJ');
const destCNPJ = tNS(doc, 'NFe/infNFe/dest/CNPJ');
const vNF = money2(tNS(doc, 'NFe/infNFe/total/ICMSTot/vNF'));

// Itens
const itens = [];
const detEls = doc.getElementsByTagNameNS(NFE_NS, 'det');
for (let i = 0; i < detEls.length; i++) {
  const det = detEls[i];
  const prod = qNS(doc, 'prod', det);
  if (!prod) {
    continue;
  }
  itens.push({
    desc: tNS(doc, 'xProd', prod),
    qCom: qty4(tNS(doc, 'qCom', prod)),
    vUnCom: unit10(tNS(doc, 'vUnCom', prod)),
    vProd: money2(tNS(doc, 'vProd', prod))
  });
}

// Conciliação interna (soma itens vs total NF)
const somaItens = money2(itens.reduce((s, i) => s + i.vProd, 0));
const concilOk = Math.abs(somaItens - vNF) < 0.01;

// RELATÓRIO
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          TESTE PARSER NAMESPACE-AWARE COM XML REAL             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let allOk = true;

function check(label, value, expected) {
  const ok = value === expected;
  if (!ok) {
    allOk = false;
  }
  console.log(
    `  ${ok ? '✅' : '❌'} ${label.padEnd(25)} ${String(value).padEnd(50)} ${ok ? '' : `(esperado: ${expected})`}`
  );
  return ok;
}

console.log('📌 DADOS DO CABEÇALHO:');
check('Chave Acesso', chNFe, EXPECTED.chave);
check('Data Emissão (BR)', dataBR, EXPECTED.dataBR);
check('CNPJ Emitente', emitCNPJ, EXPECTED.emitCNPJ);
check('CNPJ Destinatário', destCNPJ, EXPECTED.destCNPJ);
check('Valor Total NF', vNF, EXPECTED.totalNF);
check('Qtd Itens', itens.length, EXPECTED.itensCount);

console.log('\n📦 ITENS:');
console.log('  ─────────────────────────────────────────────────────────────────');
itens.forEach((item, idx) => {
  const exp = EXPECTED[`item${idx + 1}`];
  console.log(
    `  Item ${idx + 1}: ${item.desc.substring(0, 30).padEnd(32)} qCom=${item.qCom} vUnCom=${item.vUnCom} vProd=${item.vProd}`
  );
  if (exp) {
    if (item.qCom !== exp.qCom) {
      console.log(`    ❌ qCom: ${item.qCom} (esperado: ${exp.qCom})`);
      allOk = false;
    }
    if (item.vUnCom !== exp.vUnCom) {
      console.log(`    ❌ vUnCom: ${item.vUnCom} (esperado: ${exp.vUnCom})`);
      allOk = false;
    }
    if (item.vProd !== exp.vProd) {
      console.log(`    ❌ vProd: ${item.vProd} (esperado: ${exp.vProd})`);
      allOk = false;
    }
  }
});

console.log('\n🔍 CONCILIAÇÃO INTERNA:');
console.log(`  Soma dos itens: R$ ${somaItens.toFixed(2).replace('.', ',')}`);
console.log(`  Total da NF:    R$ ${vNF.toFixed(2).replace('.', ',')}`);
console.log(`  ${concilOk ? '✅' : '❌'} Conciliação: ${concilOk ? 'OK' : 'DIVERGÊNCIA'}`);
if (!concilOk) {
  allOk = false;
}

console.log('\n════════════════════════════════════════════════════════════════════');
console.log(allOk ? '✅ TODOS OS CHECKS PASSARAM!' : '❌ ALGUNS CHECKS FALHARAM');
console.log('════════════════════════════════════════════════════════════════════\n');

process.exit(allOk ? 0 : 1);
