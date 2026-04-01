# IS Presentation Coverage Analysis

## Scope

- Total cards checked: **248**
- Presentation PDFs checked: **5** from `/Users/filipmicevski/Desktop/is-subject/IS/prez`
- Report generated from card bank: `subjects/ИС/cards.json`

## Method

- Each question was compared against text extracted from the 5 PDF presentations.
- `Question covered` means the presentation contains strong topic-level support for the question or statement.
- `Correct answer covered` means the presentation directly supports the stored correct answer(s).
- For multi-select questions, all correct options must be supported to count as `Correct answer covered`.
- For true/false questions, the statement itself and any available explanation were used to judge whether the presentation supports the stored polarity.
- Borderline true/false items were reviewed manually after the automated pass.

## Summary

- Questions found in the presentations: **163/248**
- Correct answers directly supported by the presentations: **107/248**
- Topic found but exact correct answer not directly supported: **56/248**
- No meaningful presentation support found: **85/248**

## Breakdown by Source

| Source | Total | Question covered | Correct answer covered |
| --- | ---: | ---: | ---: |
| `presentation_ai` | 95 | 66 | 49 |
| `notebook_lm` | 82 | 50 | 33 |
| `discord` | 61 | 37 | 21 |
| `pdf_questions` | 10 | 10 | 4 |

## Strongest Matching Presentation Files

| File | Question matches | Correct-answer matches |
| --- | ---: | ---: |
| `1.txt` | 46 | 23 |
| `2.txt` | 16 | 15 |
| `3.txt` | 8 | 12 |
| `4.txt` | 30 | 20 |
| `5.txt` | 62 | 34 |

## IDs With Topic Support But Not Direct Correct-Answer Support

2, 35, 39, 40, 47, 56, 63, 67, 70, 80, 84, 85, 87, 89, 92, 93, 94, 96, 97, 98, 99, 100, 105, 106, 110, 112, 122, 125, 136, 139, 143, 145, 146, 148, 149, 167, 172, 175, 179, 180, 195, 199, 203, 204, 206, 213, 218, 221, 223, 227, 233, 235, 241, 242, 245, 248

## IDs Not Found In The Presentations

9, 11, 12, 14, 15, 18, 19, 21, 22, 23, 25, 27, 29, 32, 49, 50, 54, 58, 59, 61, 62, 64, 65, 68, 74, 81, 82, 86, 90, 111, 113, 116, 117, 118, 119, 120, 121, 127, 128, 130, 133, 134, 142, 144, 147, 152, 154, 157, 158, 159, 160, 161, 164, 166, 168, 169, 171, 173, 178, 186, 187, 188, 189, 190, 198, 200, 201, 207, 209, 210, 211, 214, 216, 219, 224, 225, 226, 228, 229, 232, 237, 238, 239, 243, 246

## Sample Borderline Cases Reviewed Manually

| ID | Source | Manual review | Result |
| --- | --- | --- | --- |
| 1 | `presentation_ai` | yes | question covered, correct answer covered |
| 3 | `presentation_ai` | yes | question covered, correct answer covered |
| 4 | `presentation_ai` | yes | question covered, correct answer covered |
| 5 | `presentation_ai` | yes | question covered, correct answer covered |
| 13 | `presentation_ai` | yes | question covered, correct answer covered |
| 16 | `presentation_ai` | yes | question covered, correct answer covered |
| 20 | `presentation_ai` | yes | question covered, correct answer covered |
| 31 | `presentation_ai` | yes | question covered, correct answer covered |
| 33 | `presentation_ai` | yes | question covered, correct answer covered |
| 34 | `presentation_ai` | yes | question covered, correct answer covered |
| 51 | `presentation_ai` | yes | question covered, correct answer covered |
| 52 | `presentation_ai` | yes | question covered, correct answer covered |
| 131 | `notebook_lm` | yes | question covered, correct answer covered |
| 155 | `notebook_lm` | yes | question covered, correct answer covered |
| 162 | `notebook_lm` | yes | question covered, correct answer covered |
| 183 | `notebook_lm` | yes | question covered, correct answer covered |
| 191 | `discord` | yes | question covered, correct answer covered |
| 192 | `discord` | yes | question covered, correct answer covered |
| 194 | `discord` | yes | question covered, correct answer covered |
| 197 | `discord` | yes | question covered, correct answer covered |
| 208 | `discord` | yes | question covered, correct answer covered |
| 215 | `discord` | yes | question covered, correct answer covered |
| 220 | `discord` | yes | question covered, correct answer covered |
| 222 | `discord` | yes | question covered, correct answer covered |
| 240 | `discord` | yes | question covered, correct answer covered |
| 248 | `discord` | yes | question covered |

## Example Matches

| ID | Question | Best question file | Best answer file |
| --- | --- | --- | --- |
| 1 | Што е системска интеграција (SI)? | 1.txt | 2.txt |
| 40 | Колку Knowledge Areas содржи DAMA-DMBOK2? | 5.txt | - |
| 60 | Кои се NLog targets (цели за логирање)? | 5.txt | 1.txt |
| 100 | Кои се скриените трошоци при ERP имплементација? (Изберете ги точните) | 1.txt | 3.txt |
| 191 | Точно или неточно: Point-to-Point технички не е целосна системска интеграција, туку ограни | 2.txt | 2.txt |
| 200 | Кои тврдења се точни за контролерите? | - | - |
| 220 | Точно или неточно: Data Governance гарантира дека организацијата има структура, систем за  | 5.txt | 5.txt |
