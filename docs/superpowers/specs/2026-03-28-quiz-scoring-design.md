# Quiz Mode + Session Scoring — Design Spec

**Date:** 2026-03-28

## Overview

Replace the flip-card UI with a multiple choice quiz interface. Questions have A/B/C/D answer choices (single or multiple correct). The system auto-judges each answer, shows instant feedback, and saves a session result (score %, correct count, missed questions) to `sessions.json` at the end of each session.

## Goals

- Show questions with A/B/C/D clickable choice buttons
- Support single-choice and multiple-choice questions
- Auto-judge: highlight correct answer green, wrong answer red
- Track score across all cards in a session
- Show end-of-session summary screen (score %, missed list)
- Save each session to `sessions.json`
- "Retry Missed" restarts the session with only the missed cards
- "New Session" restarts with all cards

## Out of Scope

- Viewing full session history inside the app
- Per-card statistics across sessions
- Editing questions inside the app

## Stack

- Same as existing app: Python 3, CustomTkinter, json (stdlib)
- New file: `sessions.py` for saving session results

## Data Formats

### `cards.json` (updated format)

```json
[
  {
    "question": "What is the powerhouse of the cell?",
    "choices": ["The nucleus", "The mitochondria", "The ribosome", "The cell wall"],
    "correct": [1],
    "type": "single"
  },
  {
    "question": "Which of these are primary colors?",
    "choices": ["Red", "Green", "Blue", "Yellow"],
    "correct": [0, 2],
    "type": "multiple"
  }
]
```

- `correct` is a list of zero-based indices into `choices`
- `type` is `"single"` or `"multiple"`

### `sessions.json` (append-only log)

```json
[
  {
    "date": "2026-03-28T14:30:00",
    "score_pct": 75,
    "correct": 15,
    "total": 20,
    "missed": ["What is the powerhouse of the cell?", "Which year did WWII end?"]
  }
]
```

## Architecture

```
ucenje/
├── app.py          # UI — quiz screen + summary screen
├── deck.py         # DeckState (updated: score tracking)
├── sessions.py     # save_session() — appends to sessions.json
├── cards.json      # Updated format with choices + correct
├── sessions.json   # Created automatically on first session end
└── tests/
    ├── test_deck.py     # Updated tests for scoring methods
    └── test_sessions.py # Tests for save_session()
```

### `deck.py` changes

Add scoring methods to `DeckState`:

- `mark(correct: bool)` — records whether current card was answered correctly
- `session_score() -> tuple[int, int]` — returns `(correct_count, total_answered)`
- `missed_cards() -> list[dict]` — returns cards that were answered incorrectly

### `sessions.py` (new)

Single function:

```python
def save_session(score_pct, correct, total, missed_questions, path="sessions.json"):
```

Loads existing `sessions.json` (or starts empty list), appends new entry, writes back.

### `app.py` changes

Replace flip-card UI with two screens managed by the same window:

**Quiz screen** (replaces current card UI):
- Question text area
- A/B/C/D choice buttons (vertical stack)
- For `type="multiple"`: buttons toggle selected state + "Submit" button appears
- For `type="single"`: clicking a choice immediately triggers judgment
- After judgment: correct choice turns green, wrong choice turns red, others fade; "Next →" button appears
- Progress bar + counter unchanged

**Summary screen** (shown when last card is answered):
- Large score percentage
- "X correct out of N" subtitle
- Scrollable list of missed questions (just the question text)
- "Retry Missed" button — reloads deck with only missed cards, starts new session
- "New Session" button — reloads all cards, starts new session

## UI Behavior

| Action | Result |
|--------|--------|
| Click choice (single) | Immediate judgment, choices lock, Next → appears |
| Click choice (multiple) | Toggles selection highlight |
| Click Submit (multiple) | Judgment, choices lock, Next → appears |
| Click Next → (last card) | Shows summary screen, saves session |
| Click Next → (not last) | Advances to next card |
| Click Retry Missed | Restart with missed cards only |
| Click New Session | Restart with all cards |

## Judgment Logic

- **Single:** Selected index is in `card["correct"]` → correct, else wrong
- **Multiple:** Selected indices exactly match `card["correct"]` (order-independent) → correct, else wrong
- After judgment: correct indices highlighted green, selected-but-wrong highlighted red, unselected-and-unchosen faded

## Error Handling

- If `cards.json` missing/empty/malformed: same existing error messages, no quiz shown
- If `sessions.json` write fails: session still completes, error logged to stderr (no crash)
- `type` field defaults to `"single"` if missing from a card entry
