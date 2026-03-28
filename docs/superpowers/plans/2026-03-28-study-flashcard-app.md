# Study Flashcard App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python desktop flashcard app that reads `cards.json` and lets the user flip, navigate, shuffle, and restart a deck of study cards.

**Architecture:** Logic lives in `deck.py` (pure Python, fully testable). The UI lives in `app.py` (CustomTkinter) and delegates all state to `DeckState`. `cards.json` is a flat JSON array managed externally by Claude.

**Tech Stack:** Python 3, CustomTkinter, pytest, json (stdlib), random (stdlib)

---

## File Map

| File | Purpose |
|------|---------|
| `requirements.txt` | `customtkinter` and `pytest` dependencies |
| `cards.json` | Starter deck with 2 sample cards |
| `deck.py` | `load_cards()` function + `DeckState` class |
| `app.py` | CustomTkinter window — builds UI, delegates state to `DeckState` |
| `tests/test_deck.py` | All tests for `deck.py` logic |

---

## Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `cards.json`

- [ ] **Step 1: Create `requirements.txt`**

```
customtkinter==5.2.2
pytest==8.1.1
```

- [ ] **Step 2: Create starter `cards.json`**

```json
[
  {"question": "What is the powerhouse of the cell?", "answer": "The mitochondria"},
  {"question": "What is the capital of France?", "answer": "Paris"}
]
```

- [ ] **Step 3: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: both packages install without errors.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt cards.json
git commit -m "chore: add dependencies and starter deck"
```

---

## Task 2: Card Loading Logic (TDD)

**Files:**
- Create: `deck.py`
- Create: `tests/test_deck.py`

- [ ] **Step 1: Create `tests/` package**

```bash
mkdir tests && touch tests/__init__.py
```

- [ ] **Step 2: Write failing tests for `load_cards`**

Create `tests/test_deck.py`:

```python
import json
import pytest
from deck import load_cards


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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_deck.py -v
```

Expected: `ModuleNotFoundError: No module named 'deck'`

- [ ] **Step 4: Implement `load_cards` in `deck.py`**

Create `deck.py`:

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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_deck.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add deck.py tests/__init__.py tests/test_deck.py
git commit -m "feat: add load_cards with error handling"
```

---

## Task 3: DeckState Logic (TDD)

**Files:**
- Modify: `deck.py` — add `DeckState` class
- Modify: `tests/test_deck.py` — add `DeckState` tests

- [ ] **Step 1: Write failing tests for `DeckState`**

Append to `tests/test_deck.py`:

```python
from deck import DeckState

SAMPLE_CARDS = [
    {"question": "Q1", "answer": "A1"},
    {"question": "Q2", "answer": "A2"},
    {"question": "Q3", "answer": "A3"},
]


def test_deck_initial_state():
    deck = DeckState(SAMPLE_CARDS)
    assert deck.total == 3
    assert deck.current_position == 1
    assert deck.flipped is False
    assert deck.current_card() == {"question": "Q1", "answer": "A1"}


def test_deck_next_advances_index():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    assert deck.current_position == 2
    assert deck.current_card() == {"question": "Q2", "answer": "A2"}


def test_deck_next_wraps_at_end():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    deck.next()
    deck.next()  # should wrap to 0
    assert deck.current_position == 1


def test_deck_prev_goes_back():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    deck.prev()
    assert deck.current_position == 1


def test_deck_prev_wraps_at_start():
    deck = DeckState(SAMPLE_CARDS)
    deck.prev()  # should wrap to last
    assert deck.current_position == 3


def test_deck_next_resets_flip():
    deck = DeckState(SAMPLE_CARDS)
    deck.flip()
    assert deck.flipped is True
    deck.next()
    assert deck.flipped is False


def test_deck_prev_resets_flip():
    deck = DeckState(SAMPLE_CARDS)
    deck.flip()
    deck.prev()
    assert deck.flipped is False


def test_deck_flip_toggles():
    deck = DeckState(SAMPLE_CARDS)
    deck.flip()
    assert deck.flipped is True
    deck.flip()
    assert deck.flipped is False


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
    assert deck.current_card() == {"question": "Q1", "answer": "A1"}
    deck.next()
    assert deck.current_card() == {"question": "Q2", "answer": "A2"}


def test_deck_restart_resets_to_first():
    deck = DeckState(SAMPLE_CARDS)
    deck.next()
    deck.next()
    deck.flip()
    deck.restart()
    assert deck.current_position == 1
    assert deck.flipped is False


def test_deck_empty_returns_none():
    deck = DeckState([])
    assert deck.total == 0
    assert deck.current_card() is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_deck.py -v -k "DeckState or deck_"
```

Expected: `ImportError: cannot import name 'DeckState' from 'deck'`

- [ ] **Step 3: Implement `DeckState` in `deck.py`**

Append to `deck.py` (after `load_cards`):

```python
class DeckState:
    def __init__(self, cards):
        self.original = list(cards)
        self.order = list(range(len(cards)))
        self.index = 0
        self.flipped = False
        self._shuffle_on = False

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
        self.flipped = False

    def prev(self):
        self.index = (self.index - 1) % self.total
        self.flipped = False

    def flip(self):
        self.flipped = not self.flipped

    def shuffle(self, enabled):
        self._shuffle_on = enabled
        self.order = list(range(self.total))
        if enabled:
            random.shuffle(self.order)
        self.index = 0
        self.flipped = False

    def restart(self):
        self.index = 0
        self.flipped = False
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
pytest tests/test_deck.py -v
```

Expected: all 16 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add deck.py tests/test_deck.py
git commit -m "feat: add DeckState with navigation, flip, shuffle, restart"
```

---

## Task 4: CustomTkinter UI

**Files:**
- Create: `app.py`

- [ ] **Step 1: Create `app.py`**

```python
import customtkinter as ctk
from deck import load_cards, DeckState

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

CARD_BG_QUESTION = "#1f1f1f"
CARD_BG_ANSWER = "#052e16"
CARD_FG_QUESTION = "gray"
CARD_FG_ANSWER = "#4ade80"


class FlashcardApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Study Flashcards")
        self.geometry("520x440")
        self.resizable(False, False)

        cards, error = load_cards("cards.json")
        self.deck = DeckState(cards)
        self._error = error

        self._build_ui()
        self._update_ui()

    def _build_ui(self):
        # Header row
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(15, 4))
        ctk.CTkLabel(header, text="Study Flashcards", font=ctk.CTkFont(size=14, weight="bold")).pack(side="left")
        self.counter_label = ctk.CTkLabel(header, text="", font=ctk.CTkFont(size=12))
        self.counter_label.pack(side="right")

        # Progress bar
        self.progress = ctk.CTkProgressBar(self)
        self.progress.pack(fill="x", padx=20, pady=(0, 10))
        self.progress.set(0)

        # Card (clickable frame)
        self.card_frame = ctk.CTkFrame(self, height=190, cursor="hand2", corner_radius=12)
        self.card_frame.pack(fill="x", padx=20, pady=4)
        self.card_frame.pack_propagate(False)

        self.card_type_label = ctk.CTkLabel(
            self.card_frame, text="QUESTION",
            font=ctk.CTkFont(size=10), text_color="gray"
        )
        self.card_type_label.pack(pady=(16, 4))

        self.card_text_label = ctk.CTkLabel(
            self.card_frame, text="",
            font=ctk.CTkFont(size=17), wraplength=440
        )
        self.card_text_label.pack(expand=True)

        self.card_hint_label = ctk.CTkLabel(
            self.card_frame, text="click card to flip",
            font=ctk.CTkFont(size=10), text_color="gray"
        )
        self.card_hint_label.pack(pady=(4, 16))

        # Bind click-to-flip on all card children
        for widget in (self.card_frame, self.card_type_label, self.card_text_label, self.card_hint_label):
            widget.bind("<Button-1>", lambda e: self._flip())

        # Nav buttons
        nav = ctk.CTkFrame(self, fg_color="transparent")
        nav.pack(pady=10)
        ctk.CTkButton(nav, text="← Prev", width=95, command=self._prev).pack(side="left", padx=5)
        ctk.CTkButton(nav, text="Flip Card", width=115, command=self._flip).pack(side="left", padx=5)
        ctk.CTkButton(nav, text="Next →", width=95, command=self._next).pack(side="left", padx=5)

        # Bottom controls
        bottom = ctk.CTkFrame(self, fg_color="transparent")
        bottom.pack(pady=4)
        self.shuffle_btn = ctk.CTkButton(
            bottom, text="Shuffle: OFF", width=115,
            fg_color="#374151", hover_color="#4b5563",
            command=self._toggle_shuffle
        )
        self.shuffle_btn.pack(side="left", padx=5)
        ctk.CTkButton(
            bottom, text="Restart Deck", width=115,
            fg_color="#374151", hover_color="#4b5563",
            command=self._restart
        ).pack(side="left", padx=5)

    def _update_ui(self):
        if self._error:
            self.card_frame.configure(fg_color="#3b0a0a")
            self.card_type_label.configure(text="ERROR", text_color="#f87171")
            self.card_text_label.configure(text=self._error)
            self.card_hint_label.configure(text="")
            self.counter_label.configure(text="")
            self.progress.set(0)
            return

        if not self.deck.total:
            self.card_frame.configure(fg_color=CARD_BG_QUESTION)
            self.card_type_label.configure(text="")
            self.card_text_label.configure(
                text="No cards found.\nAsk Claude to add some questions!"
            )
            self.card_hint_label.configure(text="")
            self.counter_label.configure(text="")
            self.progress.set(0)
            return

        card = self.deck.current_card()
        self.counter_label.configure(
            text=f"Card {self.deck.current_position} of {self.deck.total}"
        )
        self.progress.set(self.deck.current_position / self.deck.total)

        if self.deck.flipped:
            self.card_frame.configure(fg_color=CARD_BG_ANSWER)
            self.card_type_label.configure(text="ANSWER", text_color=CARD_FG_ANSWER)
            self.card_text_label.configure(text=card["answer"])
            self.card_hint_label.configure(text="click card to flip back")
        else:
            self.card_frame.configure(fg_color=CARD_BG_QUESTION)
            self.card_type_label.configure(text="QUESTION", text_color=CARD_FG_QUESTION)
            self.card_text_label.configure(text=card["question"])
            self.card_hint_label.configure(text="click card to flip")

    def _flip(self):
        if self.deck.total:
            self.deck.flip()
            self._update_ui()

    def _next(self):
        if self.deck.total:
            self.deck.next()
            self._update_ui()

    def _prev(self):
        if self.deck.total:
            self.deck.prev()
            self._update_ui()

    def _toggle_shuffle(self):
        new_state = not self.deck._shuffle_on
        self.deck.shuffle(new_state)
        self.shuffle_btn.configure(text=f"Shuffle: {'ON' if new_state else 'OFF'}")
        self._update_ui()

    def _restart(self):
        if self.deck.total:
            self.deck.restart()
            self._update_ui()


if __name__ == "__main__":
    app = FlashcardApp()
    app.mainloop()
```

- [ ] **Step 2: Run the app to verify it works**

```bash
python app.py
```

Expected: window opens showing the first card from `cards.json`. Verify:
- Card shows "What is the powerhouse of the cell?"
- Counter shows "Card 1 of 2"
- Progress bar is at 50%
- Click card → turns green, shows "The mitochondria"
- Next → advances to card 2, flip resets
- Prev → wraps back to card 2 from card 1
- Shuffle ON → randomizes order
- Restart → back to card 1

- [ ] **Step 3: Run full test suite to confirm nothing broke**

```bash
pytest tests/ -v
```

Expected: all 16 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add CustomTkinter UI for flashcard app"
```

---

## Task 5: Smoke Test — Empty and Error States

**Files:**
- No new files — manual verification steps only

- [ ] **Step 1: Test missing `cards.json`**

```bash
mv cards.json cards.json.bak && python app.py
```

Expected: app opens, card area shows "No cards found. Ask Claude to add some questions!"

```bash
mv cards.json.bak cards.json
```

- [ ] **Step 2: Test malformed `cards.json`**

```bash
echo "{ bad json" > cards.json && python app.py
```

Expected: app opens, card area shows "Error reading cards.json — check the file format." with red background.

```bash
git checkout cards.json
```

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: verify empty and error states work correctly"
```
