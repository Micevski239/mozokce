import json
import pytest
from deck import (
    CARD_SOURCE_META,
    DeckState,
    build_explanation,
    format_correct_choices,
    get_card_source_meta,
    load_cards,
    save_cards,
    shuffle_card_bank,
    shuffle_card_choices,
    sync_cards_to_bank,
    standardize_explanation,
)


# ── load_cards ────────────────────────────────────────────────────────────────

def test_load_cards_returns_list(tmp_path):
    f = tmp_path / "cards.json"
    f.write_text(json.dumps([
        {"question": "Q1", "answer": "A1"},
        {"question": "Q2", "answer": "A2"},
    ]))
    cards, error = load_cards(str(f))
    assert cards == [{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]
    assert error is None


def test_load_cards_missing_file_returns_empty():
    cards, error = load_cards("nonexistent_file.json")
    assert cards == []
    assert error is None


def test_load_cards_empty_array_returns_empty(tmp_path):
    f = tmp_path / "cards.json"
    f.write_text("[]")
    cards, error = load_cards(str(f))
    assert cards == []
    assert error is None


def test_load_cards_malformed_json_returns_error(tmp_path):
    f = tmp_path / "cards.json"
    f.write_text("{not valid json")
    cards, error = load_cards(str(f))
    assert cards == []
    assert error == "Error reading cards.json — check the file format."


def test_save_cards_writes_json_list(tmp_path):
    f = tmp_path / "cards.json"
    cards = [{"question": "Q1"}, {"question": "Q2"}]

    save_cards(cards, str(f))

    assert json.loads(f.read_text()) == cards


def test_get_card_source_meta_returns_display_settings():
    meta = get_card_source_meta({"question": "Q1", "source": "presentation_ai"})

    assert meta == {"key": "presentation_ai", **CARD_SOURCE_META["presentation_ai"]}


def test_get_card_source_meta_returns_none_for_unknown_source():
    assert get_card_source_meta({"question": "Q1", "source": "unknown"}) is None


def test_shuffle_card_choices_updates_correct_indexes():
    rng = __import__("random").Random(7)
    card = {
        "question": "Q1",
        "choices": ["Alpha", "Beta", "Gamma", "Delta"],
        "correct": [1, 3],
        "type": "multiple",
    }

    shuffled = shuffle_card_choices(card, rng)

    assert shuffled["question"] == "Q1"
    assert sorted(shuffled["choices"]) == sorted(card["choices"])
    assert {
        shuffled["choices"][idx] for idx in shuffled["correct"]
    } == {"Beta", "Delta"}


def test_shuffle_card_bank_preserves_question_set_and_valid_correct_indexes():
    rng = __import__("random").Random(3)
    cards = [
        {"question": "Q1", "choices": ["A", "B"], "correct": [0], "type": "single"},
        {"question": "Q2", "choices": ["C", "D"], "correct": [1], "type": "single"},
        {"question": "Q3", "choices": ["E", "F", "G"], "correct": [0, 2], "type": "multiple"},
    ]

    shuffled = shuffle_card_bank(cards, rng)

    assert {card["question"] for card in shuffled} == {"Q1", "Q2", "Q3"}
    for card in shuffled:
        assert all(0 <= idx < len(card["choices"]) for idx in card["correct"])


def test_sync_cards_to_bank_uses_reference_card_versions():
    reference = [
        {"question": "Q1", "choices": ["B", "A"], "correct": [1], "type": "single"},
        {"question": "Q2", "choices": ["X", "Y"], "correct": [0], "type": "single"},
    ]
    cards_to_sync = [
        {"question": "Q1", "choices": ["A", "B"], "correct": [0], "type": "single"},
        {"question": "Q3", "choices": ["M"], "correct": [0], "type": "single"},
    ]

    synced = sync_cards_to_bank(reference, cards_to_sync)

    assert synced == [
        {"question": "Q1", "choices": ["B", "A"], "correct": [1], "type": "single"},
        {"question": "Q3", "choices": ["M"], "correct": [0], "type": "single"},
    ]


# ── DeckState ─────────────────────────────────────────────────────────────────

SAMPLE_CARDS = [
    {"question": "Q1", "choices": ["A", "B"], "correct": [0], "type": "single"},
    {"question": "Q2", "choices": ["A", "B"], "correct": [1], "type": "single"},
    {"question": "Q3", "choices": ["A", "B"], "correct": [0], "type": "single"},
]


def test_deck_initial_state():
    deck = DeckState(SAMPLE_CARDS)
    assert deck.total == 3
    assert deck.current_position == 1
    assert deck.current_card() == SAMPLE_CARDS[0]


def test_deck_next_advances_index():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    assert deck.current_position == 2
    assert deck.current_card() == SAMPLE_CARDS[1]


def test_deck_next_wraps_at_end():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    deck.next()
    deck.next()
    assert deck.current_position == 1


def test_deck_prev_goes_back():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    deck.prev()
    assert deck.current_position == 1


def test_deck_prev_wraps_at_start():
    deck = DeckState(SAMPLE_CARDS)
    deck.prev()
    assert deck.current_position == 3


def test_deck_shuffle_on_covers_all_cards():
    deck = DeckState(SAMPLE_CARDS)
    deck.shuffle(True)
    visited = set()
    for _ in range(deck.total):
        visited.add(deck.current_card()["question"])
        deck.next()
    assert visited == {"Q1", "Q2", "Q3"}


def test_deck_shuffle_off_restores_order():
    deck = DeckState(SAMPLE_CARDS)
    deck.shuffle(True)
    deck.shuffle(False)
    assert deck.current_card() == SAMPLE_CARDS[0]
    deck.next()
    assert deck.current_card() == SAMPLE_CARDS[1]


def test_deck_empty_returns_none():
    deck = DeckState([])
    assert deck.total == 0
    assert deck.current_card() is None


# ── Scoring ───────────────────────────────────────────────────────────────────

def test_mark_correct_increments_score():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)
    correct, total = deck.session_score()
    assert correct == 1
    assert total == 1


def test_mark_wrong_does_not_increment_correct():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(False)
    correct, total = deck.session_score()
    assert correct == 0
    assert total == 1


def test_session_score_tracks_multiple_answers():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)
    deck.next()
    deck.mark(False)
    deck.next()
    deck.mark(True)
    correct, total = deck.session_score()
    assert correct == 2
    assert total == 3


def test_missed_cards_returns_wrong_answers():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)   # Q1 correct
    deck.next()
    deck.mark(False)  # Q2 wrong
    deck.next()
    deck.mark(False)  # Q3 wrong
    missed = deck.missed_cards()
    assert len(missed) == 2
    assert SAMPLE_CARDS[1] in missed
    assert SAMPLE_CARDS[2] in missed


def test_missed_cards_empty_when_all_correct():
    deck = DeckState(SAMPLE_CARDS)
    for _ in range(deck.total):
        deck.mark(True)
        if deck.current_position < deck.total:
            deck.next()
    assert deck.missed_cards() == []


def test_correct_cards_returns_only_correct_answers():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)   # Q1 correct
    deck.next()
    deck.mark(False)  # Q2 wrong
    deck.next()
    deck.mark(True)   # Q3 correct
    correct_cards = deck.correct_cards()
    assert correct_cards == [SAMPLE_CARDS[0], SAMPLE_CARDS[2]]


def test_restart_resets_scores():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)
    deck.next()
    deck.mark(False)
    deck.restart()
    correct, total = deck.session_score()
    assert correct == 0
    assert total == 0
    assert deck.current_position == 1


def test_shuffle_resets_scores():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)
    deck.shuffle(True)
    correct, total = deck.session_score()
    assert correct == 0
    assert total == 0


def test_remove_question_preserves_other_results():
    deck = DeckState(SAMPLE_CARDS)
    deck.mark(True)   # Q1 correct
    deck.next()
    deck.mark(False)  # Q2 wrong
    deck.next()
    removed = deck.remove_question("Q2")

    assert removed is True
    assert [card["question"] for card in deck.original] == ["Q1", "Q3"]
    assert deck.total == 2
    assert deck.current_card()["question"] == "Q3"
    assert deck.correct_cards() == [SAMPLE_CARDS[0]]
    assert deck.missed_cards() == []


def test_format_correct_choices_uses_letter_prefixes():
    card = {"choices": ["Alpha", "Beta", "Gamma"], "correct": [0, 2]}
    assert format_correct_choices(card) == ["a) Alpha", "c) Gamma"]


def test_build_explanation_uses_existing_text_when_present():
    card = {
        "question": "Q",
        "choices": ["A", "B"],
        "correct": [1],
        "type": "single",
        "explanation": "Custom explanation",
    }
    explanation = build_explanation(card)
    assert explanation.startswith("Зошто: Точен одговор е:")
    assert "b) B" in explanation
    assert "Custom explanation" in explanation
    assert "\nЗа испит:" in explanation


def test_build_explanation_creates_fallback_for_multiple_choice():
    card = {
        "question": "Кои тврдења се точни?",
        "choices": ["A", "B", "C"],
        "correct": [0, 2],
        "type": "multiple",
    }
    explanation = build_explanation(card)
    assert explanation.startswith("Зошто: Точни одговори се:")
    assert "a) A" in explanation
    assert "c) C" in explanation
    assert "\nЗа испит:" in explanation


def test_standardize_explanation_uses_second_sentence_for_exam_note():
    card = {
        "question": "Q",
        "choices": ["A", "B"],
        "correct": [0],
        "type": "single",
    }
    explanation = standardize_explanation(
        card,
        "Првата реченица објаснува зошто. Втората реченица е за паметење.",
    )
    assert explanation == (
        "Зошто: Точен одговор е: a) A Првата реченица објаснува зошто.\n"
        "За испит: Втората реченица е за паметење."
    )
