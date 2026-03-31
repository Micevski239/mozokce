# Quiz Mode + Session Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flip-card UI with a multiple choice quiz, auto-judge answers, show a session summary, and save results to `sessions.json`.

**Architecture:** `deck.py` gains scoring methods (`mark`, `session_score`, `missed_cards`) and loses flip. `sessions.py` (new) handles writing to `sessions.json`. `app.py` is rewritten with two screens: quiz screen and summary screen. `cards.json` adopts the new format with choices and correct indices.

**Tech Stack:** Python 3, CustomTkinter, json (stdlib), datetime (stdlib), pytest

---

## File Map

| File | Change |
|------|--------|
| `deck.py` | Remove `flipped`/`flip()`, add `mark()`, `session_score()`, `missed_cards()` |
| `sessions.py` | New — `save_session()` appends to `sessions.json` |
| `cards.json` | Update to new format with `choices`, `correct`, `type` |
| `app.py` | Full rewrite — quiz screen + summary screen |
| `tests/test_deck.py` | Update — remove flip tests, add scoring tests |
| `tests/test_sessions.py` | New — tests for `save_session()` |

---

## Task 1: Update DeckState — Remove Flip, Add Scoring (TDD)

**Files:**
- Modify: `deck.py`
- Modify: `tests/test_deck.py`

- [ ] **Step 1: Write failing tests for scoring methods**

Replace the contents of `tests/test_deck.py` with:

```python
import json
import pytest
from deck import load_cards, DeckState


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
```

- [ ] **Step 2: Run tests to verify new scoring tests fail**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -m pytest tests/test_deck.py -v
```

Expected: 4 load_cards tests PASS, navigation tests PASS, scoring tests FAIL with `AttributeError: 'DeckState' object has no attribute 'mark'`

- [ ] **Step 3: Rewrite `deck.py`**

Replace the entire contents of `deck.py` with:

```python
import json
import random


def load_cards(path="cards.json"):
    try:
        with open(path, "r") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return ([], "Error reading cards.json — check the file format.")
        return (data, None)
    except FileNotFoundError:
        return ([], None)
    except json.JSONDecodeError:
        return ([], "Error reading cards.json — check the file format.")


class DeckState:
    def __init__(self, cards):
        self.original = list(cards)
        self.order = list(range(len(cards)))
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
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -m pytest tests/test_deck.py -v
```

Expected: all 21 tests PASS.

---

## Task 2: Create `sessions.py` (TDD)

**Files:**
- Create: `sessions.py`
- Create: `tests/test_sessions.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_sessions.py`:

```python
import json
import pytest
from sessions import save_session


def test_save_session_creates_file(tmp_path):
    path = str(tmp_path / "sessions.json")
    save_session(80, 8, 10, ["Q1", "Q2"], path=path)
    with open(path) as f:
        data = json.load(f)
    assert len(data) == 1
    assert data[0]["score_pct"] == 80
    assert data[0]["correct"] == 8
    assert data[0]["total"] == 10
    assert data[0]["missed"] == ["Q1", "Q2"]
    assert "date" in data[0]


def test_save_session_appends_to_existing(tmp_path):
    path = str(tmp_path / "sessions.json")
    save_session(80, 8, 10, [], path=path)
    save_session(60, 6, 10, ["Q3"], path=path)
    with open(path) as f:
        data = json.load(f)
    assert len(data) == 2
    assert data[1]["score_pct"] == 60


def test_save_session_handles_corrupt_file(tmp_path):
    path = str(tmp_path / "sessions.json")
    with open(path, "w") as f:
        f.write("not json")
    save_session(50, 5, 10, [], path=path)
    with open(path) as f:
        data = json.load(f)
    assert len(data) == 1


def test_save_session_score_pct_zero(tmp_path):
    path = str(tmp_path / "sessions.json")
    save_session(0, 0, 5, ["Q1", "Q2", "Q3", "Q4", "Q5"], path=path)
    with open(path) as f:
        data = json.load(f)
    assert data[0]["score_pct"] == 0
    assert len(data[0]["missed"]) == 5
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -m pytest tests/test_sessions.py -v
```

Expected: `ModuleNotFoundError: No module named 'sessions'`

- [ ] **Step 3: Create `sessions.py`**

```python
import json
from datetime import datetime


def save_session(score_pct, correct, total, missed_questions, path="sessions.json"):
    try:
        with open(path, "r") as f:
            sessions = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        sessions = []

    sessions.append({
        "date": datetime.now().isoformat(timespec="seconds"),
        "score_pct": score_pct,
        "correct": correct,
        "total": total,
        "missed": missed_questions,
    })

    with open(path, "w") as f:
        json.dump(sessions, f, indent=2)
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -m pytest tests/ -v
```

Expected: all 25 tests PASS.

---

## Task 3: Update `cards.json`

**Files:**
- Modify: `cards.json`

- [ ] **Step 1: Replace `cards.json` with new format**

Replace the entire contents of `/Users/filipmicevski/Desktop/ucenje/cards.json` with:

```json
[
  {
    "question": "What is the powerhouse of the cell?",
    "choices": ["The nucleus", "The mitochondria", "The ribosome", "The cell wall"],
    "correct": [1],
    "type": "single"
  },
  {
    "question": "What is the capital of France?",
    "choices": ["London", "Berlin", "Paris", "Madrid"],
    "correct": [2],
    "type": "single"
  }
]
```

- [ ] **Step 2: Verify it loads cleanly**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -c "
from deck import load_cards
cards, err = load_cards('cards.json')
print('cards loaded:', len(cards))
print('error:', err)
assert len(cards) == 2
assert err is None
print('PASS')
"
```

Expected: `cards loaded: 2`, `error: None`, `PASS`

---

## Task 4: Rewrite `app.py` — Quiz UI + Summary Screen

**Files:**
- Modify: `app.py`

- [ ] **Step 1: Replace entire `app.py`**

Replace the entire contents of `/Users/filipmicevski/Desktop/ucenje/app.py` with:

```python
import sys
import customtkinter as ctk
from deck import load_cards, DeckState
from sessions import save_session

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

LETTERS = ["A", "B", "C", "D"]
CLR_DEFAULT = "#1e293b"
CLR_SELECTED = "#1e3a5f"
CLR_CORRECT = "#052e16"
CLR_WRONG = "#3b0a0a"
CLR_FADED = "#0f172a"
TXT_CORRECT = "#4ade80"
TXT_WRONG = "#f87171"
TXT_FADED = "#475569"
TXT_DEFAULT = "#e2e8f0"


class FlashcardApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Study Flashcards")
        self.geometry("680x600")
        self.resizable(False, False)

        cards, error = load_cards("cards.json")
        self.deck = DeckState(cards)
        self._error = error
        self._selected = set()
        self._answered = False
        self._missed_cards = []

        self._build_quiz_ui()
        self._build_summary_ui()
        self._show_quiz()

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_quiz_ui(self):
        self.quiz_frame = ctk.CTkFrame(self, fg_color="transparent")

        header = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(15, 4))
        ctk.CTkLabel(header, text="Study Flashcards",
                     font=ctk.CTkFont(size=14, weight="bold")).pack(side="left")
        self.counter_label = ctk.CTkLabel(header, text="",
                                          font=ctk.CTkFont(size=12))
        self.counter_label.pack(side="right")

        self.progress = ctk.CTkProgressBar(self.quiz_frame)
        self.progress.pack(fill="x", padx=20, pady=(0, 10))
        self.progress.set(0)

        self.question_frame = ctk.CTkFrame(self.quiz_frame, corner_radius=10)
        self.question_frame.pack(fill="x", padx=20, pady=(0, 10))
        self.question_label = ctk.CTkLabel(
            self.question_frame, text="",
            font=ctk.CTkFont(size=16), wraplength=580, justify="center"
        )
        self.question_label.pack(padx=20, pady=20)

        self.choices_frame = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        self.choices_frame.pack(fill="x", padx=20)
        self.choice_btns = []
        for i in range(4):
            btn = ctk.CTkButton(
                self.choices_frame, text="", anchor="w", height=44,
                fg_color=CLR_DEFAULT, hover_color="#334155",
                text_color=TXT_DEFAULT,
                command=lambda idx=i: self._select_choice(idx)
            )
            btn.pack(fill="x", pady=3)
            self.choice_btns.append(btn)

        self.action_frame = ctk.CTkFrame(self.quiz_frame, fg_color="transparent")
        self.action_frame.pack(pady=(8, 0))
        self.submit_btn = ctk.CTkButton(self.action_frame, text="Submit",
                                        width=130, command=self._submit)
        self.next_btn = ctk.CTkButton(self.action_frame, text="Next →",
                                      width=130, command=self._next_card)

        self.hint_label = ctk.CTkLabel(self.quiz_frame, text="",
                                       font=ctk.CTkFont(size=10),
                                       text_color="gray")
        self.hint_label.pack(pady=(6, 0))

    def _build_summary_ui(self):
        self.summary_frame = ctk.CTkFrame(self, fg_color="transparent")

        ctk.CTkLabel(self.summary_frame, text="Session Complete",
                     font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(40, 4))
        ctk.CTkLabel(self.summary_frame, text="Saved to sessions.json",
                     font=ctk.CTkFont(size=11), text_color="gray").pack()

        self.score_label = ctk.CTkLabel(self.summary_frame, text="0%",
                                        font=ctk.CTkFont(size=52, weight="bold"),
                                        text_color="#7dd3fc")
        self.score_label.pack(pady=(24, 4))
        self.score_sub_label = ctk.CTkLabel(self.summary_frame, text="",
                                            font=ctk.CTkFont(size=13),
                                            text_color="#94a3b8")
        self.score_sub_label.pack()

        self.missed_header = ctk.CTkLabel(self.summary_frame, text="",
                                          font=ctk.CTkFont(size=10),
                                          text_color="#f87171")
        self.missed_header.pack(pady=(20, 6))
        self.missed_scroll = ctk.CTkScrollableFrame(self.summary_frame, height=130)
        self.missed_scroll.pack(fill="x", padx=50)

        btn_row = ctk.CTkFrame(self.summary_frame, fg_color="transparent")
        btn_row.pack(pady=24)
        ctk.CTkButton(btn_row, text="Retry Missed", width=140,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._retry_missed).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="New Session", width=140,
                      command=self._new_session).pack(side="left", padx=8)

    # ── Screen switching ──────────────────────────────────────────────────────

    def _show_quiz(self):
        self.summary_frame.pack_forget()
        self.quiz_frame.pack(fill="both", expand=True)
        self._update_quiz_ui()

    def _show_summary(self):
        self.quiz_frame.pack_forget()

        correct, total = self.deck.session_score()
        score_pct = round(correct / total * 100) if total else 0
        self._missed_cards = self.deck.missed_cards()
        missed_questions = [c["question"] for c in self._missed_cards]

        try:
            save_session(score_pct, correct, total, missed_questions)
        except Exception as e:
            print(f"Warning: could not save session: {e}", file=sys.stderr)

        self.score_label.configure(text=f"{score_pct}%")
        self.score_sub_label.configure(text=f"{correct} correct out of {total}")

        for w in self.missed_scroll.winfo_children():
            w.destroy()

        if missed_questions:
            self.missed_header.configure(text=f"MISSED ({len(missed_questions)})")
            for q in missed_questions:
                ctk.CTkLabel(self.missed_scroll, text=q, wraplength=500,
                             justify="left", anchor="w").pack(fill="x", pady=2)
        else:
            self.missed_header.configure(text="")
            ctk.CTkLabel(self.missed_scroll, text="Perfect score!",
                         text_color="#4ade80").pack()

        self.summary_frame.pack(fill="both", expand=True)

    # ── Quiz logic ────────────────────────────────────────────────────────────

    def _update_quiz_ui(self):
        self._answered = False
        self._selected = set()

        for w in self.action_frame.winfo_children():
            w.pack_forget()

        if self._error:
            self.question_label.configure(text=self._error)
            for btn in self.choice_btns:
                btn.pack_forget()
            self.hint_label.configure(text="")
            return

        if not self.deck.total:
            self.question_label.configure(
                text="No cards found.\nAsk Claude to add some questions!")
            for btn in self.choice_btns:
                btn.pack_forget()
            self.hint_label.configure(text="")
            return

        card = self.deck.current_card()
        self.counter_label.configure(
            text=f"Card {self.deck.current_position} of {self.deck.total}")
        self.progress.set(self.deck.current_position / self.deck.total)
        self.question_label.configure(text=card["question"])

        choices = card.get("choices", [])
        card_type = card.get("type", "single")

        for i, btn in enumerate(self.choice_btns):
            if i < len(choices):
                btn.configure(
                    text=f"  {LETTERS[i]}   {choices[i]}",
                    fg_color=CLR_DEFAULT, text_color=TXT_DEFAULT,
                    state="normal"
                )
                btn.pack(fill="x", pady=3)
            else:
                btn.pack_forget()

        hint = ("single choice — click an answer" if card_type == "single"
                else "multiple choice — select all that apply, then Submit")
        self.hint_label.configure(text=hint)

    def _select_choice(self, idx):
        if self._answered:
            return
        card = self.deck.current_card()
        card_type = card.get("type", "single")

        if card_type == "single":
            self._selected = {idx}
            self._judge()
        else:
            if idx in self._selected:
                self._selected.discard(idx)
                self.choice_btns[idx].configure(fg_color=CLR_DEFAULT)
            else:
                self._selected.add(idx)
                self.choice_btns[idx].configure(fg_color=CLR_SELECTED)

            for w in self.action_frame.winfo_children():
                w.pack_forget()
            if self._selected:
                self.submit_btn.pack()

    def _submit(self):
        if not self._answered and self._selected:
            self._judge()

    def _judge(self):
        self._answered = True
        card = self.deck.current_card()
        correct_set = set(card.get("correct", []))
        is_correct = self._selected == correct_set

        self.deck.mark(is_correct)

        choices = card.get("choices", [])
        for i, btn in enumerate(self.choice_btns):
            if i >= len(choices):
                continue
            if i in correct_set:
                btn.configure(fg_color=CLR_CORRECT, text_color=TXT_CORRECT,
                              state="disabled")
            elif i in self._selected:
                btn.configure(fg_color=CLR_WRONG, text_color=TXT_WRONG,
                              state="disabled")
            else:
                btn.configure(fg_color=CLR_FADED, text_color=TXT_FADED,
                              state="disabled")

        for w in self.action_frame.winfo_children():
            w.pack_forget()
        self.next_btn.pack()
        self.hint_label.configure(text="")

    def _next_card(self):
        if self.deck.current_position == self.deck.total:
            self._show_summary()
        else:
            self.deck.next()
            self._update_quiz_ui()

    def _retry_missed(self):
        if self._missed_cards:
            self.deck = DeckState(self._missed_cards)
            self._error = None
        else:
            cards, error = load_cards("cards.json")
            self.deck = DeckState(cards)
            self._error = error
        self._show_quiz()

    def _new_session(self):
        cards, error = load_cards("cards.json")
        self.deck = DeckState(cards)
        self._error = error
        self._show_quiz()


if __name__ == "__main__":
    app = FlashcardApp()
    app.mainloop()
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python -m pytest tests/ -v
```

Expected: all 25 tests PASS.

- [ ] **Step 3: Smoke test the app**

```bash
cd /Users/filipmicevski/Desktop/ucenje && source venv/bin/activate && python3 app.py
```

Verify manually:
- Quiz screen shows question + A/B/C/D buttons
- Clicking a wrong answer → your pick turns red, correct turns green, others fade, Next → appears
- Clicking the correct answer → it turns green, Next → appears
- After last card → summary screen appears with score % and missed list
- `sessions.json` is created in the project directory
- "Retry Missed" restarts with only missed cards
- "New Session" restarts with all cards
