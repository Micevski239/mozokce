"""
Fixes the correct-answer-is-longest bias in cards.json by using Ollama
to rewrite choices so lengths are more balanced (combination approach).

REQUIREMENTS:
- Ollama installed and running locally on http://localhost:11434
- A language model installed (e.g., mistral, neural-chat)
- Run: ollama serve (in another terminal before running this script)
"""

import json
import os
import requests

CARDS_PATH = "subjects/ДНИЧК/cards.json"
BACKUP_PATH = "subjects/ДНИЧК/cards_backup.json"
OLLAMA_API = "http://localhost:11434/api/generate"
MODEL_NAME = "mistral"  # Change if using different model

def needs_fix(card):
    choices = card["choices"]
    correct_indices = card["correct"]
    max_correct = max(len(choices[i]) for i in correct_indices)
    max_all = max(len(c) for c in choices)
    return max_correct == max_all

def fix_card(card):
    choices = card["choices"]
    correct_indices = card["correct"]
    question = card["question"]

    correct_texts = [choices[i] for i in correct_indices]
    wrong_texts = [choices[i] for i in range(len(choices)) if i not in correct_indices]

    prompt = f"""Ти си уредник на тест прашања на македонски јазик.

Прашање: {question}

Точни одговори: {json.dumps(correct_texts, ensure_ascii=False)}
Неточни одговори (дистрактори): {json.dumps(wrong_texts, ensure_ascii=False)}

Проблем: Точните одговори се очигледно подолги од неточните, па студентите можат да погодат само по должина.

Задача: Пренапиши ги одговорите (комбинација - малку скрати ги точните, малку продолжи ги неточните) за да се избалансираат должините. Правила:
- НЕ ја менувај смислата на точните одговори - само стилски/јазично пократи
- Неточните треба да звучат убедливо но да бидат погрешни
- Сите одговори треба да бидат слични по должина (максимална разлика ~20 карактери)
- Зачувај го македонскиот стил

Врати САМО валиден JSON во овој формат, без никакво друго тексто:
{{
  "correct": ["поправен точен одговор 1", ...],
  "wrong": ["поправен дистрактор 1", "поправен дистрактор 2", ...]
}}"""

    # Call Ollama API
    try:
        response = requests.post(
            OLLAMA_API,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.3,
            },
            timeout=60
        )
        response.raise_for_status()
        response_text = response.json()["response"]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(
            f"Cannot connect to Ollama at {OLLAMA_API}. "
            "Make sure Ollama is running: ollama serve"
        )
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Ollama API error: {e}")

    # Parse JSON response
    result = json.loads(response_text.strip())

    # Rebuild choices array in original order
    new_choices = list(choices)  # copy
    correct_iter = iter(result["correct"])
    wrong_iter = iter(result["wrong"])

    for i in range(len(new_choices)):
        if i in correct_indices:
            new_choices[i] = next(correct_iter)
        else:
            new_choices[i] = next(wrong_iter)

    return new_choices


def main():
    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)

    # Backup
    with open(BACKUP_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"Backup saved to {BACKUP_PATH}")

    biased = [(i, c) for i, c in enumerate(cards) if needs_fix(c)]
    print(f"Cards to fix: {len(biased)}\n")

    fixed_count = 0
    error_count = 0

    for idx, (card_idx, card) in enumerate(biased):
        try:
            new_choices = fix_card(card)
            cards[card_idx]["choices"] = new_choices
            fixed_count += 1
            print(f"[{idx+1}/{len(biased)}] Fixed card {card_idx}: {card['question'][:60]}...")
        except Exception as e:
            error_count += 1
            print(f"[{idx+1}/{len(biased)}] ERROR card {card_idx}: {e}")

    # Save
    with open(CARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Fixed: {fixed_count}, Errors: {error_count}")

    # Verify
    remaining = sum(1 for c in cards if needs_fix(c))
    print(f"Cards still biased: {remaining}/{len(cards)}")


if __name__ == "__main__":
    main()
