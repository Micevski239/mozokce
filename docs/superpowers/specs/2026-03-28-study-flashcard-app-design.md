# Study Flashcard App — Design Spec

**Date:** 2026-03-28

## Overview

A simple Python desktop flashcard app for self-study. The user provides questions and answers to Claude in chat; Claude populates a JSON file that the app reads and displays as flashcards one at a time.

## Goals

- Display flashcards one at a time (question → flip → answer)
- Navigate forward and backward through a deck
- Shuffle cards randomly or go in order
- Restart the deck at any time
- Claude manages all data entry by updating `cards.json`

## Out of Scope

- Progress tracking (no right/wrong scoring)
- In-app question entry form
- Multiple decks (single deck, single JSON file)
- Spaced repetition algorithm

## Stack

- **Language:** Python 3
- **UI:** CustomTkinter (modern-looking Tkinter wrapper)
- **Data:** `cards.json` — a flat JSON array of `{question, answer}` objects

## Data Format

```json
[
  {"question": "What is the powerhouse of the cell?", "answer": "The mitochondria"},
  {"question": "What is the capital of France?", "answer": "Paris"}
]
```

Claude updates this file whenever the user provides new questions in chat.

## Architecture

```
ucenje/
├── app.py          # Main application — window, UI, navigation logic
├── cards.json      # Question/answer data (managed by Claude)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-28-study-flashcard-app-design.md
```

### Components

**`app.py`**
- Loads `cards.json` on startup
- Manages state: current card index, flipped/unflipped, shuffle order
- Renders the CustomTkinter window with:
  - Progress bar + card counter (`Card X of N`)
  - Card widget — shows question or answer depending on flip state; click to flip
  - Prev / Next buttons
  - Flip Card button
  - Shuffle toggle button
  - Restart Deck button

**`cards.json`**
- Source of truth for all flashcard content
- Read once on startup; restart the app to pick up new cards after Claude updates the file

## UI Layout

```
┌─────────────────────────────────────────┐
│  Study Flashcards           Card 3 of 24│
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │          QUESTION               │   │
│  │                                 │   │
│  │   What is the powerhouse        │   │
│  │        of the cell?             │   │
│  │                                 │   │
│  │      click card to flip         │   │
│  └─────────────────────────────────┘   │
│                                         │
│    [← Prev]   [Flip Card]   [Next →]   │
│                                         │
│       [Shuffle: ON]  |  [Restart]       │
└─────────────────────────────────────────┘
```

Flipped state: card background turns green, label changes to "ANSWER", answer text shown.

## Behavior

| Action | Result |
|--------|--------|
| Click card or "Flip Card" | Toggles between question and answer |
| Next | Advances to next card (wraps at end), resets flip state |
| Prev | Goes to previous card, resets flip state |
| Shuffle ON | Randomizes card order for the session |
| Shuffle OFF | Restores original JSON order |
| Restart Deck | Returns to card 1, resets all flip states |

## Error Handling

- If `cards.json` is missing or empty, show a message: "No cards found. Ask Claude to add some questions!"
- If JSON is malformed, show: "Error reading cards.json — check the file format."
