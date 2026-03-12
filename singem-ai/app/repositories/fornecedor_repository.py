from __future__ import annotations

from typing import Any
from app.core.db import get_conn


class FornecedorRepository:
    def fetch_fornecedores(self, entity_id: str | None = None, limit: int = 5000) -> list[dict[str, Any]]:
        sql = """
            WITH origem AS (
                SELECT fornecedor, cnpj_fornecedor, updated_at, 'empenhos'::text AS source_module
                FROM empenhos
                WHERE fornecedor IS NOT NULL AND TRIM(fornecedor) <> ''
                UNION ALL
                SELECT fornecedor, cnpj_fornecedor, updated_at, 'notas_fiscais'::text AS source_module
                FROM notas_fiscais
                WHERE fornecedor IS NOT NULL AND TRIM(fornecedor) <> ''
            ),
            consolidado AS (
                SELECT
                    TRIM(fornecedor) AS fornecedor,
                    REGEXP_REPLACE(COALESCE(cnpj_fornecedor, ''), '\\D', '', 'g') AS cnpj,
                    MAX(updated_at) AS updated_at,
                    COUNT(*)::int AS usage_count,
                    ARRAY_AGG(DISTINCT source_module) AS source_modules
                FROM origem
                GROUP BY TRIM(fornecedor), REGEXP_REPLACE(COALESCE(cnpj_fornecedor, ''), '\\D', '', 'g')
            )
            SELECT
                'fornecedor'::text AS entity_type,
                CASE
                    WHEN cnpj <> '' THEN cnpj
                    ELSE md5(lower(fornecedor))
                END AS entity_id,
                fornecedor AS title,
                fornecedor AS content,
                updated_at,
                jsonb_build_object(
                    'fornecedor', fornecedor,
                    'cnpj', cnpj,
                    'usage_count', usage_count,
                    'source_modules', source_modules,
                    'ativo', true
                ) AS metadata_json
            FROM consolidado
            WHERE (
                %s IS NULL
                OR CASE
                    WHEN cnpj <> '' THEN cnpj
                    ELSE md5(lower(fornecedor))
                END = %s
            )
            ORDER BY usage_count DESC, updated_at DESC
            LIMIT %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [entity_id, entity_id, limit])
                return cur.fetchall() or []
