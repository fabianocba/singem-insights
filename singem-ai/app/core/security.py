import hmac
from fastapi import Header, HTTPException, status
from .config import get_settings


def _extract_token(authorization: str | None, internal_header: str | None) -> str:
    if internal_header:
        return internal_header.strip()

    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()

    return ""


async def require_internal_token(
    authorization: str | None = Header(default=None),
    x_internal_token: str | None = Header(default=None, alias="x-internal-token")
) -> None:
    settings = get_settings()
    provided = _extract_token(authorization, x_internal_token)
    expected = settings.internal_token

    if not provided or not expected or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token interno inválido"
        )
