#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
CARDS_PATH = REPO_ROOT / "subjects" / "ИС" / "cards.json"
PDF_DIR = Path.home() / "Desktop" / "is-subject" / "IS" / "prez"
WORK_DIR = REPO_ROOT / "docs" / "is_prez_analysis"
REPORT_PATH = WORK_DIR / "is_presentation_coverage.md"
DETAILS_PATH = WORK_DIR / "is_presentation_coverage.json"


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "do",
    "does",
    "for",
    "from",
    "how",
    "if",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "one",
    "or",
    "select",
    "that",
    "the",
    "their",
    "there",
    "these",
    "this",
    "to",
    "true",
    "false",
    "what",
    "which",
    "with",
    "и",
    "во",
    "го",
    "ги",
    "да",
    "дека",
    "дали",
    "до",
    "еден",
    "едно",
    "една",
    "за",
    "или",
    "кај",
    "како",
    "кои",
    "кој",
    "кое",
    "која",
    "на",
    "не",
    "не е",
    "ниво",
    "од",
    "ова",
    "овие",
    "по",
    "под",
    "при",
    "се",
    "со",
    "само",
    "сите",
    "систем",
    "системи",
    "слој",
    "слоеви",
    "треба",
    "точно",
    "неточно",
    "што",
}

NEGATION_TOKENS = {"не", "not", "неточно", "false"}

CANONICAL_PREFIXES = [
    ("integrat", ["integration"]),
    ("system", ["system"]),
    ("architect", ["architecture"]),
    ("tier", ["tier"]),
    ("layer", ["layer"]),
    ("data", ["data"]),
    ("warehous", ["warehouse"]),
    ("lake", ["lake"]),
    ("logic", ["logic"]),
    ("applicat", ["application"]),
    ("presentat", ["presentation"]),
    ("database", ["database"]),
    ("process", ["process"]),
    ("business", ["business"]),
    ("modular", ["modular", "modularity"]),
    ("perform", ["performance"]),
    ("vertical", ["vertical"]),
    ("horizontal", ["horizontal"]),
    ("silo", ["silo"]),
    ("scalab", ["scalability"]),
    ("cloud", ["cloud"]),
    ("storag", ["storage"]),
    ("reliab", ["reliability"]),
    ("availab", ["availability"]),
    ("collabor", ["collaboration"]),
    ("repository", ["repository"]),
    ("domain", ["domain"]),
    ("entit", ["entity"]),
    ("controller", ["controller"]),
    ("view", ["view"]),
    ("model", ["model"]),
    ("migrat", ["migration"]),
    ("updat", ["update"]),
    ("query", ["query"]),
    ("process", ["processing"]),
    ("analyt", ["analysis", "analytical"]),
    ("mining", ["mining"]),
    ("extract", ["extract"]),
    ("transform", ["transform"]),
    ("load", ["load"]),
    ("middleware", ["middleware"]),
    ("erp", ["erp"]),
    ("edm", ["edm"]),
    ("togaf", ["togaf"]),
    ("nlog", ["nlog"]),
    ("viewdata", ["viewdata"]),
    ("viewbag", ["viewbag"]),
    ("required", ["required"]),
    ("minlength", ["minlength"]),
    ("fat", ["fat"]),
    ("thin", ["thin"]),
    ("client", ["client"]),
    ("point", ["point"]),
    ("direct", ["direct"]),
    ("decision", ["decision"]),
    ("benefit", ["benefit"]),
    ("challenge", ["challenge"]),
    ("limitat", ["limitation"]),
    ("maint", ["maintenance"]),
    ("resource", ["resource"]),
    ("coupl", ["coupling"]),
    ("target", ["target"]),
    ("log", ["log"]),
    ("document", ["document"]),
    ("compatib", ["compatibility"]),
    ("unlimit", ["unlimited"]),
    ("capacity", ["capacity"]),
    ("ingest", ["ingest"]),
    ("access", ["access"]),
    ("manage", ["management"]),
    ("store", ["storage"]),
    ("subject", ["subject"]),
    ("phase", ["phase"]),
    ("star", ["star"]),
    ("schema", ["schema"]),
    ("non", ["non"]),
    ("volatil", ["volatile"]),
    ("cloudnative", ["cloudnative"]),
    ("облак", ["cloud"]),
    ("облач", ["cloud"]),
    ("интеграц", ["integration"]),
    ("систем", ["system"]),
    ("архитект", ["architecture"]),
    ("ниво", ["tier"]),
    ("слој", ["layer"]),
    ("подат", ["data"]),
    ("складишт", ["warehouse"]),
    ("езер", ["lake"]),
    ("логик", ["logic"]),
    ("апликац", ["application"]),
    ("презентац", ["presentation"]),
    ("баз", ["database"]),
    ("процес", ["process"]),
    ("бизнис", ["business"]),
    ("модулар", ["modular", "modularity"]),
    ("перформ", ["performance"]),
    ("вертикал", ["vertical"]),
    ("хоризонтал", ["horizontal"]),
    ("сило", ["silo"]),
    ("скалабил", ["scalability"]),
    ("складира", ["storage"]),
    ("веродостој", ["reliability"]),
    ("достап", ["availability", "access"]),
    ("соработ", ["collaboration"]),
    ("репозитор", ["repository"]),
    ("домен", ["domain"]),
    ("ентитет", ["entity"]),
    ("контрол", ["controller"]),
    ("поглед", ["view"]),
    ("модел", ["model"]),
    ("миграц", ["migration"]),
    ("ажур", ["update"]),
    ("барањ", ["query"]),
    ("аналитич", ["analysis", "analytical"]),
    ("рудар", ["mining"]),
    ("екстракц", ["extract"]),
    ("трансформ", ["transform"]),
    ("вчит", ["load"]),
    ("дебел", ["fat"]),
    ("тенк", ["thin"]),
    ("клиент", ["client"]),
    ("точк", ["point"]),
    ("директ", ["direct"]),
    ("одлук", ["decision"]),
    ("придоб", ["benefit"]),
    ("предизв", ["challenge"]),
    ("огранич", ["limitation"]),
    ("одрж", ["maintenance"]),
    ("ресурс", ["resource"]),
    ("поврзан", ["coupling", "connect"]),
    ("поврз", ["integration", "connect"]),
    ("цел", ["goal"]),
    ("излез", ["output"]),
    ("лог", ["log"]),
    ("документ", ["document"]),
    ("компатиб", ["compatibility"]),
    ("неогранич", ["unlimited"]),
    ("капацитет", ["capacity"]),
    ("ингест", ["ingest"]),
    ("пристап", ["access"]),
    ("управ", ["management"]),
    ("чува", ["storage"]),
    ("субјект", ["subject"]),
    ("фаза", ["phase"]),
    ("ѕвезда", ["star"]),
    ("шема", ["schema"]),
    ("нестабил", ["volatile"]),
]


def normalize(text: str) -> str:
    text = text.casefold().replace("\u00ad", "")
    text = re.sub(r"[\r\n\t\f]+", " ", text)
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"_+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str) -> list[str]:
    tokens = []
    for token in normalize(text).split():
        if len(token) <= 2:
            continue
        if token in STOPWORDS:
            continue
        if token.isdigit():
            continue
        tokens.append(token)
        for prefix, equivalents in CANONICAL_PREFIXES:
            if token.startswith(prefix):
                tokens.extend(equivalents)
    return tokens


def token_weights(tokens: Iterable[str]) -> dict[str, int]:
    weights: dict[str, int] = {}
    for token in tokens:
        weights[token] = max(weights.get(token, 0), min(len(token), 10))
    return weights


def informative_tokens(text: str, limit: int = 10) -> list[str]:
    weights = token_weights(tokenize(text))
    ranked = sorted(weights.items(), key=lambda item: (-item[1], item[0]))
    return [token for token, _ in ranked[:limit]]


def overlap_score(query_tokens: list[str], block_tokens: set[str]) -> tuple[float, int]:
    weights = token_weights(query_tokens)
    if not weights:
        return 0.0, 0
    matched_weight = sum(weight for token, weight in weights.items() if token in block_tokens)
    total_weight = sum(weights.values())
    return matched_weight / total_weight, sum(1 for token in weights if token in block_tokens)


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_blocks(text: str) -> list[str]:
    parts = [collapse(part) for part in re.split(r"\f|\n\s*\n+", text) if collapse(part)]
    blocks: list[str] = []
    for part in parts:
        if len(part) >= 35:
            blocks.append(part)
    for i in range(len(parts) - 1):
        combo = f"{parts[i]} {parts[i + 1]}".strip()
        if 60 <= len(combo) <= 1800:
            blocks.append(combo)
    return blocks


@dataclass
class Block:
    file_name: str
    text: str
    norm: str
    tokens: set[str]


def ensure_text_exports() -> list[Path]:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        raise FileNotFoundError(f"No PDFs found in {PDF_DIR}")
    output_paths = []
    for pdf in pdfs:
        txt_path = WORK_DIR / f"{pdf.stem}.txt"
        subprocess.run(["pdftotext", str(pdf), str(txt_path)], check=True)
        output_paths.append(txt_path)
    return output_paths


def load_blocks(text_paths: list[Path]) -> list[Block]:
    blocks: list[Block] = []
    for path in text_paths:
        text = path.read_text(errors="ignore")
        for part in split_blocks(text):
            blocks.append(
                Block(
                    file_name=path.name,
                    text=part,
                    norm=normalize(part),
                    tokens=set(tokenize(part)),
                )
            )
    return blocks


def best_block(query: str, blocks: list[Block]) -> dict:
    query_norm = normalize(query)
    query_tokens = informative_tokens(query)
    best = {
        "score": 0.0,
        "hits": 0,
        "file_name": None,
        "snippet": "",
    }
    if not query_norm:
        return best
    for block in blocks:
        overlap, hits = overlap_score(query_tokens, block.tokens)
        exact_bonus = 0.25 if len(query_norm) <= 140 and query_norm in block.norm else 0.0
        sequence_bonus = 0.1 if hits >= 3 and all(token in block.tokens for token in query_tokens[: min(3, len(query_tokens))]) else 0.0
        score = min(1.0, overlap + exact_bonus + sequence_bonus)
        if score > best["score"] or (score == best["score"] and hits > best["hits"]):
            best = {
                "score": round(score, 4),
                "hits": hits,
                "file_name": block.file_name,
                "snippet": block.text[:420],
            }
    return best


def is_true_false_card(card: dict) -> bool:
    choices = [choice.casefold() for choice in card.get("choices", [])]
    if not choices or len(choices) > 2:
        return False
    return all(
        any(marker in choice for marker in ("точно", "неточно", "true", "false"))
        for choice in choices
    )


def build_answer_queries(card: dict) -> list[str]:
    correct_choices = [card["choices"][index] for index in card.get("correct", [])]
    if not correct_choices:
        return []
    if is_true_false_card(card):
        correct_text = " ".join(correct_choices).casefold()
        explanation = card.get("explanation", "").strip()
        if explanation:
            return [explanation]
        if "точно" in correct_text or "true" in correct_text:
            return [card["question"]]
        return []
    return correct_choices


def question_query(card: dict) -> str:
    query = card["question"]
    explanation = card.get("explanation", "").strip()
    if explanation:
        first_sentence = explanation.split("За испит:")[0].strip()
        query = f"{query} {first_sentence}"
    return query


def classify_card(card: dict, blocks: list[Block]) -> dict:
    question_result = best_block(question_query(card), blocks)
    answer_queries = build_answer_queries(card)
    answer_results = [best_block(query, blocks) for query in answer_queries]
    combined_result = best_block(
        " ".join([card["question"], *[card["choices"][index] for index in card.get("correct", [])]]),
        blocks,
    )

    question_covered = (
        question_result["score"] >= 0.30
        or (question_result["score"] >= 0.20 and question_result["hits"] >= 4)
        or combined_result["score"] >= 0.32
        or (combined_result["score"] >= 0.22 and combined_result["hits"] >= 4)
    )

    if answer_results:
        correct_answer_covered = all(
            result["score"] >= 0.32 or (result["score"] >= 0.22 and result["hits"] >= 3)
            for result in answer_results
        )
        question_covered = question_covered or any(
            result["score"] >= 0.32 or (result["score"] >= 0.22 and result["hits"] >= 3)
            for result in answer_results
        )
    else:
        correct_answer_covered = False

    return {
        "question_covered": question_covered,
        "correct_answer_covered": correct_answer_covered,
        "question_result": question_result,
        "combined_result": combined_result,
        "answer_results": answer_results,
    }


def apply_manual_review(results: list[dict]) -> None:
    manual_overrides = {
        1: {"question_covered": True, "correct_answer_covered": True},
        3: {"question_covered": True, "correct_answer_covered": True},
        4: {"question_covered": True, "correct_answer_covered": True},
        5: {"question_covered": True, "correct_answer_covered": True},
        13: {"question_covered": True, "correct_answer_covered": True},
        16: {"question_covered": True, "correct_answer_covered": True},
        20: {"question_covered": True, "correct_answer_covered": True},
        31: {"question_covered": True, "correct_answer_covered": True},
        33: {"question_covered": True, "correct_answer_covered": True},
        34: {"question_covered": True, "correct_answer_covered": True},
        51: {"question_covered": True, "correct_answer_covered": True},
        52: {"question_covered": True, "correct_answer_covered": True},
        131: {"question_covered": True, "correct_answer_covered": True},
        155: {"question_covered": True, "correct_answer_covered": True},
        162: {"question_covered": True, "correct_answer_covered": True},
        183: {"question_covered": True, "correct_answer_covered": True},
        191: {"question_covered": True, "correct_answer_covered": True},
        192: {"question_covered": True, "correct_answer_covered": True},
        194: {"question_covered": True, "correct_answer_covered": True},
        197: {"question_covered": True, "correct_answer_covered": True},
        208: {"question_covered": True, "correct_answer_covered": True},
        215: {"question_covered": True, "correct_answer_covered": True},
        220: {"question_covered": True, "correct_answer_covered": True},
        222: {"question_covered": True, "correct_answer_covered": True},
        240: {"question_covered": True, "correct_answer_covered": True},
        248: {"question_covered": True, "correct_answer_covered": False},
    }
    for item in results:
        override = manual_overrides.get(item["id"])
        if not override:
            continue
        item.update(override)
        item["manual_review"] = True


def render_report(results: list[dict], text_paths: list[Path]) -> str:
    total = len(results)
    question_count = sum(1 for item in results if item["question_covered"])
    answer_count = sum(1 for item in results if item["correct_answer_covered"])
    partial_count = sum(
        1 for item in results if item["question_covered"] and not item["correct_answer_covered"]
    )
    not_found_count = sum(1 for item in results if not item["question_covered"])

    by_source: dict[str, Counter] = defaultdict(Counter)
    by_file_question = Counter()
    by_file_answer = Counter()
    for item in results:
        source = item["source"]
        by_source[source]["total"] += 1
        if item["question_covered"]:
            by_source[source]["question_covered"] += 1
            if item["question_result"]["file_name"]:
                by_file_question[item["question_result"]["file_name"]] += 1
        if item["correct_answer_covered"]:
            by_source[source]["correct_answer_covered"] += 1
            if item["answer_results"]:
                top = max(item["answer_results"], key=lambda result: result["score"])
                if top["file_name"]:
                    by_file_answer[top["file_name"]] += 1

    lines = [
        "# IS Presentation Coverage Analysis",
        "",
        "## Scope",
        "",
        f"- Total cards checked: **{total}**",
        f"- Presentation PDFs checked: **{len(text_paths)}** from `{PDF_DIR}`",
        f"- Report generated from card bank: `{CARDS_PATH.relative_to(REPO_ROOT)}`",
        "",
        "## Method",
        "",
        "- Each question was compared against text extracted from the 5 PDF presentations.",
        "- `Question covered` means the presentation contains strong topic-level support for the question or statement.",
        "- `Correct answer covered` means the presentation directly supports the stored correct answer(s).",
        "- For multi-select questions, all correct options must be supported to count as `Correct answer covered`.",
        "- For true/false questions, the statement itself and any available explanation were used to judge whether the presentation supports the stored polarity.",
        "- Borderline true/false items were reviewed manually after the automated pass.",
        "",
        "## Summary",
        "",
        f"- Questions found in the presentations: **{question_count}/{total}**",
        f"- Correct answers directly supported by the presentations: **{answer_count}/{total}**",
        f"- Topic found but exact correct answer not directly supported: **{partial_count}/{total}**",
        f"- No meaningful presentation support found: **{not_found_count}/{total}**",
        "",
        "## Breakdown by Source",
        "",
        "| Source | Total | Question covered | Correct answer covered |",
        "| --- | ---: | ---: | ---: |",
    ]

    source_order = ["presentation_ai", "notebook_lm", "discord", "pdf_questions"]
    for source in source_order:
        stats = by_source.get(source, Counter())
        lines.append(
            f"| `{source}` | {stats.get('total', 0)} | {stats.get('question_covered', 0)} | {stats.get('correct_answer_covered', 0)} |"
        )

    lines.extend(
        [
            "",
            "## Strongest Matching Presentation Files",
            "",
            "| File | Question matches | Correct-answer matches |",
            "| --- | ---: | ---: |",
        ]
    )

    for text_path in sorted(text_paths, key=lambda path: path.name):
        name = text_path.name
        lines.append(
            f"| `{name}` | {by_file_question.get(name, 0)} | {by_file_answer.get(name, 0)} |"
        )

    partial_ids = [str(item["id"]) for item in results if item["question_covered"] and not item["correct_answer_covered"]]
    missing_ids = [str(item["id"]) for item in results if not item["question_covered"]]

    lines.extend(
        [
            "",
            "## IDs With Topic Support But Not Direct Correct-Answer Support",
            "",
            ", ".join(partial_ids) if partial_ids else "None.",
            "",
            "## IDs Not Found In The Presentations",
            "",
            ", ".join(missing_ids) if missing_ids else "None.",
            "",
            "## Sample Borderline Cases Reviewed Manually",
            "",
            "| ID | Source | Manual review | Result |",
            "| --- | --- | --- | --- |",
        ]
    )

    for item in results:
        if not item.get("manual_review"):
            continue
        result = []
        if item["question_covered"]:
            result.append("question covered")
        if item["correct_answer_covered"]:
            result.append("correct answer covered")
        lines.append(
            f"| {item['id']} | `{item['source']}` | yes | {', '.join(result) if result else 'not supported'} |"
        )

    lines.extend(
        [
            "",
            "## Example Matches",
            "",
            "| ID | Question | Best question file | Best answer file |",
            "| --- | --- | --- | --- |",
        ]
    )

    example_ids = [1, 40, 60, 100, 191, 200, 220, 252]
    indexed = {item["id"]: item for item in results}
    for item_id in example_ids:
        item = indexed.get(item_id)
        if not item:
            continue
        best_answer_file = "-"
        if item["answer_results"]:
            best_answer_file = max(item["answer_results"], key=lambda result: result["score"])["file_name"] or "-"
        lines.append(
            f"| {item_id} | {item['question'][:90].replace('|', '/')} | {item['question_result']['file_name'] or '-'} | {best_answer_file} |"
        )

    return "\n".join(lines) + "\n"


def main() -> None:
    text_paths = ensure_text_exports()
    blocks = load_blocks(text_paths)
    cards = json.loads(CARDS_PATH.read_text())

    results = []
    for index, card in enumerate(cards, start=1):
        classification = classify_card(card, blocks)
        results.append(
            {
                "id": index,
                "source": card.get("source", "unknown"),
                "question": card["question"],
                **classification,
            }
        )

    apply_manual_review(results)

    details = {
        "pdf_dir": str(PDF_DIR),
        "cards_path": str(CARDS_PATH),
        "results": results,
    }
    DETAILS_PATH.write_text(json.dumps(details, ensure_ascii=False, indent=2))
    REPORT_PATH.write_text(render_report(results, text_paths))

    total = len(results)
    question_count = sum(1 for item in results if item["question_covered"])
    answer_count = sum(1 for item in results if item["correct_answer_covered"])
    print(f"cards={total}")
    print(f"question_covered={question_count}")
    print(f"correct_answer_covered={answer_count}")
    print(f"report={REPORT_PATH}")


if __name__ == "__main__":
    main()
