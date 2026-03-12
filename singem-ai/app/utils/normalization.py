import re
import unicodedata


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", str(value or ""))
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def normalize_text(value: str) -> str:
    text = strip_accents(str(value or "").lower())
    text = re.sub(r"[^a-z0-9\s\-_/.,]", " ", text)
    text = normalize_spaces(text)
    return text


def tokenize(value: str) -> list[str]:
    text = normalize_text(value)
    if not text:
        return []
    tokens = [token for token in re.split(r"[^a-z0-9]+", text) if len(token) >= 2]
    deduped = []
    seen = set()
    for token in tokens:
        if token in seen:
            continue
        seen.add(token)
        deduped.append(token)
    return deduped


def normalize_cnpj(value: str) -> str:
    return re.sub(r"\D", "", str(value or ""))[:14]
