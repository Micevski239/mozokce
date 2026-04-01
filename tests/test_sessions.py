import json

from sessions import (
    MASTERED_THRESHOLD,
    clear_tainted_questions,
    clear_wrong_cards,
    clear_mastered_state,
    delete_session_at,
    load_sessions,
    load_flagged_cards,
    load_mastered_cards,
    load_mastery_progress,
    load_tainted_questions,
    load_wrong_cards,
    mastered_question_set,
    merge_wrong_cards,
    save_session,
    save_tainted_questions,
    sync_tainted_with_wrong_cards,
    toggle_flagged_card,
    tainted_question_set,
    update_mastered_cards,
    summarize_sessions,
)


def test_load_sessions_missing_file_returns_empty():
    assert load_sessions("missing_sessions.json") == []


def test_load_sessions_bad_json_returns_empty(tmp_path):
    f = tmp_path / "sessions.json"
    f.write_text("{bad json")
    assert load_sessions(str(f)) == []


def test_save_session_appends_records(tmp_path):
    f = tmp_path / "sessions.json"

    save_session(80, 8, 10, ["Q1", "Q2"], str(f))
    save_session(50, 5, 10, ["Q3"], str(f))

    sessions = load_sessions(str(f))
    assert len(sessions) == 2
    assert sessions[0]["score_pct"] == 80
    assert sessions[1]["missed"] == ["Q3"]
    assert sessions[0]["deck_mode"] == "main"
    assert sessions[0]["missed_cards"] == [{"question": "Q1"}, {"question": "Q2"}]


def test_save_session_keeps_full_missed_card_objects(tmp_path):
    f = tmp_path / "sessions.json"
    missed_cards = [
        {"question": "Q1", "choices": ["A", "B"], "correct": [1], "type": "single"},
    ]

    save_session(0, 0, 1, missed_cards, str(f), deck_mode="wrong_set")

    sessions = load_sessions(str(f))
    assert sessions[0]["deck_mode"] == "wrong_set"
    assert sessions[0]["missed"] == ["Q1"]
    assert sessions[0]["missed_cards"] == missed_cards


def test_delete_session_at_removes_requested_session(tmp_path):
    f = tmp_path / "sessions.json"

    save_session(80, 8, 10, ["Q1"], str(f))
    save_session(60, 6, 10, ["Q2"], str(f))
    save_session(40, 4, 10, ["Q3"], str(f))

    remaining = delete_session_at(1, str(f))

    assert len(remaining) == 2
    assert remaining[0]["missed"] == ["Q1"]
    assert remaining[1]["missed"] == ["Q3"]
    assert load_sessions(str(f)) == remaining


def test_summarize_sessions_returns_aggregate_values():
    sessions = [
        {"score_pct": 60, "correct": 6},
        {"score_pct": 80, "correct": 8},
        {"score_pct": 100, "correct": 10},
    ]

    summary = summarize_sessions(sessions)

    assert summary == {
        "count": 3,
        "average_score": 80,
        "best_score": 100,
        "last_score": 100,
        "average_correct": 8,
        "best_correct": 10,
        "last_correct": 10,
    }


def test_summarize_sessions_empty_defaults():
    assert summarize_sessions([]) == {
        "count": 0,
        "average_score": 0,
        "best_score": 0,
        "last_score": 0,
        "average_correct": 0,
        "best_correct": 0,
        "last_correct": 0,
    }


def test_load_wrong_cards_missing_file_returns_empty():
    assert load_wrong_cards("missing_wrong_cards.json") == []


def test_toggle_flagged_card_adds_and_removes_question(tmp_path):
    flagged_path = tmp_path / "flagged_cards.json"
    card = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}

    added = toggle_flagged_card(card, str(flagged_path))
    assert added is True
    assert load_flagged_cards(str(flagged_path)) == [card]

    removed = toggle_flagged_card(card, str(flagged_path))
    assert removed is False
    assert load_flagged_cards(str(flagged_path)) == []


def test_toggle_flagged_card_deduplicates_by_question(tmp_path):
    flagged_path = tmp_path / "flagged_cards.json"
    first = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}
    second = {"question": "Q1", "choices": ["X", "Y"], "correct": [1], "type": "single"}

    toggle_flagged_card(first, str(flagged_path))
    toggle_flagged_card(first, str(flagged_path))  # remove
    toggle_flagged_card(second, str(flagged_path))  # add newer version

    flagged = load_flagged_cards(str(flagged_path))
    assert flagged == [second]


def test_merge_wrong_cards_deduplicates_by_question(tmp_path):
    f = tmp_path / "wrong_cards.json"
    t = tmp_path / "tainted.json"
    cards = [
        {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"},
        {"question": "Q1", "choices": ["A", "B"], "correct": [1], "type": "single"},
        {"question": "Q2", "choices": ["A"], "correct": [0], "type": "single"},
    ]

    merged = merge_wrong_cards(cards, str(f), str(t))

    assert [card["question"] for card in merged] == ["Q1", "Q2"]
    assert load_wrong_cards(str(f)) == merged
    assert load_tainted_questions(str(t)) == ["Q1", "Q2"]


def test_clear_wrong_cards_removes_matching_questions(tmp_path):
    f = tmp_path / "wrong_cards.json"
    t = tmp_path / "tainted.json"
    merge_wrong_cards([
        {"question": "Q1"},
        {"question": "Q2"},
    ], str(f), str(t))

    remaining = clear_wrong_cards([{"question": "Q1"}], str(f))

    assert remaining == [{"question": "Q2"}]
    assert tainted_question_set(str(t)) == {"Q1", "Q2"}


def test_clear_tainted_questions_removes_only_selected_questions(tmp_path):
    t = tmp_path / "tainted.json"
    save_tainted_questions(["Q1", "Q2", "Q3"], str(t))

    remaining = clear_tainted_questions([{"question": "Q2"}], str(t))

    assert remaining == {"Q1", "Q3"}
    assert tainted_question_set(str(t)) == {"Q1", "Q3"}


def test_sync_tainted_with_wrong_cards_imports_existing_wrong_questions(tmp_path):
    f = tmp_path / "wrong_cards.json"
    t = tmp_path / "tainted.json"

    merge_wrong_cards([{"question": "Q1"}], str(f), str(t))
    clear_wrong_cards([{"question": "Q1"}], str(f))
    merge_wrong_cards([{"question": "Q2"}], str(f), str(t))

    synced = sync_tainted_with_wrong_cards(str(f), str(t))

    assert synced == {"Q1", "Q2"}
    assert tainted_question_set(str(t)) == {"Q1", "Q2"}


def test_load_mastered_cards_missing_file_returns_empty():
    assert load_mastered_cards("missing_mastered_cards.json") == []


def test_update_mastered_cards_increments_streak_and_marks_mastered(tmp_path):
    f = tmp_path / "mastered_cards.json"
    card = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}

    first = update_mastered_cards([card], [], str(f))
    assert first == []
    assert load_mastered_cards(str(f)) == []
    assert load_mastery_progress(str(f)) == [{**card, "streak": 1, "mastered": False}]

    second = update_mastered_cards([card], [], str(f))
    assert second == [{**card, "streak": MASTERED_THRESHOLD, "mastered": True}]
    assert mastered_question_set(str(f)) == {"Q1"}


def test_update_mastered_cards_skips_tainted_questions(tmp_path):
    f = tmp_path / "mastered_cards.json"
    t = tmp_path / "tainted.json"
    card = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}

    save_tainted_questions(["Q1"], str(t))

    result = update_mastered_cards([card], [], str(f), tainted_path=str(t))

    assert result == []
    assert load_mastered_cards(str(f)) == []
    assert load_mastery_progress(str(f)) == []


def test_update_mastered_cards_resets_streak_when_question_is_wrong(tmp_path):
    f = tmp_path / "mastered_cards.json"
    card = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}

    update_mastered_cards([card], [], str(f))
    update_mastered_cards([card], [], str(f))
    result = update_mastered_cards([], [card], str(f))

    assert result == []
    assert mastered_question_set(str(f)) == set()
    assert load_mastery_progress(str(f)) == []


def test_clear_mastered_state_empties_mastered_and_progress_files(tmp_path):
    f = tmp_path / "mastered_cards.json"
    card = {"question": "Q1", "choices": ["A"], "correct": [0], "type": "single"}

    update_mastered_cards([card], [], str(f))
    clear_mastered_state(str(f))

    assert load_mastered_cards(str(f)) == []
    assert load_mastery_progress(str(f)) == []
