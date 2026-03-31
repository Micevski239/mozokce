# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Macedonian-language study flashcard desktop app built with Python and CustomTkinter. Supports multiple-choice quizzes (single and multi-select), session tracking with score history, wrong-card review decks, and streak-based mastery hiding.

## Commands

```bash
# Activate virtual environment (required before running anything)
source venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run a single test file
python -m pytest tests/test_deck.py -v

# Run a single test by name
python -m pytest tests/test_deck.py -k "test_name" -v

# Launch the app
python app.py
```

## Architecture

Three-layer separation:

- **deck.py** — Pure card/deck logic (no UI). `DeckState` tracks card order, current position, and per-card correct/wrong marks. Also has card loading, explanation formatting, and choice formatting functions.
- **sessions.py** — Persistence layer for sessions, wrong cards, and mastered cards. All file I/O lives here. Sessions are append-only. Wrong cards deduplicate by question text. Mastery uses streak counting (threshold=2).
- **app.py** — CustomTkinter GUI (`FlashcardApp` class). Three screens: quiz, summary, sessions history. Owns all UI state; delegates logic to `DeckState` and sessions functions.

## Data Files

- `cards.json` — Source deck. Array of `{question, choices, correct (0-based indices), type ("single"/"multiple"), explanation}`.
- `sessions.json` — Append-only session log (created at runtime).
- `wrong_cards.json` — Accumulated incorrectly-answered cards (created at runtime).
- `mastered_cards.json` — Cards with streak >= 2, hidden from main deck (created at runtime).

## Key Patterns

- All card content and UI text is in Macedonian.
- `correct` field uses 0-based index arrays — even single-answer cards use an array (e.g., `[2]`).
- Explanations follow a two-part format: "Зошто:" (reasoning) + "За испит:" (exam note).
- Deck modes: `"main"`, `"missed"` (retry from last session), `"wrong_set"` (accumulated wrong answers).
- Tests use `tmp_path` fixtures for file isolation — no test touches real data files.
