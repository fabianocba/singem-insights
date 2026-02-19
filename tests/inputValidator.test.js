/**
 * Testes para InputValidator
 * Módulo crítico de validação de entrada
 */

import { describe, it, expect } from 'vitest';
import InputValidator from '../js/core/inputValidator.js';

describe('InputValidator', () => {
  describe('validateCNPJ', () => {
    it('deve validar CNPJ válido com formatação', () => {
      expect(InputValidator.isValidCNPJ('12.345.678/0001-95')).toBe(true);
    });

    it('deve validar CNPJ válido sem formatação', () => {
      expect(InputValidator.isValidCNPJ('12345678000195')).toBe(true);
    });

    it('deve rejeitar CNPJ inválido', () => {
      expect(InputValidator.isValidCNPJ('12.345.678/0001-99')).toBe(false);
    });

    it('deve rejeitar CNPJ com todos dígitos iguais', () => {
      expect(InputValidator.isValidCNPJ('11.111.111/1111-11')).toBe(false);
    });

    it('deve rejeitar CNPJ com tamanho errado', () => {
      expect(InputValidator.isValidCNPJ('123.456.789/0001-95')).toBe(false);
    });

    it('deve rejeitar CNPJ vazio ou null', () => {
      expect(InputValidator.isValidCNPJ('')).toBe(false);
      expect(InputValidator.isValidCNPJ(null)).toBe(false);
      expect(InputValidator.isValidCNPJ(undefined)).toBe(false);
    });
  });

  describe('validateEmpenho', () => {
    const empenhoValido = {
      numero: '123456',
      data: '2025-11-06',
      fornecedor: 'Fornecedor Teste LTDA',
      cnpjFornecedor: '12.345.678/0001-95',
      valorTotal: 1000.0,
      itens: [
        {
          descricao: 'Item 1',
          quantidade: 10,
          valorUnitario: 50,
          valorTotal: 500
        },
        {
          descricao: 'Item 2',
          quantidade: 5,
          valorUnitario: 100,
          valorTotal: 500
        }
      ]
    };

    it('deve validar empenho válido', () => {
      const result = InputValidator.validateEmpenho(empenhoValido);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar empenho sem número', () => {
      const empenho = { ...empenhoValido, numero: '' };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Número do empenho inválido (deve conter apenas dígitos)');
    });

    it('deve rejeitar empenho com número não numérico', () => {
      const empenho = { ...empenhoValido, numero: 'ABC123' };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar empenho sem fornecedor', () => {
      const empenho = { ...empenhoValido, fornecedor: 'AB' };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nome do fornecedor deve ter pelo menos 3 caracteres');
    });

    it('deve rejeitar empenho com CNPJ inválido', () => {
      const empenho = { ...empenhoValido, cnpjFornecedor: '12.345.678/0001-99' };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CNPJ do fornecedor inválido');
    });

    it('deve rejeitar empenho com valor total zero', () => {
      const empenho = { ...empenhoValido, valorTotal: 0 };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valor total deve ser maior que zero');
    });

    it('deve rejeitar empenho sem itens', () => {
      const empenho = { ...empenhoValido, itens: [] };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empenho deve ter pelo menos um item');
    });

    it('deve validar itens e detectar valor total inconsistente', () => {
      const empenho = {
        ...empenhoValido,
        itens: [
          {
            descricao: 'Item 1',
            quantidade: 10,
            valorUnitario: 50,
            valorTotal: 600 // Inconsistente: 10 * 50 = 500
          }
        ]
      };
      const result = InputValidator.validateEmpenho(empenho);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Valor total inconsistente'))).toBe(true);
    });
  });

  describe('validateNotaFiscal', () => {
    const nfValida = {
      numero: 'NF-12345',
      dataNotaFiscal: '2025-11-06',
      cnpjEmitente: '12.345.678/0001-95',
      cnpjDestinatario: '11.222.333/0001-81', // CNPJ válido
      valorTotal: 1000.0,
      itens: [
        {
          descricao: 'Produto A',
          quantidade: 5,
          valorUnitario: 200,
          valorTotal: 1000
        }
      ]
    };

    it('deve validar nota fiscal válida', () => {
      const result = InputValidator.validateNotaFiscal(nfValida);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar NF sem número', () => {
      const nf = { ...nfValida, numero: '' };
      const result = InputValidator.validateNotaFiscal(nf);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Número da nota fiscal é obrigatório');
    });

    it('deve rejeitar NF com CNPJ emitente inválido', () => {
      const nf = { ...nfValida, cnpjEmitente: '12.345.678/0001-99' };
      const result = InputValidator.validateNotaFiscal(nf);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CNPJ do emitente inválido');
    });

    it('deve rejeitar NF com CNPJ destinatário inválido', () => {
      const nf = { ...nfValida, cnpjDestinatario: '98.765.432/0001-99' };
      const result = InputValidator.validateNotaFiscal(nf);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CNPJ do destinatário inválido');
    });
  });

  describe('validatePDFFile', () => {
    it('deve validar arquivo PDF válido', () => {
      const file = {
        type: 'application/pdf',
        size: 1024 * 100 // 100KB
      };
      const result = InputValidator.validatePDFFile(file);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar arquivo muito grande (>50MB)', () => {
      const file = {
        type: 'application/pdf',
        size: 1024 * 1024 * 51 // 51MB
      };
      const result = InputValidator.validatePDFFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito grande');
    });

    it('deve rejeitar arquivo muito pequeno (<1KB)', () => {
      const file = {
        type: 'application/pdf',
        size: 512 // 512 bytes
      };
      const result = InputValidator.validatePDFFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito pequeno');
    });

    it('deve rejeitar arquivo que não é PDF', () => {
      const file = {
        type: 'image/png',
        size: 1024 * 100
      };
      const result = InputValidator.validatePDFFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('deve ser PDF');
    });

    it('deve rejeitar se nenhum arquivo for fornecido', () => {
      const result = InputValidator.validatePDFFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Nenhum arquivo selecionado');
    });
  });

  describe('sanitizeString', () => {
    it('deve remover tags HTML', () => {
      const dirty = '<script>alert("XSS")</script>Hello';
      const clean = InputValidator.sanitizeString(dirty);
      expect(clean).toBe('alert("XSS")Hello');
      expect(clean).not.toContain('<script>');
    });

    it('deve remover caracteres de controle', () => {
      const dirty = 'Hello\x00\x1FWorld';
      const clean = InputValidator.sanitizeString(dirty);
      expect(clean).toBe('HelloWorld');
    });

    it('deve fazer trim de espaços', () => {
      const dirty = '  Hello World  ';
      const clean = InputValidator.sanitizeString(dirty);
      expect(clean).toBe('Hello World');
    });

    it('deve retornar string vazia para null/undefined', () => {
      expect(InputValidator.sanitizeString(null)).toBe('');
      expect(InputValidator.sanitizeString(undefined)).toBe('');
      expect(InputValidator.sanitizeString('')).toBe('');
    });
  });

  describe('validateCredentials', () => {
    it('deve validar credenciais válidas', () => {
      const result = InputValidator.validateCredentials('usuario123', 'senha123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar login muito curto', () => {
      const result = InputValidator.validateCredentials('ab', 'senha123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Login deve ter pelo menos 3 caracteres');
    });

    it('deve rejeitar senha muito curta', () => {
      const result = InputValidator.validateCredentials('usuario', '123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Senha deve ter pelo menos 4 caracteres');
    });

    it('deve rejeitar login com caracteres inválidos', () => {
      const result = InputValidator.validateCredentials('usuario@#$', 'senha123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Login contém caracteres inválidos');
    });

    it('deve aceitar login com pontos, underscores e hífens', () => {
      const result = InputValidator.validateCredentials('usuario.teste_123-admin', 'senha123');
      expect(result.valid).toBe(true);
    });
  });
});
