import hmac
from fastapi import Header, HTTPException, Request, status
from .config import get_settings


def _extract_token(authorization: str | None, internal_header: str | None) -> str:
    if internal_header:
        return internal_header.strip()

    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()

    return ""


async def require_internal_token(
    request: Request,
    authorization: str | None = Header(default=None),
    x_internal_token: str | None = Header(default=None, alias="x-internal-token")
) -> None:
    settings = get_settings()
    configured_header = str(settings.internal_token_header or "x-internal-token").strip().lower()
    dynamic_token = request.headers.get(configured_header)
    provided = _extract_token(authorization, dynamic_token or x_internal_token)
    expected = settings.internal_token

    if not provided or not expected or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token interno invalido"
        )
