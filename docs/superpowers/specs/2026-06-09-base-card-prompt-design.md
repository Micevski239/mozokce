# Base Card Prompt + Choice Shuffle — Design Spec

**Date:** 2026-06-09  
**Status:** Approved

---

## Goal

Two deliverables:
1. A reusable `base_card_prompt.md` at the repo root — a markdown file pasted into Claude.ai to generate `cards.json` for any new subject.
2. A code change in `deck.py` that shuffles choice order per session, keeping `correct` indices in sync.

---

## Part 1 — `base_card_prompt.md`

### Card Schema (with new `difficulty` field)

```json
{
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "correct": [0],
  "type": "single|multiple",
  "difficulty": "easy|medium|hard",
  "explanation": "Зошто: ... За испит: ..."
}
```

The `difficulty` field is metadata only — no app behavior change at this stage.

### Difficulty Definitions

| Level | Cognitive Depth | Example |
|-------|----------------|---------|
| `easy` | Recall a fact — define a term, name a thing | "What does GUI stand for?" |
| `medium` | Understand a concept — explain why, compare two things | "What is the difference between CACC and RACC?" |
| `hard` | Apply or analyze — calculate, identify a fault in a scenario, reason about edge cases | "Given predicate P = a ∧ b, list all RACC test cases" |

### Choice Quality Rules (hard constraints for Claude)

1. **Equal length** — all 4 choices must be approximately the same length. The correct answer must NOT be the longest choice.
2. **Plausible distractors** — wrong choices must be in the same domain, use the same vocabulary, and look like they could be correct. No obviously wrong filler.
3. **Randomized correct position** — the correct answer must not consistently appear in the same position. Distribute it across all positions across a batch of cards.

### Fill-in Section (customized per subject)

```
Subject: [NAME]
Language: Macedonian
Source material: [PASTE HERE]
Generate: [N] cards
Difficulty mix: [e.g. 40% easy, 40% medium, 20% hard]
```

---

## Part 2 — Choice Shuffle in `deck.py`

### Where

`DeckState.__init__` (or wherever cards are loaded into a session). Shuffle happens once per session initialization.

### How

For each card, shuffle the `choices` list using `random.shuffle`, then recompute the `correct` index list to reflect new positions.

```python
import random

def _shuffle_choices(card):
    indices = list(range(len(card["choices"])))
    random.shuffle(indices)
    card["choices"] = [card["choices"][i] for i in indices]
    reverse = {old: new for new, old in enumerate(indices)}
    card["correct"] = [reverse[c] for c in card["correct"]]
    return card
```

This function is pure (no side effects beyond the card dict) and works for both `single` and `multiple` card types.

### When

Applied at session load, not persisted — `cards.json` always keeps the original order. Each new session re-shuffles independently.

---

## Files Changed

| File | Change |
|------|--------|
| `base_card_prompt.md` | New file at repo root |
| `deck.py` | Add `_shuffle_choices`, call it during session card loading |
| `cards.json` (any subject) | Add `difficulty` field to each card (optional migration) |

---

## Out of Scope

- App UI for difficulty filtering (metadata only for now)
- Automatic card migration script for existing subjects
- Per-subject prompt files (one base prompt handles all subjects)
