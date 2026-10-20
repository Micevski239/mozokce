# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Мозокче: a Macedonian-language study web app for a few university students. Each subject collects its study materials in one place: uploaded files (PDF, images, slides), pasted Discord chat text, and notes. Each subject can also have a **brain** (`brains/<id>/brain.json`): how the subject is examined, what to focus on, topic notes and practice questions. Brains are written by Claude Code in a session from materials the user sends (no API key, no export/import) and shared with classmates through GitHub.

**No database, no Docker, no login** (like the old desktop app): shared content lives in git (`brains/`, and `data/`: subjects, calendar, materials and their files) and syncs between classmates by `git push` / `git pull`, not live; personal data (quiz progress, display name) lives in the gitignored `.mozokce/` folder, so everyone who clones the repo has their own progress. Built with Next.js 16 (App Router), reading and writing JSON files on the server. The previous Supabase version is archived locally in `backup/` (gitignored), not in git. The roadmap is in `docs/2026-09-30-plan-web-aplikacija.md`.

## Commands

```bash
npm run dev                 # Next.js dev server (use `-- -p 3100` if :3000 is taken)
npm test                    # vitest unit tests (src/**/*.test.ts), also validates every brain.json
npx vitest run src/lib/data.test.ts   # single test file
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
MOZOKCE_DATA_DIR=/tmp/p MOZOKCE_SHARED_DIR=/tmp/s npm run dev   # run against other folders (tests, QA) without touching .mozokce/ or data/
```

## Architecture

- **Data layer** — `src/lib/local-store.ts` (JSON read; `updateJson` = read → change → atomic write, queued per file so quick successive writes are not lost, skipped when the change returns `undefined`; one-file-per-record helpers `readItems`/`itemFile`/`patchItem`/`removeItem`; `sharedDir()` honours `MOZOKCE_SHARED_DIR`, `personalDir()` honours `MOZOKCE_DATA_DIR`) and `src/lib/data.ts` (server-only domain functions, deliberately without React `cache` so an action that reads then writes never leaves a stale list in the same request):
  - shared, in git (`data/`): `subjects.json` (`Subject`: ASCII `id` such as `ikt`, made by `subjectSlug()` from the code/name; `name`, `code`, `archived`); `calendar/<id>.json` (one event per file); `materials/<id>.json` (one material per file, `created_by` = the adder's display name) + `files/<subjectId>/<uuid>.<ext>` (uploads; original name in `file_name`). One file per record so two people adding things at the same time merge in git without conflicts;
  - personal, `.mozokce/`: `progress.json` (`{ [brainId]: { [questionId]: QuestionProgressRow } }`), `profile.json` (`username`, default = OS user name).
- **Mutations** are server actions: `src/app/(app)/actions.ts` (subjects, profile), `calendar/actions.ts` (save/delete event, skip one occurrence), `subjects/[subjectId]/actions.ts` (upload file, add chat/note, edit, pin, delete material, save question progress). They call `revalidatePath("/", "layout")` except `saveQuestionProgress` (the quiz refreshes at the end of a session). Uploads go through a server action, so `next.config.ts` raises `serverActions.bodySizeLimit` to 52 MB (files ≤ 50 MB).
- **`src/app/api/files/[id]/route.ts`** — serves an uploaded file inline (path checked to stay inside `data/files`).
- **`brains/<id>/brain.json`** — one brain per subject (`id` = ASCII folder name, linked to the subject by `subject.code` ↔ `subjects.json` `code`). Schema and validation in `src/lib/brain.ts` (`parseBrain` reports the exact path of an error); disk loading in `src/lib/brain-files.ts` (read per request, so `git pull` shows up immediately). Everything the app shows comes from the file: `assessment` (official parts with points and minimum %, total to pass, per-part facts, dated stages such as a project's, rules, and unconfirmed `from_students` notes), `overview` (summary, focus, exam patterns, pitfalls, rumors, gaps), `staff`, `topics`, `questions`; every claim lists `sources` (typed by trust: official / students / chat / added by Claude).
- **`src/app/(app)/subjects/[subjectId]/`** — subject dashboard with tabs (`?tab=overview|topics|questions|files|chats|notes|settings`; `topics`/`questions` only when the subject has a brain). With a brain, `brain-overview.tsx` replaces the materials overview (assessment, focus, patterns, pitfalls, gaps, progress, upcoming kolokvium/exam from the calendar, weekly slots, sources); `brain-topics.tsx` shows the topic notes; `question-practice.tsx` (client) is the quiz with the old desktop app's sets (Главен сет, Погрешни, Совладани, Готови, Означени, Пропуштени from the last session, Tainted with „Исчисти“; reset mastered / reset all), shuffled questions and options, single-answer click answers immediately, multi-answer + „Поднеси“, keys 1–9/Enter. `add-material.tsx` opens `material-composer.tsx` in a dialog (also via `?add=file|chat|note`); `material-list.tsx` lists materials grouped by origin or month, with search, pin („Важно“), edit, open and delete.
- **`src/app/(app)/page.tsx`** — home dashboard (subject cards, pinned, activity by day); **`/search`** — in-memory search over material titles, file names and text.
- **`src/lib/calendar.ts`** — pure calendar logic (tested): dates are `YYYY-MM-DD` strings and times are minutes, all in Skopje local time (events store local `date` + `start_time`/`end_time`, so weekly series survive DST). `expandOccurrences` expands weekly repeats (minus `skip_dates`), `layoutOverlaps` places overlapping events side by side.
- **`src/app/(app)/calendar/`** — `calendar-app.tsx` (client) owns view/date/filter state and syncs it to the URL with `history.replaceState`; views: `time-grid.tsx` (week/day; click an empty slot to create), `month-grid.tsx`, `agenda.tsx`; `event-form.tsx` / `event-details.tsx` dialogs call the calendar server actions. Event colour = subject colour (`subjectTint`); kolokvium/exam/homework are "important" (countdown, red accent). Phones get the day view (week needs ≥768px). The calendar is shared through git like the subjects.
- **`src/lib/quiz/`** — pure quiz logic from the old app. `progress.ts` holds the mastery rules (2 correct in a row = mastered, 2 more in Совладани = Готови, wrong → Погрешни, 3 strikes = tainted until redeemed), reused by the quiz through `rowToProgress`/`progressToRow` in `brain.ts`; the rest is unused.

## Key Patterns

- All UI text and card content is in Macedonian.
- Design system ("liquid glass", ported from the Coachfio hub) lives in `src/app/globals.css`: tokens for light (Arctic) and dark (Night) themes, the animated `.sky` backdrop (paused with `prefers-reduced-motion`), and component classes `.glass` (page-level panels), `.fill` (plates inside a panel — never glass on glass), `.btn`/`.btn-primary`, `.chip`, `.kicker`, `.keycap`. Fonts: Onest (body, has Cyrillic) + JetBrains Mono (display voice: headings, nav, labels). Blue is the only accent; success/danger/warn are semantic. Shared React pieces are in `src/components/ui.tsx`. Theme is a cookie (`mozokce_theme`) read in the root layout.
- Navigation: every route under `(app)` has a `loading.tsx` with a page-shaped skeleton from `components/skeletons.tsx` (user's choice over a progress bar). Keep skeletons in sync when a page's layout changes. `next.config.ts` sets `experimental.staleTimes.dynamic = 30` so revisits are instant. Subject tabs switch client-side (`subject-tabs.tsx`, `history.pushState` + `useSearchParams`) with no server round trip.
- Modals must use `components/dialog.tsx` (portal to `<body>`): glass panels use `backdrop-filter`, which traps `position: fixed` children inside the panel.
- Any CSS grid without explicit columns needs `grid-cols-[minmax(0,1fr)]`, otherwise the implicit track grows to the widest content and overflows on phones.
- Dates and relative times are formatted by hand in Macedonian (`formatDate`, `timeAgo`): browsers often lack the `mk` Intl locale, which caused English dates and hydration mismatches.
- Writing a brain: keep question `id`s stable when updating (progress is keyed by brain id + question id); never write classmates' names from Discord chats; mark unconfirmed exam info with `assessment.confirmed: false`; when the bank's answer looks wrong, give the correct answer and say so in `explanation` and `overview.pitfalls`. Materials (slides, Discord chats) are committed to `data/`, so the GitHub repo must be private before pushing them (it was public as of 2026-10); never commit `.mozokce/`.
- `src/lib/cards-import.ts` is kept only as a parser for the old desktop JSON files (`subjects/`, `oldsubj/`, root `cards.json`); the old card tables went away with the Supabase version.
