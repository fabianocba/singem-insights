/**
 * Testes de integração para NfeImportServiceV2
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const NfeImportServiceV2 = require('../server/services/NfeImportServiceV2.js');

describe('NfeImportServiceV2', () => {
  let service;
  let xmlCompleto;
  let xmlSimples;
  let xmlComErros;
  const testStoragePath = path.join(__dirname, 'temp-storage-test');

  beforeAll(async () => {
    // Carrega fixtures
    const fixturesPath = path.join(__dirname, 'fixtures', 'nfe');
    xmlCompleto = fs.readFileSync(path.join(fixturesPath, 'nfe-completa-v4.xml'), 'utf8');
    xmlSimples = fs.readFileSync(path.join(fixturesPath, 'nfe-simples-nacional.xml'), 'utf8');
    xmlComErros = fs.readFileSync(path.join(fixturesPath, 'nfe-com-erros.xml'), 'utf8');

    // Cria serviço com storage temporário
    service = new NfeImportServiceV2({
      storagePath: testStoragePath
    });

    await service.inicializar();
  });

  afterAll(async () => {
    // Limpa storage de teste
    try {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignora erro se não existir
    }
  });

  beforeEach(async () => {
    // Limpa NF-es importadas entre testes
    const lista = await service.listarNfes();
    if (lista.sucesso && lista.nfes) {
      for (const nfe of lista.nfes) {
        await service.removerNfe(nfe.chaveAcesso);
      }
    }
  });

  describe('importarXml', () => {
    it('deve importar NF-e completa com sucesso', async () => {
      const resultado = await service.importarXml(xmlCompleto);

      expect(resultado.status).toBe('OK');
      expect(resultado.errors).toHaveLength(0);
      expect(resultado.data).not.toBeNull();
      expect(resultado.data.chaveAcesso).toBe('29260112345678000195550010000001231234567898');
      expect(resultado.data.numero).toBe('123');
      expect(resultado.data.foiPersistido).toBe(true);
    });

    it('deve retornar dados normalizados', async () => {
      const resultado = await service.importarXml(xmlCompleto);

      expect(resultado.data.emitente.cnpj).toBe('12345678000195');
      expect(resultado.data.destinatario.cnpj).toBe('10724574000166');
      expect(resultado.data.totais.valorNF).toBe(2600);
      expect(resultado.data.quantidadeItens).toBe(3);
    });

    it('deve criar arquivos no storage', async () => {
      const resultado = await service.importarXml(xmlCompleto);
      const chave = resultado.data.chaveAcesso;

      // Verifica se arquivos foram criados
      const xmlPath = path.join(testStoragePath, 'xml', `${chave}.xml`);
      const metaPath = path.join(testStoragePath, 'meta', `${chave}.json`);

      expect(fs.existsSync(xmlPath)).toBe(true);
      expect(fs.existsSync(metaPath)).toBe(true);
    });

    it('deve detectar NF-e já importada', async () => {
      // Importa primeira vez
      await service.importarXml(xmlCompleto);

      // Tenta importar novamente
      const resultado = await service.importarXml(xmlCompleto);

      expect(resultado.status).toBe('OK_COM_ALERTAS');
      expect(resultado.alerts.some((a) => a.includes('já importada'))).toBe(true);
      expect(resultado.data.foiPersistido).toBe(false);
    });

    it('deve sobrescrever quando solicitado', async () => {
      // Importa primeira vez
      await service.importarXml(xmlCompleto);

      // Importa com sobrescrever
      const resultado = await service.importarXml(xmlCompleto, { sobrescrever: true });

      expect(['OK', 'OK_COM_ALERTAS']).toContain(resultado.status);
      expect(resultado.data.foiPersistido).toBe(true);
    });

    it('deve gerar alertas para NF-e com problemas não bloqueantes', async () => {
      const resultado = await service.importarXml(xmlComErros);

      // Pode ter alertas sobre sequência, CNPJ, etc
      expect(resultado.alerts.length).toBeGreaterThan(0);
    });

    it('deve rejeitar XML inválido', async () => {
      const resultado = await service.importarXml('<root>não é nfe</root>');

      expect(resultado.status).toBe('ERRO');
      expect(resultado.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar XML vazio', async () => {
      const resultado = await service.importarXml('');

      expect(resultado.status).toBe('ERRO');
    });
  });

  describe('importarXmlBase64', () => {
    it('deve importar XML em base64', async () => {
      const base64 = Buffer.from(xmlSimples).toString('base64');
      const resultado = await service.importarXmlBase64(base64);

      expect(resultado.status).toBe('OK');
      expect(resultado.data.numero).toBe('456');
    });

    it('deve rejeitar base64 inválido', async () => {
      const resultado = await service.importarXmlBase64('não é base64 válido!@#$');

      // Pode falhar na decodificação ou na validação do XML resultante
      expect(['ERRO', 'OK_COM_ALERTAS']).toContain(resultado.status);
    });
  });

  describe('validarXml', () => {
    it('deve validar sem persistir', async () => {
      const resultado = await service.validarXml(xmlCompleto);

      expect(resultado.status).toBe('OK');
      expect(resultado.data).not.toBeNull();

      // Verifica que não foi persistido
      const existe = await service.existeNfe(resultado.data.chaveAcesso);
      expect(existe).toBe(false);
    });

    it('deve retornar erros de validação', async () => {
      const resultado = await service.validarXml('<root>inválido</root>');

      expect(resultado.status).toBe('ERRO');
      expect(resultado.errors.length).toBeGreaterThan(0);
    });
  });

  describe('obterNfe', () => {
    it('deve obter NF-e importada', async () => {
      // Importa primeiro
      const importResult = await service.importarXml(xmlCompleto);
      const chave = importResult.data.chaveAcesso;

      // Obtém
      const resultado = await service.obterNfe(chave);

      expect(resultado.status).toBe('OK');
      expect(resultado.data.chaveAcesso).toBe(chave);
      expect(resultado.data.caminhos).not.toBeNull();
    });

    it('deve retornar erro para NF-e não encontrada', async () => {
      // Chave válida (DV correto) mas NF-e não existe
      const resultado = await service.obterNfe('99999999999999999999999999999999999999999997');

      expect(resultado.status).toBe('ERRO');
      expect(resultado.errors.some((e) => e.toLowerCase().includes('não encontrad'))).toBe(true);
    });

    it('deve rejeitar chave inválida', async () => {
      const resultado = await service.obterNfe('chave-invalida');

      expect(resultado.status).toBe('ERRO');
    });
  });

  describe('obterXml', () => {
    it('deve obter XML original', async () => {
      // Importa
      const importResult = await service.importarXml(xmlCompleto);
      const chave = importResult.data.chaveAcesso;

      // Obtém XML
      const resultado = await service.obterXml(chave);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.xml).toContain('nfeProc');
      expect(resultado.xml).toContain(chave);
    });
  });

  describe('listarNfes', () => {
    it('deve listar NF-es importadas', async () => {
      // Importa duas NF-es
      await service.importarXml(xmlCompleto);
      await service.importarXml(xmlSimples);

      const resultado = await service.listarNfes();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.nfes.length).toBe(2);
      expect(resultado.total).toBe(2);
    });

    it('deve ordenar por data de emissão', async () => {
      await service.importarXml(xmlSimples); // 2026-02-05
      await service.importarXml(xmlCompleto); // 2026-02-10

      const resultado = await service.listarNfes();

      // Mais recente primeiro
      expect(resultado.nfes[0].dataEmissao).toContain('2026-02-10');
    });

    it('deve filtrar por CNPJ do emitente', async () => {
      await service.importarXml(xmlCompleto);
      await service.importarXml(xmlSimples);

      const resultado = await service.listarNfes({ cnpjEmitente: '12345678000195' });

      expect(resultado.nfes.length).toBe(1);
      expect(resultado.nfes[0].emitente.cnpj).toBe('12345678000195');
    });

    it('deve retornar lista vazia quando não há NF-es', async () => {
      const resultado = await service.listarNfes();

      expect(resultado.sucesso).toBe(true);
      expect(resultado.nfes).toHaveLength(0);
    });
  });

  describe('existeNfe', () => {
    it('deve retornar true para NF-e existente', async () => {
      const importResult = await service.importarXml(xmlCompleto);

      const existe = await service.existeNfe(importResult.data.chaveAcesso);
      expect(existe).toBe(true);
    });

    it('deve retornar false para NF-e inexistente', async () => {
      const existe = await service.existeNfe('12345678901234567890123456789012345678901234');
      expect(existe).toBe(false);
    });
  });

  describe('removerNfe', () => {
    it('deve remover NF-e importada', async () => {
      // Importa
      const importResult = await service.importarXml(xmlCompleto);
      const chave = importResult.data.chaveAcesso;

      // Remove
      const resultado = await service.removerNfe(chave);
      expect(resultado.sucesso).toBe(true);

      // Verifica que foi removida
      const existe = await service.existeNfe(chave);
      expect(existe).toBe(false);
    });
  });
});
