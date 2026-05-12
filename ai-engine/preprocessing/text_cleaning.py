import html
import re
import unicodedata


WHITESPACE_RE = re.compile(r"\s+")


def normalize_text(value: object) -> str:
    if value is None:
        return ""

    try:
        if value != value:
            return ""
    except Exception:
        pass

    text = str(value)
    text = html.unescape(text)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ")
    text = WHITESPACE_RE.sub(" ", text)
    return text.strip()


def normalize_binary_label(value: object) -> int | None:
    if value is None:
        return None

    text = normalize_text(value).lower()
    if text in {"1", "1.0", "true", "vrai", "ok", "conforme", "yes", "oui"}:
        return 1
    if text in {"0", "0.0", "false", "faux", "ko", "non conforme", "no", "non"}:
        return 0

    try:
        number = float(text)
        if number == 1.0:
            return 1
        if number == 0.0:
            return 0
    except ValueError:
        return None

    return None


def join_ticket_text(title: str, description: str, solution: str) -> str:
    parts = [
        f"Titre: {normalize_text(title)}",
        f"Description: {normalize_text(description)}",
        f"Solution: {normalize_text(solution)}",
    ]
    return "\n".join(part for part in parts if not part.endswith(": "))
