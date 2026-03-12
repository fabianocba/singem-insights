from __future__ import annotations

from typing import Any
from psycopg.types.json import Json
from app.core.db import get_conn
from app.core.config import get_settings


def _vector_literal(values: list[float] | None) -> str | None:
    if not values:
        return None
    return "[" + ",".join(f"{float(v):.8f}" for v in values) + "]"


class AiRepository:
    def __init__(self) -> None:
        self.settings = get_settings()

    def healthcheck(self) -> dict[str, Any]:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 AS ok")
                row = cur.fetchone() or {}
                return {"ok": bool(row.get("ok", 0) == 1)}

    def pgvector_status(self) -> dict[str, Any]:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS enabled")
                row = cur.fetchone() or {}
                return {"enabled": bool(row.get("enabled", False))}

    def _build_filters_sql(self, entity_types: list[str], context_module: str | None) -> tuple[str, list[Any]]:
        filters = ["status = 'active'"]
        params: list[Any] = []

        if entity_types:
            filters.append("entity_type = ANY(%s)")
            params.append(entity_types)

        if context_module:
            filters.append("(source_module = %s OR source_module IS NULL OR source_module = '')")
            params.append(context_module)

        return " AND ".join(filters), params

    def fetch_text_candidates(
        self,
        query_text: str,
        entity_types: list[str],
        context_module: str | None,
        limit: int
    ) -> list[dict[str, Any]]:
        where_sql, params = self._build_filters_sql(entity_types, context_module)
        like_query = f"%{query_text}%"
        sql = f"""
            SELECT
                id,
                entity_type,
                entity_id,
                title,
                content,
                source_module,
                metadata_json,
                updated_at,
                COALESCE(ts_rank_cd(search_tsv, plainto_tsquery('portuguese', %s)), 0) AS textual_score
            FROM ai_documents
            WHERE {where_sql}
              AND (
                search_tsv @@ plainto_tsquery('portuguese', %s)
                OR content_normalized ILIKE %s
                OR title ILIKE %s
              )
            ORDER BY textual_score DESC, updated_at DESC
            LIMIT %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [*params[:0], query_text, *params, query_text, like_query, like_query, limit])
                return cur.fetchall() or []

    def fetch_vector_candidates(
        self,
        query_embedding: list[float] | None,
        entity_types: list[str],
        context_module: str | None,
        limit: int
    ) -> list[dict[str, Any]]:
        if not query_embedding or not self.settings.enable_vector_search:
            return []

        where_sql, params = self._build_filters_sql(entity_types, context_module)
        vector = _vector_literal(query_embedding)
        sql = f"""
            SELECT
                id,
                entity_type,
                entity_id,
                title,
                content,
                source_module,
                metadata_json,
                updated_at,
                GREATEST(0, 1 - (embedding <=> %s::vector)) AS semantic_score
            FROM ai_documents
            WHERE {where_sql}
              AND embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """

        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [vector, *params, vector, limit])
                return cur.fetchall() or []

    def fetch_alias_scores(self, query_text: str) -> dict[tuple[str, str], float]:
        like_query = f"%{query_text}%"
        sql = """
            SELECT entity_type, entity_id, MAX(weight) AS weight
            FROM ai_aliases
            WHERE alias_normalized ILIKE %s
            GROUP BY entity_type, entity_id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [like_query])
                rows = cur.fetchall() or []

        scores: dict[tuple[str, str], float] = {}
        for row in rows:
            key = (str(row.get("entity_type")), str(row.get("entity_id")))
            scores[key] = float(row.get("weight", 0))
        return scores

    def fetch_feedback_scores(self, feature_name: str) -> dict[tuple[str, str], float]:
        sql = """
            SELECT
                suggested_entity_type AS entity_type,
                suggested_entity_id AS entity_id,
                AVG(CASE WHEN accepted THEN 1 ELSE 0 END)::float AS feedback_score
            FROM ai_feedback
            WHERE feature_name = %s
              AND suggested_entity_type IS NOT NULL
              AND suggested_entity_id IS NOT NULL
            GROUP BY suggested_entity_type, suggested_entity_id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [feature_name])
                rows = cur.fetchall() or []

        scores: dict[tuple[str, str], float] = {}
        for row in rows:
            key = (str(row.get("entity_type")), str(row.get("entity_id")))
            scores[key] = float(row.get("feedback_score", 0.5))
        return scores

    def fetch_match_history_scores(self) -> dict[tuple[str, str], float]:
        sql = """
            SELECT target_entity_type AS entity_type, target_entity_id AS entity_id, MAX(confidence) AS confidence
            FROM ai_entity_matches
            WHERE status IN ('confirmado', 'aprovado', 'forte', 'provavel', 'approved')
            GROUP BY target_entity_type, target_entity_id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall() or []

        out: dict[tuple[str, str], float] = {}
        for row in rows:
            key = (str(row.get("entity_type")), str(row.get("entity_id")))
            out[key] = float(row.get("confidence", 0.0))
        return out

    def save_match_suggestions(
        self,
        source_entity_type: str,
        source_entity_id: str | None,
        match_rows: list[dict[str, Any]]
    ) -> None:
        if not match_rows:
            return

        sql = """
            INSERT INTO ai_entity_matches (
                source_entity_type,
                source_entity_id,
                target_entity_type,
                target_entity_id,
                match_type,
                confidence,
                reasons_json,
                status
            ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s)
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                for row in match_rows:
                    cur.execute(
                        sql,
                        [
                            source_entity_type,
                            source_entity_id,
                            row.get("target_entity_type"),
                            row.get("target_entity_id"),
                            row.get("match_type", "semantic"),
                            float(row.get("confidence", 0.0)),
                            Json(row.get("reasons", [])),
                            row.get("status", "revisar")
                        ]
                    )
            conn.commit()

    def save_feedback(
        self,
        feature_name: str,
        query_text: str,
        suggested_entity_type: str,
        suggested_entity_id: str,
        accepted: bool,
        user_id: str | None,
        context: dict[str, Any] | None = None
    ) -> None:
        sql = """
            INSERT INTO ai_feedback (
                feature_name,
                query_text,
                suggested_entity_type,
                suggested_entity_id,
                accepted,
                user_id,
                context_json
            ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb)
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    [
                        feature_name,
                        query_text,
                        suggested_entity_type,
                        suggested_entity_id,
                        accepted,
                        user_id,
                        Json(context or {})
                    ]
                )
            conn.commit()

    def clear_documents(self, entity_type: str | None = None, entity_id: str | None = None) -> int:
        filters = []
        params: list[Any] = []

        if entity_type:
            filters.append("entity_type = %s")
            params.append(entity_type)

        if entity_id:
            filters.append("entity_id = %s")
            params.append(entity_id)

        where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""
        sql = f"DELETE FROM ai_documents {where_sql}"

        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                count = cur.rowcount
            conn.commit()
        return count

    def upsert_documents(self, documents: list[dict[str, Any]]) -> int:
        if not documents:
            return 0

        sql = """
            INSERT INTO ai_documents (
                entity_type,
                entity_id,
                title,
                content,
                content_normalized,
                source_module,
                metadata_json,
                embedding,
                status
            ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,CASE WHEN %s IS NULL THEN NULL ELSE %s::vector END,%s)
            ON CONFLICT (entity_type, entity_id) DO UPDATE
            SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                content_normalized = EXCLUDED.content_normalized,
                source_module = EXCLUDED.source_module,
                metadata_json = EXCLUDED.metadata_json,
                embedding = EXCLUDED.embedding,
                status = EXCLUDED.status,
                updated_at = NOW()
        """

        with get_conn() as conn:
            with conn.cursor() as cur:
                for doc in documents:
                    vector = _vector_literal(doc.get("embedding"))
                    cur.execute(
                        sql,
                        [
                            doc.get("entity_type"),
                            doc.get("entity_id"),
                            doc.get("title"),
                            doc.get("content"),
                            doc.get("content_normalized"),
                            doc.get("source_module"),
                            Json(doc.get("metadata_json", {})),
                            vector,
                            vector,
                            doc.get("status", "active")
                        ]
                    )
            conn.commit()

        return len(documents)
