from dataclasses import dataclass


@dataclass
class ScoreBreakdown:
    textual: float
    semantic: float
    rules: float
    popularity: float
    feedback: float
    final: float


def clamp_score(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    return max(min_value, min(max_value, float(value or 0.0)))


def weighted_score(
    textual: float,
    semantic: float,
    rules: float,
    popularity: float,
    feedback: float,
    w_textual: float,
    w_semantic: float,
    w_rules: float,
    w_popularity: float,
    w_feedback: float
) -> ScoreBreakdown:
    textual = clamp_score(textual)
    semantic = clamp_score(semantic)
    rules = clamp_score(rules)
    popularity = clamp_score(popularity)
    feedback = clamp_score(feedback)

    final = (
        w_textual * textual
        + w_semantic * semantic
        + w_rules * rules
        + w_popularity * popularity
        + w_feedback * feedback
    )

    return ScoreBreakdown(
        textual=textual,
        semantic=semantic,
        rules=rules,
        popularity=popularity,
        feedback=feedback,
        final=clamp_score(final)
    )


def confidence_label(value: float, strong: float, probable: float, review: float) -> str:
    score = clamp_score(value)
    if score >= strong:
        return "forte"
    if score >= probable:
        return "provavel"
    if score >= review:
        return "revisar"
    return "fraco"
