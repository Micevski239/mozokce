# Base Card Prompt — Flashcard Generator

Copy this entire file into Claude.ai. Fill in the **[FILL IN]** section at the bottom, then send.

---

## Your Task

Generate a JSON array of flashcard objects for the subject specified below. Output ONLY the raw JSON array — no explanation, no markdown fences, no extra text. The output must be valid JSON that can be pasted directly into `cards.json`.

---

## Card Schema

Each card must follow this exact structure:

```json
{
  "question": "Question text in Macedonian",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correct": [0],
  "type": "single",
  "difficulty": "easy",
  "explanation": "Зошто: ... За испит: ..."
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | The question, in Macedonian |
| `choices` | array of 4 strings | Answer options |
| `correct` | array of ints | 0-based indices of correct answers |
| `type` | `"single"` or `"multiple"` | Use `"multiple"` only when more than one answer is correct |
| `difficulty` | `"easy"`, `"medium"`, or `"hard"` | Cognitive depth (see below) |
| `explanation` | string | Two-part explanation (see below) |

---

## Difficulty Levels

| Level | Cognitive Depth | Example Question Style |
|-------|----------------|----------------------|
| `"easy"` | Recall — define a term, name a thing, complete a fact | "Што е GUI?" / "Кој акроним означува...?" |
| `"medium"` | Understand — explain why, compare two concepts, identify a difference | "Која е разликата меѓу X и Y?" / "Зошто X е важно?" |
| `"hard"` | Apply / Analyze — calculate, identify a fault in a scenario, reason about edge cases | "За предикатот P = a ∧ b, наброј ги RACC тест случаите" / "Идентификувај го бугот во следниот код" |

---

## Choice Quality Rules — STRICT

These rules are mandatory. Violating any of them is a mistake.

### 1. Equal length
All 4 choices must be approximately the same length (±20% characters). The correct answer must NOT be the longest choice. If the correct answer is naturally longer, shorten it or extend the distractors.

**Bad:**
```
"choices": [
  "Да",
  "Не",
  "Зависи",
  "CACC бара предикатот да смени вредност кога major клаузулата се менува, додека RACC бара и неактивните клаузули да бидат исти"
]
```

**Good:**
```
"choices": [
  "Само предикатот мора да смени вредност при промена на major клаузулата",
  "Неактивните клаузули мора да бидат исти кога major е true и false",
  "Секоја клауза мора да биде активна барем еднаш во тест сетот",
  "Комбинаторното покривање бара 2ⁿ тест случаи за n клаузули"
]
```

### 2. Plausible distractors
Wrong choices must:
- Use the same vocabulary and domain as the correct answer
- Sound like they could plausibly be correct
- NOT be obviously absurd, unrelated, or trivially wrong

### 3. Randomized correct position
Do NOT put the correct answer in the same position across cards. Distribute correct answers across positions 0, 1, 2, and 3 throughout the batch.

---

## Explanation Format

Every explanation must follow this exact two-part format:

```
"Зошто: [Core reasoning — why this answer is correct, 1-2 sentences]\nЗа испит: [Exam tip — what to remember, how to distinguish from similar concepts, or a common trap]"
```

---

## Fill In Section

```
Subject name: [e.g. SKIT — Втор Колоквиум]
Source material:
[PASTE YOUR NOTES, PDF CONTENT, OR TOPIC LIST HERE]

Number of cards to generate: [e.g. 30]
Difficulty mix: [e.g. 40% easy, 40% medium, 20% hard]
```

---

Reminder: Output ONLY the raw JSON array. No markdown fences. No commentary. Start with `[` and end with `]`.
