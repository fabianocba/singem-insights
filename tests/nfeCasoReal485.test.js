/**
 * Testes automatizados para NF-e - Caso Real NF 485
 * @vitest-environment node
 *
 * CASO DE TESTE REAL:
 * Chave: 29260251561070000150550010000004851300001174
 * NF 485, Série 001, Emissão 09/02/2026 08:56:51
 * Emitente: CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA (51.561.070/0001-50)
 * Destinatário: INSTITUTO FEDERAL BAIANO CAMPUS GUANAMBI (10.724.903/0004-11)
 * Total: R$ 28.167,50
 * Itens:
 *   1) CARNE BOVINA ACEM, 475 KG × R$ 20,90 = R$ 9.927,50
 *   2) CARNE COSTELA BOVINA, 240 KG × R$ 15,00 = R$ 3.600,00
 *   3) CARNE BOVINA CHAN DE FORA, 488 KG × R$ 30,00 = R$ 14.640,00
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Imports dos módulos a testar
const NfeXmlParser = require('../server/domain/nfe/NfeXmlParser.js');
const {
  validarNfeCompleta,
  validarChaveAcesso,
  validarCNPJ,
  validarSomatorioItens
} = require('../server/domain/nfe/NfeValidators.js');
const {
  NfeConciliationService,
  CONCILIATION_STATUS,
  toNumber
} = require('../server/domain/nfe/NfeConciliationService.js');

// Dados esperados do caso de teste real
const DADOS_ESPERADOS = {
  chaveAcesso: '29260251561070000150550010000004851300001174',
  numero: '485',
  serie: '1',
  dataEmissao: '2026-02-09T08:56:51-03:00',
  emitente: {
    cnpj: '51561070000150',
    razaoSocial: 'CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA'
  },
  destinatario: {
    cnpj: '10724903000411',
    razaoSocial: 'INSTITUTO FEDERAL BAIANO CAMPUS GUANAMBI'
  },
  totais: {
    valorProdutos: 28167.5,
    valorNF: 28167.5
  },
  itens: [
    {
      numero: '1',
      codigo: '2000000000100',
      descricao: 'CARNE BOVINA ACEM',
      ncm: '02011000',
      cfop: '5102',
      unidade: 'KG',
      quantidade: 475.0,
      valorUnitario: 20.9,
      valorTotal: 9927.5
    },
    {
      numero: '2',
      codigo: '2000000000040',
      descricao: 'CARNE COSTELA BOVINA',
      ncm: '02102000',
      cfop: '5102',
      unidade: 'KG',
      quantidade: 240.0,
      valorUnitario: 15.0,
      valorTotal: 3600.0
    },
    {
      numero: '3',
      codigo: '2000000000107',
      descricao: 'CARNE BOVINA CHAN DE FORA',
      ncm: '02011000',
      cfop: '5102',
      unidade: 'KG',
      quantidade: 488.0,
      valorUnitario: 30.0,
      valorTotal: 14640.0
    }
  ]
};

// Soma esperada dos itens
const SOMA_ITENS = 9927.5 + 3600.0 + 14640.0; // = 28167.50

describe('Caso Real NF-e 485 - Parser XML', () => {
  let parser;
  let xmlCasoReal;
  let dadosParsed;

  beforeAll(() => {
    parser = new NfeXmlParser();
    const fixturesPath = path.join(__dirname, 'fixtures', 'nfe');
    xmlCasoReal = fs.readFileSync(path.join(fixturesPath, 'nfe-caso-real-485.xml'), 'utf8');
    dadosParsed = parser.parseNfe(xmlCasoReal);
  });

  describe('Validação de Estrutura', () => {
    it('deve validar estrutura XML v4.00', () => {
      const resultado = parser.validarEstrutura(xmlCasoReal);
      expect(resultado.valido).toBe(true);
      expect(resultado.versao).toBe('4.00');
    });

    it('deve identificar como NF-e válida', () => {
      expect(parser.isValidNfe(xmlCasoReal)).toBe(true);
    });
  });

  describe('Extração da Chave de Acesso', () => {
    it('deve extrair chave de acesso corretamente', () => {
      expect(dadosParsed.chaveAcesso).toBe(DADOS_ESPERADOS.chaveAcesso);
    });

    it('deve extrair chave com 44 dígitos', () => {
      expect(dadosParsed.chaveAcesso).toHaveLength(44);
    });

    it('chave deve passar validação de DV', () => {
      const resultado = validarChaveAcesso(dadosParsed.chaveAcesso);
      expect(resultado.valido).toBe(true);
    });
  });

  describe('Identificação do Documento (ide)', () => {
    it('deve extrair número da NF', () => {
      expect(dadosParsed.numero).toBe(DADOS_ESPERADOS.numero);
    });

    it('deve extrair série', () => {
      expect(dadosParsed.serie).toBe(DADOS_ESPERADOS.serie);
    });

    it('deve extrair data de emissão', () => {
      expect(dadosParsed.dataEmissaoOriginal).toBe(DADOS_ESPERADOS.dataEmissao);
    });

    it('deve extrair UF (Bahia = 29)', () => {
      expect(dadosParsed.cUF).toBe('29');
    });
  });

  describe('Emitente', () => {
    it('deve extrair CNPJ do emitente', () => {
      expect(dadosParsed.emitente.cnpj).toBe(DADOS_ESPERADOS.emitente.cnpj);
    });

    it('deve extrair razão social do emitente', () => {
      expect(dadosParsed.emitente.razaoSocial).toBe(DADOS_ESPERADOS.emitente.razaoSocial);
    });

    it('CNPJ do emitente deve ser válido', () => {
      const resultado = validarCNPJ(dadosParsed.emitente.cnpj);
      expect(resultado.valido).toBe(true);
    });
  });

  describe('Destinatário', () => {
    it('deve extrair CNPJ do destinatário', () => {
      expect(dadosParsed.destinatario.cnpj).toBe(DADOS_ESPERADOS.destinatario.cnpj);
    });

    it('deve extrair razão social do destinatário', () => {
      expect(dadosParsed.destinatario.razaoSocial).toBe(DADOS_ESPERADOS.destinatario.razaoSocial);
    });
  });

  describe('Totais', () => {
    it('deve extrair vProd (total produtos)', () => {
      expect(dadosParsed.totais.valorProdutos).toBe(DADOS_ESPERADOS.totais.valorProdutos);
    });

    it('deve extrair vNF (valor nota)', () => {
      expect(dadosParsed.totais.valorNF).toBe(DADOS_ESPERADOS.totais.valorNF);
    });

    it('vProd deve ser igual a vNF (sem frete/desconto)', () => {
      expect(dadosParsed.totais.valorProdutos).toBe(dadosParsed.totais.valorNF);
    });
  });

  describe('Itens (det/prod)', () => {
    it('deve extrair 3 itens', () => {
      expect(dadosParsed.itens).toHaveLength(3);
    });

    describe('Item 1 - CARNE BOVINA ACEM', () => {
      let item;
      beforeAll(() => {
        item = dadosParsed.itens.find((i) => i.numero === '1');
      });

      it('deve ter código correto', () => {
        expect(item.codigo).toBe(DADOS_ESPERADOS.itens[0].codigo);
      });

      it('deve ter descrição correta', () => {
        expect(item.descricao).toBe(DADOS_ESPERADOS.itens[0].descricao);
      });

      it('deve ter NCM correto', () => {
        expect(item.ncm).toBe(DADOS_ESPERADOS.itens[0].ncm);
      });

      it('deve ter quantidade 475.0000 (4 casas)', () => {
        expect(item.quantidade).toBe(475.0);
      });

      it('deve ter valor unitário 20.9000 (4 casas)', () => {
        expect(item.valorUnitario).toBe(20.9);
      });

      it('deve ter valor total 9927.50', () => {
        expect(item.valorTotal).toBe(9927.5);
      });

      it('qCom × vUnCom deve bater com vProd', () => {
        const calculado = item.quantidade * item.valorUnitario;
        expect(Math.abs(calculado - item.valorTotal)).toBeLessThan(0.01);
      });
    });

    describe('Item 2 - CARNE COSTELA BOVINA', () => {
      let item;
      beforeAll(() => {
        item = dadosParsed.itens.find((i) => i.numero === '2');
      });

      it('deve ter quantidade 240.0000', () => {
        expect(item.quantidade).toBe(240.0);
      });

      it('deve ter valor unitário 15.0000', () => {
        expect(item.valorUnitario).toBe(15.0);
      });

      it('deve ter valor total 3600.00', () => {
        expect(item.valorTotal).toBe(3600.0);
      });
    });

    describe('Item 3 - CARNE BOVINA CHAN DE FORA', () => {
      let item;
      beforeAll(() => {
        item = dadosParsed.itens.find((i) => i.numero === '3');
      });

      it('deve ter quantidade 488.0000', () => {
        expect(item.quantidade).toBe(488.0);
      });

      it('deve ter valor unitário 30.0000', () => {
        expect(item.valorUnitario).toBe(30.0);
      });

      it('deve ter valor total 14640.00', () => {
        expect(item.valorTotal).toBe(14640.0);
      });
    });

    describe('Somatório dos Itens', () => {
      it('soma dos vProd dos itens deve ser igual ao total', () => {
        const soma = dadosParsed.itens.reduce((acc, item) => acc + item.valorTotal, 0);
        expect(soma).toBe(SOMA_ITENS);
      });

      it('deve passar validação de somatório', () => {
        const valores = dadosParsed.itens.map((i) => i.valorTotal);
        const resultado = validarSomatorioItens(valores, DADOS_ESPERADOS.totais.valorProdutos);
        expect(resultado.valido).toBe(true);
      });
    });
  });

  describe('Validação Completa', () => {
    it('deve passar validação completa da NF-e', () => {
      const resultado = validarNfeCompleta(dadosParsed);
      expect(resultado.status).toBe('OK');
      expect(resultado.errors).toHaveLength(0);
    });
  });
});

describe('Caso Real NF-e 485 - Conciliação com Empenho', () => {
  let parser;
  let xmlCasoReal;
  let dadosNfe;
  let conciliator;

  // Empenho compatível (tem saldo suficiente)
  const empenhoCompativel = {
    id: 1,
    numero: '2026NE000123',
    cnpjFornecedor: '51561070000150',
    fornecedor: 'CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA',
    valorTotal: 50000.0,
    itens: [
      {
        itemCompra: '2000000000100',
        codigo: '2000000000100',
        descricao: 'CARNE BOVINA ACEM',
        unidade: 'KG',
        quantidade: 500,
        valorUnitario: 20.9,
        valorTotal: 10450.0,
        saldoQuantidade: 500,
        saldoValor: 10450.0
      },
      {
        itemCompra: '2000000000040',
        codigo: '2000000000040',
        descricao: 'CARNE COSTELA BOVINA',
        unidade: 'KG',
        quantidade: 300,
        valorUnitario: 15.0,
        valorTotal: 4500.0,
        saldoQuantidade: 300,
        saldoValor: 4500.0
      },
      {
        itemCompra: '2000000000107',
        codigo: '2000000000107',
        descricao: 'CARNE BOVINA CHAN DE FORA',
        unidade: 'KG',
        quantidade: 500,
        valorUnitario: 30.0,
        valorTotal: 15000.0,
        saldoQuantidade: 500,
        saldoValor: 15000.0
      }
    ]
  };

  // Empenho incompatível (saldo insuficiente)
  const empenhoIncompativel = {
    id: 2,
    numero: '2026NE000456',
    cnpjFornecedor: '51561070000150',
    fornecedor: 'CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA',
    valorTotal: 10000.0,
    itens: [
      {
        itemCompra: '2000000000100',
        codigo: '2000000000100',
        descricao: 'CARNE BOVINA ACEM',
        unidade: 'KG',
        quantidade: 100, // Quantidade menor que a NF (475)
        valorUnitario: 20.9,
        valorTotal: 2090.0,
        saldoQuantidade: 100,
        saldoValor: 2090.0
      }
    ]
  };

  beforeAll(() => {
    parser = new NfeXmlParser();
    const fixturesPath = path.join(__dirname, 'fixtures', 'nfe');
    xmlCasoReal = fs.readFileSync(path.join(fixturesPath, 'nfe-caso-real-485.xml'), 'utf8');
    dadosNfe = parser.parseNfe(xmlCasoReal);
    conciliator = new NfeConciliationService();
  });

  describe('Conciliação com Empenho Compatível', () => {
    let resultado;

    beforeAll(() => {
      resultado = conciliator.conciliar(dadosNfe, empenhoCompativel);
    });

    it('deve retornar status OK ou OK_COM_ALERTAS', () => {
      expect([CONCILIATION_STATUS.OK, CONCILIATION_STATUS.OK_COM_ALERTAS]).toContain(resultado.status);
    });

    it('não deve ter erros bloqueantes', () => {
      expect(resultado.errors).toHaveLength(0);
    });

    it('deve corresponder todos os 3 itens', () => {
      expect(resultado.itemsMatched).toHaveLength(3);
    });

    it('não deve ter itens não encontrados', () => {
      expect(resultado.itemsNotFound).toHaveLength(0);
    });

    it('não deve ter itens com quantidade excedida', () => {
      expect(resultado.itemsOverQty).toHaveLength(0);
    });

    it('summary deve ter totais corretos', () => {
      expect(resultado.summary.totalItensNF).toBe(3);
      expect(resultado.summary.itensCorrespondidos).toBe(3);
      expect(resultado.summary.totalNF).toBe(28167.5);
    });
  });

  describe('Conciliação com Empenho Incompatível', () => {
    let resultado;

    beforeAll(() => {
      resultado = conciliator.conciliar(dadosNfe, empenhoIncompativel);
    });

    it('deve retornar status PENDENTE_CONFERENCIA', () => {
      expect(resultado.status).toBe(CONCILIATION_STATUS.PENDENTE_CONFERENCIA);
    });

    it('deve ter erros bloqueantes', () => {
      expect(resultado.errors.length).toBeGreaterThan(0);
    });

    it('deve identificar itens com quantidade excedida', () => {
      expect(resultado.itemsOverQty.length).toBeGreaterThan(0);
    });

    it('deve identificar itens não encontrados', () => {
      // Itens 2 e 3 não existem no empenho incompatível
      expect(resultado.itemsNotFound.length).toBeGreaterThan(0);
    });
  });

  describe('Conciliação sem Empenho', () => {
    it('deve retornar ERRO quando empenho é null', () => {
      const resultado = conciliator.conciliar(dadosNfe, null);
      expect(resultado.status).toBe(CONCILIATION_STATUS.ERRO);
      expect(resultado.errors).toContain('Empenho não informado para conciliação');
    });
  });
});

describe('Utilitários de Precisão Numérica', () => {
  describe('toNumber', () => {
    it('deve preservar 4 casas decimais com número', () => {
      // A função toNumber recebe valores já parseados como número do parser
      expect(toNumber(475.0, 4)).toBe(475.0);
      expect(toNumber(20.9, 4)).toBe(20.9);
    });

    it('deve converter string formato BR (vírgula decimal)', () => {
      // Formato BR usa vírgula como decimal e ponto como milhar
      expect(toNumber('1.234,56', 2)).toBe(1234.56);
      expect(toNumber('20,9000', 4)).toBe(20.9);
    });

    it('deve retornar 0 para valores inválidos', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber('')).toBe(0);
    });
  });
});

describe('Validadores Específicos', () => {
  describe('validarChaveAcesso', () => {
    it('deve validar chave correta', () => {
      const resultado = validarChaveAcesso(DADOS_ESPERADOS.chaveAcesso);
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar chave com tamanho errado', () => {
      const resultado = validarChaveAcesso('12345');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('44 dígitos');
    });

    it('deve rejeitar chave com DV inválido', () => {
      // Altera o último dígito
      const chaveInvalida = DADOS_ESPERADOS.chaveAcesso.slice(0, -1) + '9';
      const resultado = validarChaveAcesso(chaveInvalida);
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('Dígito verificador inválido');
    });
  });

  describe('validarCNPJ', () => {
    it('deve validar CNPJ do emitente', () => {
      const resultado = validarCNPJ(DADOS_ESPERADOS.emitente.cnpj);
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar CNPJ inválido', () => {
      const resultado = validarCNPJ('11111111111111');
      expect(resultado.valido).toBe(false);
    });
  });

  describe('validarSomatorioItens', () => {
    it('deve validar somatório correto', () => {
      const valores = [9927.5, 3600.0, 14640.0];
      const resultado = validarSomatorioItens(valores, 28167.5);
      expect(resultado.valido).toBe(true);
      expect(resultado.somaCalculada).toBe(28167.5);
    });

    it('deve detectar divergência', () => {
      const valores = [9927.5, 3600.0, 14640.0];
      const resultado = validarSomatorioItens(valores, 30000.0);
      expect(resultado.valido).toBe(false);
      expect(resultado.diferenca).toBeGreaterThan(0);
    });
  });
});
