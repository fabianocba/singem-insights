from __future__ import annotations

from typing import Any
from psycopg.types.json import Json
from app.core.db import get_conn


class ReportRepository:
    def get_cache(self, report_key: str, params_hash: str) -> dict[str, Any] | None:
        sql = """
            SELECT report_key, summary_text, insights_json, created_at, expires_at
            FROM ai_report_cache
            WHERE report_key = %s
              AND params_hash = %s
              AND expires_at > NOW()
            LIMIT 1
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [report_key, params_hash])
                return cur.fetchone()

    def save_cache(
        self,
        report_key: str,
        params_hash: str,
        summary_text: str,
        insights_json: dict[str, Any],
        ttl_seconds: int
    ) -> None:
        sql = """
            INSERT INTO ai_report_cache (report_key, params_hash, summary_text, insights_json, created_at, expires_at)
            VALUES (%s,%s,%s,%s::jsonb,NOW(),NOW() + (%s || ' seconds')::interval)
            ON CONFLICT (report_key, params_hash)
            DO UPDATE SET
                summary_text = EXCLUDED.summary_text,
                insights_json = EXCLUDED.insights_json,
                created_at = NOW(),
                expires_at = NOW() + (%s || ' seconds')::interval
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    [
                        report_key,
                        params_hash,
                        summary_text,
                        Json(insights_json),
                        ttl_seconds,
                        ttl_seconds
                    ]
                )
            conn.commit()
