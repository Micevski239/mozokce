"use client";

import { ArrowRight, Check, Eye, Flag, Play, RotateCcw, ShieldAlert, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgressBar, SourceChips, STATE_COLORS, StateLegend } from "@/components/brain-ui";
import { Panel } from "@/components/ui";
import {
  progressMapOf,
  progressToRow,
  questionState,
  STATE_LABELS,
  summarizeProgress,
  type Brain,
  type BrainQuestion,
  type QuestionProgressRow,
} from "@/lib/brain";
import { EMPTY_MESSAGES, MODE_LABELS, shuffled } from "@/lib/quiz/deck";
import {
  applyAnswer,
  completedToMastered,
  emptyProgress,
  isCompleted,
  isEmptyProgress,
  isMastered,
  resetMastery,
} from "@/lib/quiz/progress";
import { choiceLabel, progressStatus } from "@/lib/quiz/text";
import type { DeckMode, Progress } from "@/lib/quiz/types";
import { saveQuestionProgress } from "./actions";

/** Прашање во сесија; `order[i]` е индексот во `q.options` на i-тиот прикажан одговор. */
interface Item {
  q: BrainQuestion;
  order: number[];
}

interface Answer {
  selected: number[];
  ok: boolean;
  status: string;
}

interface Run {
  mode: DeckMode;
  items: Item[];
  index: number;
  answers: Record<string, Answer>;
}

/** Сетовите од старата апликација, по истиот редослед. */
const SETS: { mode: DeckMode; hint: string }[] = [
  { mode: "main", hint: "Прашањата што уште ги учиш." },
  { mode: "wrong_set", hint: "Погрешно одговорените. Точен одговор ги враќа во Главен сет." },
  { mode: "mastered", hint: "2 точни по ред во Главен сет. Уште 2 точни тука и одат во Готови." },
  { mode: "completed", hint: "Научени до крај." },
  { mode: "flagged", hint: "Прашањата што си ги означил." },
  { mode: "missed", hint: "Погрешните од последната сесија." },
];

function inSet(mode: DeckMode, p: Progress): boolean {
  switch (mode) {
    case "main":
      return !isMastered(p) && !isCompleted(p) && !p.tainted;
    case "wrong_set":
      return p.in_wrong;
    case "mastered":
      return isMastered(p) && !isCompleted(p);
    case "completed":
      return isCompleted(p);
    case "flagged":
      return p.flagged;
    case "missed":
      return false;
  }
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Квизот на мозокот, со системот од старата апликација: Главен сет, Погрешни, Совладани,
 * Готови, Означени, Пропуштени и Tainted. Прашањата се исти за сите (brain.json, во git),
 * а напредокот е личен: .mozokce/progress.json на овој компјутер.
 */
export function QuestionPractice({
  brain,
  initialRows,
}: {
  brain: Pick<Brain, "id" | "sources" | "topics" | "questions">;
  initialRows: QuestionProgressRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, QuestionProgressRow>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.question_id, r])),
  );
  const [topic, setTopic] = useState("all");
  const [view, setView] = useState<"home" | "list" | "tainted">("home");
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"mastered" | "all" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rowList = Object.values(rows);
  const map = progressMapOf(brain.id, brain.questions, rowList);
  const progressOf = (q: BrainQuestion) => map[q.id] ?? emptyProgress({ id: q.id, deck_id: brain.id });
  const topicTitle = new Map(brain.topics.map((t) => [t.id, t.title]));
  const pool = topic === "all" ? brain.questions : brain.questions.filter((q) => q.topic === topic);
  const summary = summarizeProgress({ id: brain.id, questions: pool }, rowList);
  const missedInPool = pool.filter((q) => missed.includes(q.id));
  const tainted = pool.filter((q) => progressOf(q).tainted);

  const listFor = (mode: DeckMode) => (mode === "missed" ? missedInPool : pool.filter((q) => inSet(mode, progressOf(q))));
  const countFor = (mode: DeckMode): number =>
    mode === "missed"
      ? missedInPool.length
      : mode === "wrong_set"
        ? summary.sets.wrong_set
        : mode === "main"
          ? summary.sets.main
          : mode === "mastered"
            ? summary.sets.mastered
            : mode === "completed"
              ? summary.sets.completed
              : summary.sets.flagged;

  /** Ги запишува промените во состојбата и во .mozokce/progress.json; празните редови се бришат. */
  async function save(changes: { id: string; p: Progress }[]) {
    if (changes.length === 0) return;
    setRows((prev) => {
      const copy = { ...prev };
      for (const c of changes) {
        if (isEmptyProgress(c.p)) delete copy[c.id];
        else copy[c.id] = progressToRow(c.p, c.id);
      }
      return copy;
    });
    const { error } = await saveQuestionProgress(
      brain.id,
      changes.map((c) => ({ id: c.id, row: isEmptyProgress(c.p) ? null : progressToRow(c.p, c.id) })),
    ).catch(() => ({ error: "x" }));
    setSaveError(error ? "Напредокот не се зачува. Освежи ја страницата и обиди се пак." : null);
  }

  function start(mode: DeckMode) {
    const list = listFor(mode);
    if (list.length === 0) return;
    setRun({ mode, items: shuffled(list).map((q) => ({ q, order: shuffled(q.options.map((_, i) => i)) })), index: 0, answers: {} });
    setSelected([]);
    setSaveError(null);
    setConfirm(null);
  }

  const item = run && run.index < run.items.length ? run.items[run.index] : null;
  const answer = item ? run?.answers[item.q.id] : undefined;
  const multi = item ? item.q.answer.length > 1 : false;

  function submit(choice: number[]) {
    if (!run || !item || answer || choice.length === 0) return;
    const q = item.q;
    const ok = sameSet(
      choice.map((i) => item.order[i]),
      q.answer,
    );
    const next = applyAnswer(progressOf(q), run.mode, ok);
    setRun({ ...run, answers: { ...run.answers, [q.id]: { selected: choice, ok, status: progressStatus(run.mode, next, ok) } } });
    void save([{ id: q.id, p: next }]);
  }

  function pick(i: number) {
    if (!item || answer) return;
    // Како во старата апликација: со еден точен одговор кликот веднаш одговара.
    if (!multi) {
      setSelected([i]);
      submit([i]);
      return;
    }
    setSelected((sel) => (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]));
  }

  function finish(r: Run) {
    setMissed(r.items.filter((it) => r.answers[it.q.id] && !r.answers[it.q.id].ok).map((it) => it.q.id));
    router.refresh();
  }

  function next() {
    if (!run) return;
    const index = run.index + 1;
    const r = { ...run, index };
    setRun(r);
    setSelected([]);
    if (index >= run.items.length) finish(r);
  }

  /** „Прекини“: оди на резиме со одговорените досега. */
  function stop() {
    if (!run) return;
    const r = { ...run, index: run.items.length };
    setRun(r);
    finish(r);
  }

  function toggleFlag(q: BrainQuestion) {
    const p = progressOf(q);
    void save([{ id: q.id, p: { ...p, flagged: !p.flagged } }]);
  }

  function backToMastered(q: BrainQuestion) {
    void save([{ id: q.id, p: completedToMastered(progressOf(q)) }]);
    next();
  }

  function resetSets(kind: "mastered" | "all") {
    const changes = pool.flatMap((q) => {
      const p = map[q.id];
      if (!p) return [];
      if (kind === "all") return [{ id: q.id, p: emptyProgress({ id: q.id, deck_id: brain.id }) }];
      return isMastered(p) || isCompleted(p) ? [{ id: q.id, p: resetMastery(p) }] : [];
    });
    void save(changes);
    setConfirm(null);
    router.refresh();
  }

  function clearTainted(qs: BrainQuestion[]) {
    void save(qs.map((q) => ({ id: q.id, p: { ...progressOf(q), tainted: false, wrong_strikes: 0, redemption: 0 } })));
  }

  // Тастатура: 1–9 избира одговор, Enter поднесува / оди на следно.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= item.order.length) {
        e.preventDefault();
        pick(n - 1);
      } else if (e.key === "Enter" && !target?.closest("button, a")) {
        e.preventDefault();
        if (answer) next();
        else submit(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const topicChips = (
    <div className="scroll-x -mx-1 flex gap-1.5 px-1 pb-1 md:flex-wrap">
      {[{ id: "all", title: "Сите теми" }, ...brain.topics].map((t) => {
        const n = t.id === "all" ? brain.questions.length : brain.questions.filter((q) => q.topic === t.id).length;
        if (n === 0) return null;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTopic(t.id)}
            aria-pressed={topic === t.id}
            className={`chip shrink-0 !py-1.5 normal-case !tracking-normal ${topic === t.id ? "chip-accent" : "hover:!border-[var(--accent-line)]"}`}
          >
            {t.title} <span className="font-mono opacity-70">{n}</span>
          </button>
        );
      })}
    </div>
  );

  const errorLine = saveError && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{saveError}</p>;

  // ---- сесија: прашање ----
  if (run && item) {
    const q = item.q;
    const flagged = progressOf(q).flagged;
    return (
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-accent normal-case !tracking-normal">{MODE_LABELS[run.mode]}</span>
          <span className="kicker">
            {run.index + 1} / {run.items.length}
          </span>
          <span className="chip min-w-0 max-w-full normal-case !tracking-normal">
            <span className="min-w-0 truncate">{topicTitle.get(q.topic)}</span>
          </span>
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleFlag(q)}
              aria-pressed={flagged}
              className={`btn btn-ghost !min-h-8 !px-3 text-xs ${flagged ? "!text-warn" : ""}`}
            >
              <Flag size={14} fill={flagged ? "currentColor" : "none"} /> {flagged ? "Означено" : "Означи"}
            </button>
            <button type="button" onClick={stop} className="btn btn-ghost !min-h-8 !px-3 text-xs">
              <X size={14} /> Прекини
            </button>
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(run.index / run.items.length) * 100}%` }} />
        </div>

        <h2 className="mt-5 text-lg font-semibold leading-snug sm:text-xl">{q.question}</h2>
        {multi && <p className="mt-1.5 text-sm text-accent-2">Повеќе точни одговори: означи ги сите, па Поднеси.</p>}

        <ul className="mt-4 space-y-2">
          {item.order.map((orig, i) => {
            const isSel = (answer?.selected ?? selected).includes(i);
            const isRight = q.answer.includes(orig);
            let state = "";
            if (!answer) state = isSel ? "!border-[var(--accent)] !bg-accent-soft" : "";
            else if (isRight) state = "!border-[var(--success)] !bg-success-soft";
            else if (isSel) state = "!border-[var(--danger)] !bg-danger-soft";
            else state = "opacity-55";
            return (
              <li key={orig}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  disabled={!!answer}
                  aria-pressed={isSel}
                  className={`fill flex w-full items-start gap-3 p-3 text-left disabled:cursor-default ${state}`}
                >
                  <span className="keycap mt-0.5 shrink-0">{i + 1}</span>
                  <span className="min-w-0 flex-1 leading-snug">{q.options[orig]}</span>
                  {answer && isRight && !isSel && <span className="mt-0.5 shrink-0 font-mono text-[11px] text-success">не го означи</span>}
                  {answer && isRight && <Check size={18} className="mt-0.5 shrink-0 text-success" />}
                  {answer && isSel && !isRight && <X size={18} className="mt-0.5 shrink-0 text-danger" />}
                </button>
              </li>
            );
          })}
        </ul>

        {answer && (
          <div className={`mt-4 rounded-2xl p-4 ${answer.ok ? "bg-success-soft" : "bg-danger-soft"}`}>
            <div className={`display font-semibold ${answer.ok ? "text-success" : "text-danger"}`}>{answer.ok ? "Точно" : "Погрешно"}</div>
            <p className="mt-1 text-sm leading-relaxed">{q.explanation}</p>
            {answer.status && <p className="mt-2 font-mono text-[11.5px] text-ink-2">{answer.status}</p>}
            <div className="mt-2">
              <SourceChips ids={q.sources} brain={brain} />
            </div>
          </div>
        )}

        {errorLine}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto hidden font-mono text-[11px] text-ink-3 sm:block">
            1–{item.order.length} {multi ? "означи · Enter поднеси" : "одговори"}
            {answer && " · Enter следен"}
          </span>
          {run.mode === "completed" && (
            <button type="button" onClick={() => backToMastered(q)} className="btn">
              <Undo2 size={16} /> Готови → Совладани
            </button>
          )}
          {answer ? (
            <button type="button" onClick={next} className="btn btn-primary">
              {run.index + 1 < run.items.length ? "Следен" : "Крај"} <ArrowRight size={16} />
            </button>
          ) : (
            multi && (
              <button type="button" onClick={() => submit(selected)} disabled={selected.length === 0} className="btn btn-primary">
                Поднеси
              </button>
            )
          )}
        </div>
      </Panel>
    );
  }

  // ---- сесија: резиме ----
  if (run) {
    const answered = run.items.filter((it) => run.answers[it.q.id]);
    const right = answered.filter((it) => run.answers[it.q.id].ok).length;
    const wrongItems = answered.filter((it) => !run.answers[it.q.id].ok);
    return (
      <Panel title={`Крај на сесијата · ${MODE_LABELS[run.mode]}`}>
        <div className="flex items-baseline gap-2">
          <span className="display text-4xl font-semibold">{right}</span>
          <span className="font-mono text-ink-3">/ {answered.length} точни</span>
          {answered.length > 0 && <span className="ml-auto font-mono text-ink-2">{Math.round((right / answered.length) * 100)}%</span>}
        </div>
        {wrongItems.length > 0 && (
          <div className="mt-5">
            <div className="kicker mb-2">Пропуштени прашања ({wrongItems.length})</div>
            <ul className="space-y-2">
              {wrongItems.map(({ q }) => (
                <li key={q.id} className="fill p-3 text-sm">
                  <p className="font-medium leading-snug">{q.question}</p>
                  <p className="mt-1 text-success">{q.answer.map((i) => q.options[i]).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {wrongItems.length > 0 && (
            <button type="button" onClick={() => start("missed")} className="btn btn-primary">
              <RotateCcw size={16} /> Повтори пропуштени
            </button>
          )}
          {(["main", "wrong_set", "mastered", "completed", "flagged"] as DeckMode[]).map((m) => (
            <button key={m} type="button" onClick={() => start(m)} disabled={countFor(m) === 0} className="btn">
              {MODE_LABELS[m]} ({countFor(m)})
            </button>
          ))}
          <button type="button" onClick={() => setRun(null)} className="btn btn-ghost">
            Назад
          </button>
        </div>
      </Panel>
    );
  }

  // ---- tainted ----
  if (view === "tainted") {
    return (
      <Panel
        title="Tainted прашања"
        action={
          <button type="button" onClick={() => setView("home")} className="btn btn-ghost !min-h-8 !px-3 text-xs">
            Назад
          </button>
        }
      >
        <p className="text-sm text-ink-2">
          По 3 вкупни погрешни одговори прашањето станува tainted и се крие од Главен сет. Се враќа со 2 точни по ред во Погрешни,
          или рачно со „Исчисти“.
        </p>
        {tainted.length === 0 ? (
          <p className="mt-4 text-sm text-success">Нема tainted прашања.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {tainted.map((q) => (
                <li key={q.id} className="fill flex items-start gap-3 p-3 text-sm">
                  <p className="min-w-0 flex-1 leading-snug">{q.question}</p>
                  <button type="button" onClick={() => clearTainted([q])} className="btn !min-h-8 shrink-0 !px-3 text-xs">
                    Исчисти
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => clearTainted(tainted)} className="btn mt-4">
              Исчисти ги сите Tainted
            </button>
          </>
        )}
        {errorLine}
      </Panel>
    );
  }

  // ---- листа со одговори ----
  if (view === "list") {
    return (
      <Panel
        title="Листа со одговори"
        action={
          <button type="button" onClick={() => setView("home")} className="btn btn-ghost !min-h-8 !px-3 text-xs">
            Назад
          </button>
        }
      >
        {topicChips}
        <ol className="mt-3 space-y-3">
          {pool.map((q, n) => {
            const state = questionState(map[q.id]);
            return (
              <li key={q.id} className="fill p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 font-mono text-xs text-ink-3">{n + 1}.</span>
                  <p className="min-w-0 flex-1 font-medium leading-snug">{q.question}</p>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLORS[state] }} title={STATE_LABELS[state]} />
                </div>
                <ul className="mt-2 space-y-1 pl-5 text-sm">
                  {q.options.map((o, i) => (
                    <li key={i} className={q.answer.includes(i) ? "font-medium text-success" : "text-ink-2"}>
                      {choiceLabel(i)}) {o}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 pl-5 text-xs leading-relaxed text-ink-3">{q.explanation}</p>
              </li>
            );
          })}
        </ol>
      </Panel>
    );
  }

  // ---- почеток: сетовите ----
  return (
    <Panel title="Прашања" action={<span className="chip normal-case !tracking-normal">{brain.questions.length} прашања</span>}>
      {topicChips}

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:items-center">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="display text-3xl font-semibold">{summary.done}</span>
            <span className="font-mono text-sm text-ink-3">/ {summary.total} научени (Совладани + Готови)</span>
          </div>
          <ProgressBar summary={summary} className="mt-3 h-2.5" />
        </div>
        <StateLegend states={summary.states} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SETS.filter((s) => s.mode !== "missed" || missedInPool.length > 0).map(({ mode, hint }) => {
          const n = countFor(mode);
          const main = mode === "main";
          return (
            <button
              key={mode}
              type="button"
              onClick={() => start(mode)}
              disabled={n === 0}
              title={n === 0 ? EMPTY_MESSAGES[mode] : hint}
              className={`fill flex flex-col items-start gap-1 p-3 text-left disabled:cursor-not-allowed disabled:opacity-55 ${
                main ? "!border-[var(--accent)] !bg-accent-soft" : ""
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-mono text-[13px] font-semibold">{MODE_LABELS[mode]}</span>
                {main && n > 0 && <Play size={14} className="text-accent-2" />}
              </span>
              <span className="display text-2xl font-semibold">{n}</span>
              <span className="text-[12px] leading-snug text-ink-3">{n === 0 ? EMPTY_MESSAGES[mode] : hint}</span>
            </button>
          );
        })}
      </div>

      {tainted.length > 0 && (
        <button
          type="button"
          onClick={() => setView("tainted")}
          className="fill mt-2 flex w-full items-center gap-3 !border-l-[3px] !border-l-[color:var(--warn)] p-3 text-left text-sm"
        >
          <ShieldAlert size={18} className="shrink-0 text-warn" />
          <span className="flex-1">
            <b>Tainted: {tainted.length}</b>{" "}
            <span className="text-ink-2">— скриени од Главен сет по 3 погрешни. Поправи ги во Погрешни или исчисти ги.</span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-ink-3" />
        </button>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setView("list")} className="btn btn-ghost">
          <Eye size={16} /> Листа со одговори
        </button>
        {confirm ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-danger">
              {confirm === "mastered" ? "Совладаните и Готовите се враќаат во Главен сет" : "Целиот напредок се брише"}
              {topic !== "all" && " (само за избраната тема)"}. Сигурно?
            </span>
            <button type="button" onClick={() => resetSets(confirm)} className="btn btn-danger !min-h-8 !px-3 text-xs">
              Да
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="btn !min-h-8 !px-3 text-xs">
              Не
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirm("mastered")}
              disabled={summary.sets.mastered + summary.sets.completed === 0}
              className="btn btn-ghost"
            >
              <RotateCcw size={16} /> Ресетирај совладани
            </button>
            <button type="button" onClick={() => setConfirm("all")} disabled={rowList.length === 0} className="btn btn-ghost">
              Ресетирај го сиот напредок
            </button>
          </>
        )}
      </div>
      {errorLine}

      <details className="mt-4 text-xs leading-relaxed text-ink-3">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider">Како работи</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Точен одговор во Главен сет: +1 кон Совладани. По 2 точни по ред прашањето оди во Совладани.</li>
          <li>Во Совладани: уште 2 точни по ред и прашањето оди во Готови. Погрешен одговор го враќа во Главен сет.</li>
          <li>Погрешен одговор: прашањето оди во Погрешни (ако немало streak, инаку само се ресетира). Точен одговор во Погрешни го враќа во Главен сет.</li>
          <li>По 3 вкупни погрешни прашањето станува Tainted: се крие од Главен сет додека не се погоди 2 пати по ред во Погрешни.</li>
          <li>Пропуштени се погрешните од последната сесија. Означени се прашањата со знаменце.</li>
          <li>Со еден точен одговор кликот веднаш одговара; со повеќе точни ги означуваш, па Поднеси. Прашањата и одговорите се мешаат секој пат.</li>
        </ul>
      </details>
    </Panel>
  );
}
