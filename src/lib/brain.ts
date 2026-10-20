/**
 * Мозок на предметот: brains/<id>/brain.json во репото, заеднички за сите преку GitHub.
 * Го пишува Claude Code од материјалите што ќе ги пратиме; апликацијата само го чита.
 * Ознаките на прашањата се стабилни (на нив е врзан личниот напредок во question_progress).
 *
 * Овој модул е чист (без fs), за да може да се користи и на клиентот; читањето од диск е во brain-files.ts.
 */

import { deckCounts, type DeckCounts } from "./quiz/deck";
import { emptyProgress, isCompleted, isMastered } from "./quiz/progress";
import type { Progress, ProgressMap } from "./quiz/types";

export const BRAIN_SCHEMA_VERSION = 1;

export type SourceType =
  | "courses"
  | "past_exam"
  | "question_bank"
  | "discord_file"
  | "discord_chat"
  | "friend_note"
  | "timetable"
  | "claude";

export interface BrainSource {
  id: string;
  type: SourceType;
  title: string;
  note?: string;
}

/** Точка со извори (што се паѓало, што рекол професорот, замки, гласини). */
export interface SourcedPoint {
  text: string;
  sources: string[];
}

export interface AssessmentStep {
  title: string;
  detail?: string;
  /** Рок или момент, на пр. „најдоцна 7 дена пред презентацијата“. */
  when?: string;
}

/** Еден дел од оценката (проект, тест, колоквиум…), како табелата на courses. */
export interface AssessmentPart {
  id: string;
  name: string;
  points: number | null;
  /** Минимум процент од поените на делот за да се смета за положен. */
  min_percent: number | null;
  summary: string;
  /** Кратки факти: „Каде: ispiti.finki.ukim.mk“, „Презентација: 3 минути по студент“… */
  facts: { label: string; value: string }[];
  /** Етапи по ред (на пр. на проектот), со рокови. */
  steps: AssessmentStep[];
  /** Важни правила за делот. */
  rules: string[];
  /** Што велат колегите за овој дел (непотврдено). */
  from_students: SourcedPoint[];
  sources: string[];
}

export interface Assessment {
  summary: string;
  /** Вкупно поени и минимум процент за положување на предметот; null ако не знаеме. */
  total: { points: number; min_percent: number } | null;
  parts: AssessmentPart[];
  /** Потврдено од официјален извор (courses, професор); false = само од колеги. */
  confirmed: boolean;
  note?: string;
  sources: string[];
}

export interface FocusItem {
  title: string;
  why: string;
  topic?: string;
}

export interface BrainOverview {
  summary: string;
  focus: FocusItem[];
  exam_patterns: SourcedPoint[];
  professor_said: SourcedPoint[];
  pitfalls: SourcedPoint[];
  rumors: SourcedPoint[];
  gaps: string[];
}

export interface BrainTopic {
  id: string;
  title: string;
  /** 1–5: колку е важна темата за полагање. */
  importance: number;
  summary: string;
  key_points: string[];
  sources: string[];
}

export interface BrainQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  /** Индекси на точните одговори во `options` (повеќе = повеќе точни). */
  answer: number[];
  explanation: string;
  sources: string[];
}

export interface Brain {
  schema_version: number;
  id: string;
  subject: { code: string; name: string };
  updated: string;
  sources: BrainSource[];
  assessment: Assessment;
  overview: BrainOverview;
  staff: { name: string; role: string }[];
  topics: BrainTopic[];
  questions: BrainQuestion[];
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  courses: "Courses",
  past_exam: "Стар колоквиум / испит",
  question_bank: "База на прашања",
  discord_file: "Датотека од Discord",
  discord_chat: "Discord чат",
  friend_note: "Белешка од колега",
  timetable: "Распоред на ФИНКИ",
  claude: "Дополнето од Claude",
};

/** Колку му веруваме на изворот (за ознаките во прегледот). */
export const SOURCE_TRUST: Record<SourceType, "official" | "students" | "rumor" | "derived"> = {
  courses: "official",
  past_exam: "official",
  timetable: "official",
  question_bank: "students",
  discord_file: "students",
  friend_note: "students",
  discord_chat: "rumor",
  claude: "derived",
};

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];

// ---- проверка ----------------------------------------------------------------

class BrainError extends Error {}

type Obj = Record<string, unknown>;

function fail(path: string, message: string): never {
  throw new BrainError(`${path}: ${message}`);
}

function obj(v: unknown, path: string): Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(path, "треба објект");
  return v as Obj;
}

function str(v: unknown, path: string, { optional = false } = {}): string {
  if (v === undefined && optional) return undefined as unknown as string;
  if (typeof v !== "string" || !v.trim()) fail(path, "треба непразен текст");
  return v;
}

function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, "треба листа");
  return v;
}

function strings(v: unknown, path: string): string[] {
  return arr(v, path).map((s, i) => str(s, `${path}[${i}]`));
}

function int(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) fail(path, `треба цел број од ${min} до ${max}`);
  return v;
}

function unique(ids: string[], path: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(path, `ознаката „${id}“ се повторува`);
    seen.add(id);
  }
}

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function id(v: unknown, path: string): string {
  const s = str(v, path);
  if (!ID_RE.test(s)) fail(path, `„${s}“ не е валидна ознака (мали латинични букви, бројки, - и _)`);
  return s;
}

/**
 * Го проверува и враќа мозокот. Фрла грешка со патеката до проблемот
 * (на пр. „questions[3].answer: …“), за грешката во JSON да се најде веднаш.
 */
export function parseBrain(raw: unknown): Brain {
  const b = obj(raw, "brain");
  if (b.schema_version !== BRAIN_SCHEMA_VERSION) fail("schema_version", `треба ${BRAIN_SCHEMA_VERSION}`);
  const subject = obj(b.subject, "subject");
  const updated = str(b.updated, "updated");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) fail("updated", "треба датум YYYY-MM-DD");

  const sources: BrainSource[] = arr(b.sources, "sources").map((s, i) => {
    const o = obj(s, `sources[${i}]`);
    const type = o.type as SourceType;
    if (!SOURCE_TYPES.includes(type)) fail(`sources[${i}].type`, `непознат тип „${String(o.type)}“`);
    return { id: id(o.id, `sources[${i}].id`), type, title: str(o.title, `sources[${i}].title`), note: str(o.note, `sources[${i}].note`, { optional: true }) };
  });
  unique(sources.map((s) => s.id), "sources");
  const sourceIds = new Set(sources.map((s) => s.id));
  const refs = (v: unknown, path: string) => {
    const list = strings(v, path);
    for (const r of list) if (!sourceIds.has(r)) fail(path, `непознат извор „${r}“`);
    return list;
  };
  const points = (v: unknown, path: string): SourcedPoint[] =>
    arr(v, path).map((p, i) => {
      const o = obj(p, `${path}[${i}]`);
      return { text: str(o.text, `${path}[${i}].text`), sources: refs(o.sources, `${path}[${i}].sources`) };
    });

  const a = obj(b.assessment, "assessment");
  if (typeof a.confirmed !== "boolean") fail("assessment.confirmed", "треба true или false");
  const facts = (v: unknown, path: string) =>
    arr(v, path).map((f, i) => {
      const o = obj(f, `${path}[${i}]`);
      return { label: str(o.label, `${path}[${i}].label`), value: str(o.value, `${path}[${i}].value`) };
    });
  const parts: AssessmentPart[] = arr(a.parts, "assessment.parts").map((x, i) => {
    const p = `assessment.parts[${i}]`;
    const o = obj(x, p);
    return {
      id: id(o.id, `${p}.id`),
      name: str(o.name, `${p}.name`),
      points: o.points === null ? null : int(o.points, `${p}.points`, 0, 1000),
      min_percent: o.min_percent === null ? null : int(o.min_percent, `${p}.min_percent`, 0, 100),
      summary: str(o.summary, `${p}.summary`),
      facts: facts(o.facts, `${p}.facts`),
      steps: arr(o.steps, `${p}.steps`).map((st, j) => {
        const so = obj(st, `${p}.steps[${j}]`);
        return {
          title: str(so.title, `${p}.steps[${j}].title`),
          detail: str(so.detail, `${p}.steps[${j}].detail`, { optional: true }),
          when: str(so.when, `${p}.steps[${j}].when`, { optional: true }),
        };
      }),
      rules: strings(o.rules, `${p}.rules`),
      from_students: points(o.from_students, `${p}.from_students`),
      sources: refs(o.sources, `${p}.sources`),
    };
  });
  unique(parts.map((x) => x.id), "assessment.parts");
  let total: Assessment["total"] = null;
  if (a.total !== null) {
    const t = obj(a.total, "assessment.total");
    total = { points: int(t.points, "assessment.total.points", 1, 1000), min_percent: int(t.min_percent, "assessment.total.min_percent", 0, 100) };
  }
  const assessment: Assessment = {
    summary: str(a.summary, "assessment.summary"),
    total,
    parts,
    confirmed: a.confirmed,
    note: str(a.note, "assessment.note", { optional: true }),
    sources: refs(a.sources, "assessment.sources"),
  };

  const topics: BrainTopic[] = arr(b.topics, "topics").map((t, i) => {
    const o = obj(t, `topics[${i}]`);
    return {
      id: id(o.id, `topics[${i}].id`),
      title: str(o.title, `topics[${i}].title`),
      importance: int(o.importance, `topics[${i}].importance`, 1, 5),
      summary: str(o.summary, `topics[${i}].summary`),
      key_points: strings(o.key_points, `topics[${i}].key_points`),
      sources: refs(o.sources, `topics[${i}].sources`),
    };
  });
  unique(topics.map((t) => t.id), "topics");
  const topicIds = new Set(topics.map((t) => t.id));

  const ov = obj(b.overview, "overview");
  const overview: BrainOverview = {
    summary: str(ov.summary, "overview.summary"),
    focus: arr(ov.focus, "overview.focus").map((f, i) => {
      const o = obj(f, `overview.focus[${i}]`);
      const topic = o.topic === undefined ? undefined : str(o.topic, `overview.focus[${i}].topic`);
      if (topic && !topicIds.has(topic)) fail(`overview.focus[${i}].topic`, `непозната тема „${topic}“`);
      return { title: str(o.title, `overview.focus[${i}].title`), why: str(o.why, `overview.focus[${i}].why`), topic };
    }),
    exam_patterns: points(ov.exam_patterns, "overview.exam_patterns"),
    professor_said: points(ov.professor_said, "overview.professor_said"),
    pitfalls: points(ov.pitfalls, "overview.pitfalls"),
    rumors: points(ov.rumors, "overview.rumors"),
    gaps: strings(ov.gaps, "overview.gaps"),
  };

  const questions: BrainQuestion[] = arr(b.questions, "questions").map((q, i) => {
    const o = obj(q, `questions[${i}]`);
    const p = `questions[${i}]`;
    const topic = str(o.topic, `${p}.topic`);
    if (!topicIds.has(topic)) fail(`${p}.topic`, `непозната тема „${topic}“`);
    const options = strings(o.options, `${p}.options`);
    if (options.length < 2) fail(`${p}.options`, "треба барем два понудени одговори");
    unique(options, `${p}.options`);
    const answer = arr(o.answer, `${p}.answer`).map((n, j) => int(n, `${p}.answer[${j}]`, 0, options.length - 1));
    if (answer.length === 0) fail(`${p}.answer`, "треба барем еден точен одговор");
    if (new Set(answer).size !== answer.length) fail(`${p}.answer`, "одговорот се повторува");
    return {
      id: id(o.id, `${p}.id`),
      topic,
      question: str(o.question, `${p}.question`),
      options,
      answer: [...answer].sort((x, y) => x - y),
      explanation: str(o.explanation, `${p}.explanation`),
      sources: refs(o.sources, `${p}.sources`),
    };
  });
  unique(questions.map((q) => q.id), "questions");

  return {
    schema_version: BRAIN_SCHEMA_VERSION,
    id: id(b.id, "id"),
    subject: { code: str(subject.code, "subject.code"), name: str(subject.name, "subject.name") },
    updated,
    sources,
    assessment,
    overview,
    staff: arr(b.staff, "staff").map((s, i) => {
      const o = obj(s, `staff[${i}]`);
      return { name: str(o.name, `staff[${i}].name`), role: str(o.role, `staff[${i}].role`) };
    }),
    topics,
    questions,
  };
}

/** Минимум поени за дел: 30% од 70 → 21. */
export function minPoints(points: number | null, minPercent: number | null): number | null {
  if (points === null || minPercent === null) return null;
  return Math.ceil((points * minPercent) / 100);
}

/** „1 поен“, „21 поен“, „15 поени“, „11 поени“. */
export function pointsLabel(n: number): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? "поен" : "поени"}`;
}

// ---- напредок -----------------------------------------------------------------
// Истиот систем како старата апликација (src/lib/quiz): Главен сет → 2 точни по ред → Совладани
// → уште 2 точни по ред → Готови; погрешен одговор → Погрешни; 3 погрешни вкупно → Tainted.

/** Напредок за едно прашање (во .mozokce/progress.json, по мозок). */
export interface QuestionProgressRow {
  question_id: string;
  in_wrong: boolean;
  flagged: boolean;
  mastery_streak: number;
  completed_streak: number;
  tainted: boolean;
  wrong_strikes: number;
  redemption: number;
}


/** Ред од базата → напредок за правилата од src/lib/quiz (картичка = прашање, дек = мозок). */
export function rowToProgress(row: QuestionProgressRow | undefined, questionId: string, brainId: string): Progress {
  const p = emptyProgress({ id: questionId, deck_id: brainId });
  if (!row) return p;
  return {
    ...p,
    in_wrong: row.in_wrong,
    flagged: row.flagged,
    mastery_streak: row.mastery_streak,
    completed_streak: row.completed_streak,
    tainted: row.tainted,
    wrong_strikes: row.wrong_strikes,
    redemption: row.redemption,
  };
}

export function progressToRow(p: Progress, questionId: string): QuestionProgressRow {
  return {
    question_id: questionId,
    in_wrong: p.in_wrong,
    flagged: p.flagged,
    mastery_streak: p.mastery_streak,
    completed_streak: p.completed_streak,
    tainted: p.tainted,
    wrong_strikes: p.wrong_strikes,
    redemption: p.redemption,
  };
}

export function progressMapOf(brainId: string, questions: Pick<BrainQuestion, "id">[], rows: QuestionProgressRow[]): ProgressMap {
  const byId = new Map(rows.map((r) => [r.question_id, r]));
  const map: ProgressMap = {};
  for (const q of questions) {
    const row = byId.get(q.id);
    if (row) map[q.id] = rowToProgress(row, q.id, brainId);
  }
  return map;
}

/** Една состојба по прашање (за лентата и точките); сетовите погоре можат да се преклопуваат. */
export type QuestionState = "completed" | "mastered" | "learning" | "wrong" | "new";

export const STATE_LABELS: Record<QuestionState, string> = {
  completed: "Готови",
  mastered: "Совладани",
  learning: "Се учат",
  wrong: "Погрешни",
  new: "Нови",
};

export function questionState(p: Progress | undefined): QuestionState {
  if (!p) return "new";
  if (isCompleted(p)) return "completed";
  if (isMastered(p)) return "mastered";
  if (p.in_wrong || p.tainted) return "wrong";
  if (p.mastery_streak > 0 || p.completed_streak > 0 || p.wrong_strikes > 0) return "learning";
  return "new";
}

export interface ProgressSummary {
  total: number;
  /** Колку прашања има во секој сет (како копчињата во старата апликација). */
  sets: DeckCounts;
  states: Record<QuestionState, number>;
  /** Совладани + Готови. */
  done: number;
  byTopic: Record<string, { total: number; done: number }>;
}

export function summarizeProgress(brain: Pick<Brain, "id" | "questions">, rows: QuestionProgressRow[]): ProgressSummary {
  const map = progressMapOf(brain.id, brain.questions, rows);
  const states: Record<QuestionState, number> = { completed: 0, mastered: 0, learning: 0, wrong: 0, new: 0 };
  const byTopic: ProgressSummary["byTopic"] = {};
  for (const q of brain.questions) {
    const state = questionState(map[q.id]);
    states[state]++;
    const t = (byTopic[q.topic] ??= { total: 0, done: 0 });
    t.total++;
    if (state === "completed" || state === "mastered") t.done++;
  }
  return {
    total: brain.questions.length,
    sets: deckCounts(brain.questions.map((q) => ({ id: q.id, deck_id: brain.id })), map),
    states,
    done: states.completed + states.mastered,
    byTopic,
  };
}
