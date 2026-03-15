from __future__ import annotations

from typing import Any
from app.core.db import get_conn


class ItemRepository:
    def fetch_materials(self, entity_id: str | None = None, limit: int = 5000) -> list[dict[str, Any]]:
        sql = """
            SELECT
                'material'::text AS entity_type,
                m.id::text AS entity_id,
                COALESCE(NULLIF(m.codigo, ''), m.id::text) AS codigo,
                m.descricao AS title,
                m.descricao AS content,
                m.updated_at,
                jsonb_build_object(
                    'codigo', m.codigo,
                    'unidade', m.unidade,
                    'ativo', m.ativo,
                    'natureza_despesa', m.natureza_despesa,
                    'subelemento', m.subelemento,
                    'usage_count', (
                        SELECT COUNT(*)
                        FROM empenho_items ei
                        WHERE ei.material_id = m.id
                    )
                ) AS metadata_json
            FROM materials m
            WHERE (CAST(%s AS TEXT) IS NULL OR m.id::text = %s)
            ORDER BY m.updated_at DESC
            LIMIT %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [entity_id, entity_id, limit])
                return cur.fetchall() or []

    def fetch_catmat_items(self, entity_id: str | None = None, limit: int = 15000) -> list[dict[str, Any]]:
        sql = """
            SELECT
                'catmat_item'::text AS entity_type,
                c.codigo::text AS entity_id,
                c.codigo AS codigo,
                c.descricao AS title,
                c.descricao AS content,
                c.updated_at,
                jsonb_build_object(
                    'codigo', c.codigo,
                    'unidade', c.unidade,
                    'ativo', c.ativo,
                    'source', 'catmat_itens',
                    'usage_count', 0,
                    'nomeGrupo', COALESCE(c.raw_json->>'nomeGrupo', ''),
                    'nomeClasse', COALESCE(c.raw_json->>'nomeClasse', ''),
                    'nomePdm', COALESCE(c.raw_json->>'nomePdm', '')
                ) AS metadata_json
            FROM catmat_itens c
            WHERE (CAST(%s AS TEXT) IS NULL OR c.codigo::text = %s)
            ORDER BY c.updated_at DESC
            LIMIT %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [entity_id, entity_id, limit])
                return cur.fetchall() or []
