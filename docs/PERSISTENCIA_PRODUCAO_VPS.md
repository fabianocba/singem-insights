# Persistencia Real em Producao (VPS)

## Objetivo

Esta configuracao garante que banco, arquivos e configuracoes sobrevivam a deploy, rebuild, merge e recriacao de containers.

## Estrutura persistente recomendada na VPS

```text
/opt/singem/
  storage/
    notas-fiscais/
      pdf/
      xml/
      meta/
    empenhos/
      pdf/
    anexos/
    uploads/
    temp/
    logs/
      backend/
    backups/
  config/
  data/
    postgres/
    redis/
```

## Como preparar a VPS

1. Execute o script:

```bash
bash scripts/vps-storage-init.sh
```

2. Configure variaveis em `docker/prod/.env.prod`:

- `SINGEM_VPS_BASE_DIR=/opt/singem`
- `SINGEM_STORAGE_HOST_PATH=/opt/singem/storage`
- `SINGEM_DATA_HOST_PATH=/opt/singem/data`
- `SINGEM_CONFIG_HOST_PATH=/opt/singem/config`

## Como o backend grava arquivos

- Uploads e arquivos gerados passam pelo servico central `fileStorageService`.
- Metadados sao registrados na tabela `arquivos`.
- Binario fica no filesystem persistente montado em `/app/storage`.
- Downloads devem ocorrer por `id` de metadado e nunca por path arbitrario.

## Configuracoes persistentes

- Segredos e infraestrutura: variaveis de ambiente.
- Parametros funcionais: tabela `configuracoes_sistema`.

## Simulacao realista

- `modo_registro` suporta `real` e `simulado`.
- Registro de arquivo e configuracoes preservam esse marcador.

## Backup basico

- Script: `infra/scripts/backup.sh`
- Gera dump do banco + arquivo tar.gz do storage em `storage/backups`.

## Restauracao basica

- Script: `infra/scripts/restore.sh`
- Restaura dump SQL e storage tar.gz.

## Expansao futura

Para nova categoria de arquivo:

1. Adicione mapeamento em `server/src/config/storage.js`.
2. Use `fileStorageService.saveBuffer()` com modulo/categoria.
3. Mantenha rastreabilidade na tabela `arquivos`.

## Validacao ponta a ponta

- Relatorio de validacao executada em desenvolvimento:
  - `docs/VALIDACAO_PONTA_A_PONTA_PERSISTENCIA_2026-04-02.md`

## Simulacao operacional realista

- Guia de carga segura de massa simulada persistente:
  - `docs/SIMULACAO_OPERACIONAL_REALISTA.md`
