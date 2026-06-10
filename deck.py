import json
import random
import re

LETTERS = list("abcdefghijklmnopqrstuvwxyz")
CARD_SOURCE_META = {
    "presentation_ai": {
        "label": "AI генерирано • презентации",
        "fg_color": "#0f766e",
        "text_color": "#ccfbf1",
    },
    "pdf_questions": {
        "label": "PDF прашања",
        "fg_color": "#9a3412",
        "text_color": "#ffedd5",
    },
    "notebook_lm": {
        "label": "Notebook LM",
        "fg_color": "#4c1d95",
        "text_color": "#f3e8ff",
    },
    "discord": {
        "label": "Discord",
        "fg_color": "#1d4ed8",
        "text_color": "#dbeafe",
    },
}


def load_cards(path="cards.json"):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return ([], "Error reading cards.json — check the file format.")
        return (data, None)
    except FileNotFoundError:
        return ([], None)
    except json.JSONDecodeError:
        return ([], "Error reading cards.json — check the file format.")


def save_cards(cards, path="cards.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)


def get_card_source_meta(card):
    source_key = str(card.get("source", "")).strip()
    meta = CARD_SOURCE_META.get(source_key)
    if not meta:
        return None
    return {"key": source_key, **meta}


def get_card_source_reference_text(card):
    meta = get_card_source_meta(card)
    if not meta:
        return "материјалот"
    if meta["key"] == "discord":
        return "Discord прашањата"
    if meta["key"] == "notebook_lm":
        return "Notebook LM прашањата"
    if meta["key"] == "pdf_questions":
        return "PDF прашањата"
    return "материјалот од презентациите"


def shuffle_card_choices(card, rng=None):
    rng = rng or random
    choices = list(card.get("choices", []))
    indexed_choices = list(enumerate(choices))
    rng.shuffle(indexed_choices)

    correct_indexes = {
        idx for idx in card.get("correct", [])
        if isinstance(idx, int) and 0 <= idx < len(choices)
    }
    shuffled_correct = [
        new_idx
        for new_idx, (old_idx, _choice) in enumerate(indexed_choices)
        if old_idx in correct_indexes
    ]

    shuffled_card = dict(card)
    shuffled_card["choices"] = [choice for _old_idx, choice in indexed_choices]
    shuffled_card["correct"] = shuffled_correct
    return shuffled_card


def shuffle_card_bank(cards, rng=None):
    rng = rng or random
    shuffled_cards = [shuffle_card_choices(card, rng) for card in cards]
    rng.shuffle(shuffled_cards)
    return shuffled_cards


def card_question_keys(card):
    keys = []
    question = str(card.get("question", "")).strip()
    if question:
        keys.append(question)
    for alias in card.get("aliases", []) or []:
        alias_text = str(alias).strip()
        if alias_text and alias_text not in keys:
            keys.append(alias_text)
    return keys


def sync_cards_to_bank(reference_cards, cards_to_sync):
    reference_by_question = {}
    for card in reference_cards:
        for key in card_question_keys(card):
            reference_by_question[key] = card
    synced = []
    for card in cards_to_sync:
        question = str(card.get("question", "")).strip()
        if question and question in reference_by_question:
            synced.append(dict(reference_by_question[question]))
        else:
            synced.append(card)
    return synced


def format_correct_choices(card):
    choices = card.get("choices", [])
    correct = card.get("correct", [])
    parts = []
    for idx in correct:
        if 0 <= idx < len(choices):
            label = LETTERS[idx] if idx < len(LETTERS) else str(idx + 1)
            parts.append(f"{label}) {choices[idx]}")
    return parts


def standardize_explanation(card, text):
    text = " ".join(str(text).strip().split())
    if not text:
        return ""
    if text.startswith("Зошто:") and "\nЗа испит:" in text:
        return text

    correct_parts = format_correct_choices(card)
    correct_text = "; ".join(correct_parts) if correct_parts else "Нема означен точен одговор."
    answer_prefix = "Точни одговори се:" if len(correct_parts) > 1 else "Точен одговор е:"

    sentences = [
        part.strip()
        for part in re.split(r"(?<=[.!?])\s+", text)
        if part.strip()
    ]
    why_text = sentences[0] if sentences else text
    exam_text = " ".join(sentences[1:]).strip() or why_text
    return (
        f"Зошто: {answer_prefix} {correct_text} {why_text}\n"
        f"За испит: {exam_text}"
    )


def build_explanation(card):
    existing = str(card.get("explanation", "")).strip()
    if existing:
        return standardize_explanation(card, existing)

    question = str(card.get("question", "")).strip()
    question_lower = question.lower()
    correct_parts = format_correct_choices(card)
    correct_text = "; ".join(correct_parts) if correct_parts else "Нема означен точен одговор."
    source_text = get_card_source_reference_text(card)

    if "редослед" in question_lower or "секвенца" in question_lower or "подреди" in question_lower:
        prefix = "Точниот редослед е"
    elif card.get("type") == "multiple":
        prefix = "Точни одговори се"
    else:
        prefix = "Точен одговор е"

    if "точно или неточно" in question_lower:
        raw = f"{prefix}: {correct_text}. Ова тврдење така е наведено во {source_text}."
        return standardize_explanation(card, raw)
    if "што претставува" in question_lower:
        raw = f"{prefix}: {correct_text}. Ова е дефиницијата или описот што се совпаѓа со {source_text}."
        return standardize_explanation(card, raw)
    if "кои тврдења" in question_lower or "што е точно" in question_lower:
        raw = f"{prefix}: {correct_text}. Само овие тврдења се совпаѓаат со условите и поимите од {source_text}."
        return standardize_explanation(card, raw)
    if "кога" in question_lower:
        raw = f"{prefix}: {correct_text}. Ова е условот што е наведен или директно следи од {source_text}."
        return standardize_explanation(card, raw)
    raw = f"{prefix}: {correct_text}. Ова е точниот избор според {source_text}."
    return standardize_explanation(card, raw)


class DeckState:
    def __init__(self, cards):
        self.original = [shuffle_card_choices(c) for c in cards]
        self.order = list(range(len(self.original)))
        self.index = 0
        self._shuffle_on = False
        self._results = {}  # index in order -> bool

    @property
    def total(self):
        return len(self.original)

    @property
    def current_position(self):
        return self.index + 1

    def current_card(self):
        if not self.original:
            return None
        return self.original[self.order[self.index]]

    def next(self):
        self.index = (self.index + 1) % self.total

    def prev(self):
        self.index = (self.index - 1) % self.total

    def shuffle(self, enabled):
        self._shuffle_on = enabled
        self.order = list(range(self.total))
        if enabled:
            random.shuffle(self.order)
        self.index = 0
        self._results = {}

    def restart(self):
        self.index = 0
        self._results = {}

    def remove_question(self, question):
        question = str(question).strip()
        if not question or not self.original:
            return False

        old_original = list(self.original)
        old_order = list(self.order)
        old_results = dict(self._results)
        old_index = self.index

        old_to_new = {}
        new_original = []
        for old_idx, card in enumerate(old_original):
            if str(card.get("question", "")).strip() == question:
                continue
            old_to_new[old_idx] = len(new_original)
            new_original.append(card)

        if len(new_original) == len(old_original):
            return False

        new_order = []
        old_pos_to_new_pos = {}
        for old_pos, old_orig_idx in enumerate(old_order):
            if old_orig_idx not in old_to_new:
                continue
            old_pos_to_new_pos[old_pos] = len(new_order)
            new_order.append(old_to_new[old_orig_idx])

        new_results = {}
        for old_pos, was_correct in old_results.items():
            new_pos = old_pos_to_new_pos.get(old_pos)
            if new_pos is not None:
                new_results[new_pos] = was_correct

        self.original = new_original
        self.order = new_order
        self._results = new_results

        if not self.original:
            self.index = 0
        elif old_index in old_pos_to_new_pos:
            self.index = old_pos_to_new_pos[old_index]
        else:
            self.index = min(old_index, len(self.order) - 1)

        return True

    def mark(self, correct):
        self._results[self.index] = correct

    def session_score(self):
        answered = len(self._results)
        correct = sum(1 for v in self._results.values() if v)
        return (correct, answered)

    def missed_cards(self):
        return [
            self.original[self.order[i]]
            for i, correct in self._results.items()
            if not correct
        ]

    def correct_cards(self):
        return [
            self.original[self.order[i]]
            for i, correct in self._results.items()
            if correct
        ]
