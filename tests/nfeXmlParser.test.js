/**
 * Testes unitários para NfeXmlParser
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Importa o parser
const NfeXmlParser = require('../server/domain/nfe/NfeXmlParser.js');

describe('NfeXmlParser', () => {
  let parser;
  let xmlCompleto;
  let xmlSimples;
  let xmlComErros;

  beforeAll(() => {
    parser = new NfeXmlParser();

    // Carrega fixtures
    const fixturesPath = path.join(__dirname, 'fixtures', 'nfe');
    xmlCompleto = fs.readFileSync(path.join(fixturesPath, 'nfe-completa-v4.xml'), 'utf8');
    xmlSimples = fs.readFileSync(path.join(fixturesPath, 'nfe-simples-nacional.xml'), 'utf8');
    xmlComErros = fs.readFileSync(path.join(fixturesPath, 'nfe-com-erros.xml'), 'utf8');
  });

  describe('validarEstrutura', () => {
    it('deve validar XML completo v4.00', () => {
      const resultado = parser.validarEstrutura(xmlCompleto);
      expect(resultado.valido).toBe(true);
      expect(resultado.versao).toBe('4.00');
    });

    it('deve validar XML simples nacional', () => {
      const resultado = parser.validarEstrutura(xmlSimples);
      expect(resultado.valido).toBe(true);
      expect(resultado.versao).toBe('4.00');
    });

    it('deve rejeitar XML vazio', () => {
      const resultado = parser.validarEstrutura('');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('vazio');
    });

    it('deve rejeitar XML que não é NF-e', () => {
      const xmlInvalido = '<?xml version="1.0"?><root><data>teste</data></root>';
      const resultado = parser.validarEstrutura(xmlInvalido);
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('não é uma NF-e');
    });

    it('deve rejeitar XML mal formado', () => {
      const xmlMalFormado = '<?xml version="1.0"?><nfeProc><NFe><infNFe';
      const resultado = parser.validarEstrutura(xmlMalFormado);
      expect(resultado.valido).toBe(false);
    });
  });

  describe('isValidNfe', () => {
    it('deve retornar true para NF-e válida', () => {
      expect(parser.isValidNfe(xmlCompleto)).toBe(true);
    });

    it('deve retornar false para XML inválido', () => {
      expect(parser.isValidNfe('<root>não é nfe</root>')).toBe(false);
    });
  });

  describe('extractChaveAcesso', () => {
    it('deve extrair chave do XML completo', () => {
      const chave = parser.extractChaveAcesso(xmlCompleto);
      expect(chave).toBe('29260112345678000195550010000001231234567898');
    });

    it('deve extrair chave do XML simples', () => {
      const chave = parser.extractChaveAcesso(xmlSimples);
      expect(chave).toBe('29260198765432000198550010000004561234567893');
    });

    it('deve retornar null para XML sem chave', () => {
      const chave = parser.extractChaveAcesso('<root></root>');
      expect(chave).toBeNull();
    });
  });

  describe('parseNfe - XML Completo', () => {
    let dados;

    beforeAll(() => {
      dados = parser.parseNfe(xmlCompleto);
    });

    it('deve extrair versão', () => {
      expect(dados.versao).toBe('4.00');
    });

    it('deve extrair chave de acesso', () => {
      expect(dados.chaveAcesso).toBe('29260112345678000195550010000001231234567898');
    });

    it('deve extrair número da NF', () => {
      expect(dados.numero).toBe('123');
    });

    it('deve extrair série', () => {
      expect(dados.serie).toBe('1');
    });

    it('deve extrair data de emissão normalizada', () => {
      expect(dados.dataEmissao).toContain('2026-02-10');
    });

    it('deve extrair natureza da operação', () => {
      expect(dados.natOp).toBe('VENDA DE MERCADORIA');
    });

    it('deve extrair tipo NF (saída = 1)', () => {
      expect(dados.tipoNF).toBe('1');
    });

    describe('Emitente', () => {
      it('deve extrair CNPJ do emitente', () => {
        expect(dados.emitente.cnpj).toBe('12345678000195');
      });

      it('deve extrair razão social do emitente', () => {
        expect(dados.emitente.razaoSocial).toBe('EMPRESA FORNECEDORA LTDA');
      });

      it('deve extrair nome fantasia', () => {
        expect(dados.emitente.nomeFantasia).toBe('FORNECEDORA');
      });

      it('deve extrair IE do emitente', () => {
        expect(dados.emitente.ie).toBe('123456789');
      });

      it('deve extrair endereço do emitente', () => {
        expect(dados.emitente.endereco).not.toBeNull();
        expect(dados.emitente.endereco.logradouro).toBe('RUA DAS FLORES');
        expect(dados.emitente.endereco.municipio).toBe('GUANAMBI');
        expect(dados.emitente.endereco.uf).toBe('BA');
      });
    });

    describe('Destinatário', () => {
      it('deve extrair CNPJ do destinatário', () => {
        expect(dados.destinatario.cnpj).toBe('10724574000166');
      });

      it('deve extrair razão social do destinatário', () => {
        expect(dados.destinatario.razaoSocial).toContain('INSTITUTO FEDERAL BAIANO');
      });

      it('deve extrair email do destinatário', () => {
        expect(dados.destinatario.email).toBe('compras@ifbaiano.edu.br');
      });
    });

    describe('Itens', () => {
      it('deve extrair 3 itens', () => {
        expect(dados.itens).toHaveLength(3);
      });

      it('deve extrair dados do primeiro item', () => {
        const item1 = dados.itens[0];
        expect(item1.numero).toBe('1');
        expect(item1.codigo).toBe('PROD001');
        expect(item1.descricao).toBe('CANETA ESFEROGRAFICA AZUL');
        expect(item1.ncm).toBe('96081000');
        expect(item1.cfop).toBe('5102');
        expect(item1.unidade).toBe('UN');
        expect(item1.quantidade).toBe(100);
        expect(item1.valorUnitario).toBe(1.5);
        expect(item1.valorTotal).toBe(150);
      });

      it('deve extrair impostos do item', () => {
        const item1 = dados.itens[0];
        expect(item1.impostos).not.toBeNull();
        expect(item1.impostos.icms).not.toBeNull();
        expect(item1.impostos.icms.cst).toBe('00');
        expect(item1.impostos.icms.aliquota).toBe(18);
        expect(item1.impostos.icms.valor).toBe(27);
      });

      it('deve extrair PIS e COFINS', () => {
        const item1 = dados.itens[0];
        expect(item1.impostos.pis).not.toBeNull();
        expect(item1.impostos.pis.aliquota).toBe(1.65);
        expect(item1.impostos.cofins).not.toBeNull();
        expect(item1.impostos.cofins.aliquota).toBe(7.6);
      });
    });

    describe('Totais', () => {
      it('deve extrair valor total de produtos', () => {
        expect(dados.totais.valorProdutos).toBe(2600);
      });

      it('deve extrair valor total da NF', () => {
        expect(dados.totais.valorNF).toBe(2600);
      });

      it('deve extrair valor de ICMS', () => {
        expect(dados.totais.valorICMS).toBe(468);
      });

      it('deve extrair valores zerados corretamente', () => {
        expect(dados.totais.valorFrete).toBe(0);
        expect(dados.totais.valorDesconto).toBe(0);
      });
    });

    describe('Protocolo', () => {
      it('deve extrair dados do protocolo', () => {
        expect(dados.protocolo).not.toBeNull();
        expect(dados.protocolo.numeroProtocolo).toBe('129260000012345');
        expect(dados.protocolo.statusCodigo).toBe('100');
        expect(dados.protocolo.statusMotivo).toBe('Autorizado o uso da NF-e');
      });
    });

    describe('Informações Adicionais', () => {
      it('deve extrair informações complementares', () => {
        expect(dados.infAdicionais.infCpl).toContain('EMPENHO 2026NE000123');
      });
    });
  });

  describe('parseNfe - XML Simples Nacional', () => {
    let dados;

    beforeAll(() => {
      dados = parser.parseNfe(xmlSimples);
    });

    it('deve extrair dados básicos', () => {
      expect(dados.numero).toBe('456');
      expect(dados.serie).toBe('1');
    });

    it('deve extrair CSOSN do Simples Nacional', () => {
      const item = dados.itens[0];
      expect(item.impostos.icms.cst).toBe('102');
    });

    it('deve lidar com PIS/COFINS não tributado', () => {
      const item = dados.itens[0];
      // PISNT e COFINSNT podem ter estrutura diferente
      expect(item.impostos.pis).not.toBeNull();
      expect(item.impostos.cofins).not.toBeNull();
    });
  });

  describe('parseNfe - XML com Erros', () => {
    let dados;

    beforeAll(() => {
      dados = parser.parseNfe(xmlComErros);
    });

    it('deve extrair dados mesmo com erros de validação', () => {
      expect(dados.numero).toBe('789');
    });

    it('deve extrair itens com sequência quebrada', () => {
      expect(dados.itens).toHaveLength(2);
      expect(dados.itens[0].numero).toBe('1');
      expect(dados.itens[1].numero).toBe('3');
    });

    it('deve extrair destinatário sem documento', () => {
      expect(dados.destinatario.cnpj).toBeNull();
      expect(dados.destinatario.cpf).toBeNull();
      expect(dados.destinatario.razaoSocial).toBe('DESTINATARIO SEM DOCUMENTO');
    });
  });

  describe('Normalização de dados', () => {
    it('deve normalizar números corretamente', () => {
      const dados = parser.parseNfe(xmlCompleto);
      // Verifica que números são números, não strings
      expect(typeof dados.itens[0].quantidade).toBe('number');
      expect(typeof dados.itens[0].valorUnitario).toBe('number');
      expect(typeof dados.totais.valorNF).toBe('number');
    });

    it('deve normalizar datas para ISO', () => {
      const dados = parser.parseNfe(xmlCompleto);
      // Data deve estar em formato ISO
      expect(dados.dataEmissao).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });
});
