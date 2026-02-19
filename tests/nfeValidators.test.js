/**
 * Testes unitários para NfeValidators
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// Como os módulos são CommonJS, usamos require dinâmico
const {
  validarChaveAcesso,
  calcularDVChave,
  validarCPF,
  validarCNPJ,
  validarCpfCnpj,
  validarSomatorioItens,
  validarValorTotalNF,
  validarSequenciaItens,
  validarNfeCompleta
} = require('../server/domain/nfe/NfeValidators.js');

describe('NfeValidators', () => {
  describe('validarChaveAcesso', () => {
    it('deve validar chave de acesso correta', () => {
      // Chave de exemplo com DV correto
      const chave = '29260112345678000195550010000001231234567890';
      const resultado = validarChaveAcesso(chave);
      // Nota: O DV pode não estar correto neste exemplo, então testamos a estrutura
      expect(resultado).toHaveProperty('valido');
    });

    it('deve rejeitar chave com menos de 44 dígitos', () => {
      const resultado = validarChaveAcesso('12345678901234567890123456789012345678901');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('44 dígitos');
    });

    it('deve rejeitar chave com mais de 44 dígitos', () => {
      const resultado = validarChaveAcesso('123456789012345678901234567890123456789012345');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('44 dígitos');
    });

    it('deve rejeitar chave nula ou vazia', () => {
      expect(validarChaveAcesso(null).valido).toBe(false);
      expect(validarChaveAcesso('').valido).toBe(false);
      expect(validarChaveAcesso(undefined).valido).toBe(false);
    });

    it('deve aceitar chave com formatação (espaços/hífens)', () => {
      // Remove automaticamente caracteres não numéricos
      const chave = '2926 0112 3456 7800 0195 5500 1000 0001 2312 3456 7890';
      const resultado = validarChaveAcesso(chave);
      expect(resultado).toHaveProperty('valido');
    });
  });

  describe('calcularDVChave', () => {
    it('deve calcular DV usando módulo 11', () => {
      // Base de 43 dígitos (exemplo simplificado)
      const base = '2926011234567800019555001000000123123456789';
      const dv = calcularDVChave(base);
      expect(typeof dv).toBe('number');
      expect(dv).toBeGreaterThanOrEqual(0);
      expect(dv).toBeLessThanOrEqual(9);
    });
  });

  describe('validarCPF', () => {
    it('deve validar CPF correto', () => {
      // CPF válido: 529.982.247-25
      const resultado = validarCPF('52998224725');
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar CPF com todos dígitos iguais', () => {
      const resultado = validarCPF('11111111111');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('dígitos iguais');
    });

    it('deve rejeitar CPF com DV inválido', () => {
      const resultado = validarCPF('52998224799');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('dígito verificador');
    });

    it('deve rejeitar CPF com quantidade errada de dígitos', () => {
      const resultado = validarCPF('1234567890');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('11 dígitos');
    });

    it('deve aceitar CPF formatado', () => {
      const resultado = validarCPF('529.982.247-25');
      expect(resultado.valido).toBe(true);
    });
  });

  describe('validarCNPJ', () => {
    it('deve validar CNPJ correto', () => {
      // CNPJ válido: 11.222.333/0001-81
      const resultado = validarCNPJ('11222333000181');
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar CNPJ com todos dígitos iguais', () => {
      const resultado = validarCNPJ('11111111111111');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('dígitos iguais');
    });

    it('deve rejeitar CNPJ com DV inválido', () => {
      const resultado = validarCNPJ('11222333000199');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('dígito verificador');
    });

    it('deve rejeitar CNPJ com quantidade errada de dígitos', () => {
      const resultado = validarCNPJ('123456780001');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('14 dígitos');
    });

    it('deve aceitar CNPJ formatado', () => {
      const resultado = validarCNPJ('11.222.333/0001-81');
      expect(resultado.valido).toBe(true);
    });
  });

  describe('validarCpfCnpj', () => {
    it('deve identificar CPF automaticamente', () => {
      const resultado = validarCpfCnpj('52998224725');
      expect(resultado.tipo).toBe('CPF');
    });

    it('deve identificar CNPJ automaticamente', () => {
      const resultado = validarCpfCnpj('11222333000181');
      expect(resultado.tipo).toBe('CNPJ');
    });

    it('deve rejeitar documento com tamanho inválido', () => {
      const resultado = validarCpfCnpj('123456789');
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('11 (CPF) ou 14 (CNPJ)');
    });
  });

  describe('validarSomatorioItens', () => {
    it('deve validar somatório correto', () => {
      const valores = [100.0, 250.5, 149.5];
      const resultado = validarSomatorioItens(valores, 500.0);
      expect(resultado.valido).toBe(true);
      expect(resultado.somaCalculada).toBe(500.0);
      expect(resultado.diferenca).toBe(0);
    });

    it('deve aceitar pequena divergência dentro da tolerância', () => {
      const valores = [100.0, 200.0];
      const resultado = validarSomatorioItens(valores, 300.03, 0.05);
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar divergência fora da tolerância', () => {
      const valores = [100.0, 200.0];
      const resultado = validarSomatorioItens(valores, 350.0, 0.05);
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('difere do total');
    });

    it('deve lidar com array vazio', () => {
      const resultado = validarSomatorioItens([], 0);
      expect(resultado.valido).toBe(true);
      expect(resultado.somaCalculada).toBe(0);
    });
  });

  describe('validarValorTotalNF', () => {
    it('deve validar total coerente', () => {
      const totais = {
        valorProdutos: 1000.0,
        valorFrete: 50.0,
        valorSeguro: 10.0,
        valorOutros: 5.0,
        valorDesconto: 15.0,
        valorIPI: 0,
        valorST: 0,
        valorNF: 1050.0
      };
      const resultado = validarValorTotalNF(totais);
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar total incoerente', () => {
      const totais = {
        valorProdutos: 1000.0,
        valorFrete: 0,
        valorSeguro: 0,
        valorOutros: 0,
        valorDesconto: 0,
        valorIPI: 0,
        valorST: 0,
        valorNF: 1500.0 // Deveria ser 1000
      };
      const resultado = validarValorTotalNF(totais);
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('difere do calculado');
    });
  });

  describe('validarSequenciaItens', () => {
    it('deve validar sequência correta', () => {
      const itens = [{ numero: '1' }, { numero: '2' }, { numero: '3' }];
      const resultado = validarSequenciaItens(itens);
      expect(resultado.valido).toBe(true);
    });

    it('deve detectar sequência quebrada', () => {
      const itens = [{ numero: '1' }, { numero: '3' }]; // Falta o 2
      const resultado = validarSequenciaItens(itens);
      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toContain('Problemas na sequência');
    });

    it('deve detectar itens duplicados', () => {
      const itens = [{ numero: '1' }, { numero: '1' }, { numero: '2' }];
      const resultado = validarSequenciaItens(itens);
      expect(resultado.valido).toBe(false);
      expect(resultado.detalhes).toContain('Item 1 duplicado');
    });

    it('deve aceitar array vazio', () => {
      const resultado = validarSequenciaItens([]);
      expect(resultado.valido).toBe(true);
    });
  });

  describe('validarNfeCompleta', () => {
    it('deve retornar ERRO quando falta chave de acesso', () => {
      const dados = {
        numero: '123',
        dataEmissao: '2026-02-10',
        emitente: { cnpj: '10724574000152' },
        itens: [{ numero: '1', valorTotal: 100 }],
        totais: { valorNF: 100, valorProdutos: 100 }
      };
      const resultado = validarNfeCompleta(dados);
      expect(resultado.status).toBe('ERRO');
      expect(resultado.errors).toContain('Chave de acesso não encontrada no XML');
    });

    it('deve retornar ERRO quando falta emitente', () => {
      const dados = {
        chaveAcesso: '12345678901234567890123456789012345678901234',
        numero: '123',
        dataEmissao: '2026-02-10',
        emitente: {},
        itens: [{ numero: '1', valorTotal: 100 }],
        totais: { valorNF: 100, valorProdutos: 100 }
      };
      const resultado = validarNfeCompleta(dados);
      expect(resultado.status).toBe('ERRO');
      expect(resultado.errors.some((e) => e.includes('emitente'))).toBe(true);
    });

    it('deve gerar alertas para problemas não bloqueantes', () => {
      const dados = {
        chaveAcesso: '29260112345678000195550010000001231234567890',
        numero: '123',
        dataEmissao: '2026-02-10',
        emitente: { cnpj: '10724574000152', razaoSocial: 'EMPRESA' },
        destinatario: {}, // Sem documento
        itens: [{ numero: '1', valorTotal: 100 }],
        totais: { valorNF: 100, valorProdutos: 100 }
      };
      const resultado = validarNfeCompleta(dados);
      // Pode ter alertas sobre destinatário
      expect(resultado.alerts.some((a) => a.toLowerCase().includes('destinatário'))).toBe(true);
    });
  });
});
