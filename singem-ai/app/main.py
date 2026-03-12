from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import router as ai_router
from app.core.config import get_settings
from app.core.db import close_pool
from app.core.logging import setup_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    setup_logging(debug=settings.app_debug)
    yield
    close_pool()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.app_debug,
        lifespan=lifespan
    )
    app.include_router(ai_router, prefix=settings.api_prefix, tags=["ai-core"])
    return app


app = create_app()
