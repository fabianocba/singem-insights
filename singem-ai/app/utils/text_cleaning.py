from .normalization import normalize_text, normalize_spaces


def clean_for_embedding(value: str, max_len: int = 4000) -> str:
    text = normalize_text(value)
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip()


def clean_for_storage(value: str, max_len: int = 16000) -> str:
    text = normalize_spaces(str(value or ""))
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip()
