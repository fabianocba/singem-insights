# Plano de Deprecacao da API NF-e v1

- Data base: 2026-04-01
- API legado: /api/nfe
- API alvo: /api/nfe/v2

## Estado atual

A API v1 continua ativa para compatibilidade, mas agora responde com headers de deprecacao:

- Deprecation: true
- Sunset: Wed, 31 Dec 2026 23:59:59 GMT
- Link: </api/nfe/v2>; rel="successor-version"
- Warning: 299 - "API /api/nfe deprecada; migre para /api/nfe/v2"

## Objetivo

Unificar contratos de NF-e no envelope da v2 e reduzir custo de manutencao dupla.

## Cronograma sugerido

1. Ate 2026-06-30:

- Monitorar consumo da v1 por logs e telemetria.
- Publicar comunicacao para consumidores internos.

2. Ate 2026-09-30:

- Bloquear novas integracoes em v1.
- Manter apenas correcoes criticas na v1.

3. Ate 2026-12-31:

- Encerrar v1.
- Redirecionar documentacao oficial para v2 apenas.

## Checklist tecnico

- [x] Headers de deprecacao no router v1
- [ ] Dashboard de consumo v1 vs v2
- [ ] Guia de migracao endpoint a endpoint
- [ ] Flag de kill-switch para encerramento controlado
