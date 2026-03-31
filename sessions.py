import json
from datetime import datetime
from pathlib import Path

MASTERED_THRESHOLD = 2
TAINTED_THRESHOLD = 3


def _load_json_list(path):
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _normalize_missed_items(missed_items):
    normalized = []
    for item in missed_items or []:
        if isinstance(item, dict):
            question = str(item.get("question", "")).strip()
            if question:
                normalized.append(item)
        else:
            question = str(item).strip()
            if question:
                normalized.append({"question": question})
    return normalized


def _normalize_card_items(items):
    normalized = []
    for item in items or []:
        if isinstance(item, dict):
            question = str(item.get("question", "")).strip()
            if question:
                normalized.append(item)
    return normalized


def load_sessions(path="sessions.json"):
    return _load_json_list(path)


def save_session(score_pct, correct, total, missed_questions, path="sessions.json", deck_mode="main"):
    sessions = load_sessions(path)
    missed_cards = _normalize_missed_items(missed_questions)

    sessions.append({
        "date": datetime.now().isoformat(timespec="seconds"),
        "deck_mode": deck_mode,
        "score_pct": score_pct,
        "correct": correct,
        "total": total,
        "missed": [card["question"] for card in missed_cards],
        "missed_cards": missed_cards,
    })

    _write_json(path, sessions)


def delete_session_at(index, path="sessions.json"):
    sessions = load_sessions(path)
    if index < 0 or index >= len(sessions):
        return sessions

    del sessions[index]
    _write_json(path, sessions)
    return sessions


def load_wrong_cards(path="wrong_cards.json"):
    return _load_json_list(path)


def save_wrong_cards(cards, path="wrong_cards.json"):
    _write_json(path, cards)


def _tainted_path(path):
    wrong_path = Path(path)
    return str(wrong_path.with_name("tainted.json"))


def load_redemption_strikes(path="redemption_strikes.json"):
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_redemption_strikes(strikes, path="redemption_strikes.json"):
    with open(path, "w") as f:
        json.dump(strikes, f, ensure_ascii=False, indent=2)


def load_wrong_strikes(path="wrong_strikes.json"):
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_wrong_strikes(strikes, path="wrong_strikes.json"):
    with open(path, "w") as f:
        json.dump(strikes, f, ensure_ascii=False, indent=2)


def record_wrong_strike(question, path="wrong_strikes.json"):
    """Increment wrong count for a question. Returns the new count."""
    strikes = load_wrong_strikes(path)
    count = strikes.get(question, 0) + 1
    strikes[question] = count
    save_wrong_strikes(strikes, path)
    return count


def load_tainted_questions(path="tainted.json"):
    return _load_json_list(path)


def save_tainted_questions(questions, path="tainted.json"):
    cleaned = sorted({
        str(question).strip()
        for question in questions or []
        if str(question).strip()
    })
    _write_json(path, cleaned)


def tainted_question_set(path="tainted.json"):
    return {
        str(question).strip()
        for question in load_tainted_questions(path)
        if str(question).strip()
    }


def sync_tainted_with_wrong_cards(wrong_cards_path="wrong_cards.json", tainted_path=None):
    target_path = tainted_path or _tainted_path(wrong_cards_path)
    tainted_questions = tainted_question_set(target_path)
    tainted_questions.update(
        card.get("question")
        for card in load_wrong_cards(wrong_cards_path)
        if card.get("question")
    )
    save_tainted_questions(tainted_questions, target_path)
    return tainted_questions


def merge_wrong_cards(cards, path="wrong_cards.json", tainted_path=None):
    existing = load_wrong_cards(path)
    merged = []
    seen = set()

    for card in existing + _normalize_missed_items(cards):
        question = card.get("question")
        if not question or question in seen:
            continue
        seen.add(question)
        merged.append(card)

    save_wrong_cards(merged, path)
    return merged


def clear_wrong_cards(cards, path="wrong_cards.json"):
    to_remove = {
        card.get("question")
        for card in _normalize_missed_items(cards)
        if card.get("question")
    }
    remaining = [
        card for card in load_wrong_cards(path)
        if card.get("question") not in to_remove
    ]
    save_wrong_cards(remaining, path)
    return remaining


def clear_tainted_questions(cards, path="tainted.json"):
    to_remove = {
        card.get("question")
        for card in _normalize_missed_items(cards)
        if card.get("question")
    }
    remaining = [
        question for question in load_tainted_questions(path)
        if str(question).strip() not in to_remove
    ]
    save_tainted_questions(remaining, path)
    return set(remaining)


def load_mastered_cards(path="mastered_cards.json"):
    return _load_json_list(path)


def save_mastered_cards(cards, path="mastered_cards.json"):
    _write_json(path, cards)


def _mastery_progress_path(path):
    mastered_path = Path(path)
    return str(mastered_path.with_name("mastery_progress.json"))


def load_mastery_progress(path="mastered_cards.json", progress_path=None):
    return _load_json_list(progress_path or _mastery_progress_path(path))


def save_mastery_progress(cards, path="mastered_cards.json", progress_path=None):
    _write_json(progress_path or _mastery_progress_path(path), cards)


def clear_mastered_state(path="mastered_cards.json", progress_path=None):
    save_mastered_cards([], path)
    save_mastery_progress([], path, progress_path)


def update_mastered_cards(
    correct_cards,
    wrong_cards,
    path="mastered_cards.json",
    progress_path=None,
    threshold=MASTERED_THRESHOLD,
    tainted_path=None,
):
    records = {
        record.get("question"): record
        for record in load_mastery_progress(path, progress_path)
        if record.get("question")
    }
    tainted_questions = tainted_question_set(
        tainted_path or str(Path(path).with_name("tainted.json"))
    )

    wrong_by_question = {
        card.get("question"): card
        for card in _normalize_card_items(wrong_cards)
        if card.get("question")
    }
    correct_by_question = {
        card.get("question"): card
        for card in _normalize_card_items(correct_cards)
        if card.get("question")
    }

    for question, card in wrong_by_question.items():
        record = records.get(question, {})
        record.update(card)
        record["question"] = question
        record["streak"] = 0
        record["mastered"] = False
        records[question] = record

    for question, card in correct_by_question.items():
        if question in wrong_by_question:
            continue
        if question in tainted_questions:
            continue
        record = records.get(question, {})
        record.update(card)
        record["question"] = question
        record["streak"] = int(record.get("streak", 0)) + 1
        record["mastered"] = record["streak"] >= threshold
        records[question] = record

    cleaned = []
    for record in records.values():
        if int(record.get("streak", 0)) <= 0:
            continue
        cleaned.append(record)

    cleaned.sort(key=lambda record: (-int(record.get("streak", 0)), record.get("question", "")))
    save_mastery_progress(cleaned, path, progress_path)

    mastered = []
    for record in cleaned:
        if int(record.get("streak", 0)) < threshold:
            continue
        mastered_record = dict(record)
        mastered_record["mastered"] = True
        mastered.append(mastered_record)

    save_mastered_cards(mastered, path)
    return mastered


def mastered_question_set(path="mastered_cards.json", threshold=MASTERED_THRESHOLD):
    return {
        record.get("question")
        for record in load_mastered_cards(path)
        if record.get("question") and int(record.get("streak", 0)) >= threshold
    }


def summarize_sessions(sessions):
    if not sessions:
        return {
            "count": 0,
            "average_score": 0,
            "best_score": 0,
            "last_score": 0,
            "average_correct": 0,
            "best_correct": 0,
            "last_correct": 0,
        }

    scores = [s.get("score_pct", 0) for s in sessions]
    correct_counts = [s.get("correct", 0) for s in sessions]
    return {
        "count": len(sessions),
        "average_score": round(sum(scores) / len(scores)),
        "best_score": max(scores),
        "last_score": scores[-1],
        "average_correct": round(sum(correct_counts) / len(correct_counts)),
        "best_correct": max(correct_counts),
        "last_correct": correct_counts[-1],
    }
