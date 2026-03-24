import os

import uvicorn


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return str(value).strip().lower() == "true"


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.getenv("AI_CORE_HOST", "0.0.0.0"),
        port=env_int("AI_CORE_PORT", 8010),
        reload=env_flag("AI_CORE_RELOAD", False),
        log_level=os.getenv("AI_CORE_LOG_LEVEL", "info")
    )
