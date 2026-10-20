import {
  SOURCE_TRUST,
  SOURCE_TYPE_LABELS,
  STATE_LABELS,
  type Brain,
  type ProgressSummary,
  type QuestionState,
  type SourcedPoint,
} from "@/lib/brain";

/** Делови за мозокот на предметот, заеднички за серверските и клиентските компоненти. */

export const STATE_ORDER: QuestionState[] = ["completed", "mastered", "learning", "wrong", "new"];

export const STATE_COLORS: Record<QuestionState, string> = {
  completed: "var(--success)",
  mastered: "color-mix(in oklab, var(--success) 45%, var(--accent))",
  learning: "var(--accent)",
  wrong: "var(--danger)",
  new: "var(--line-2)",
};

const TRUST_COLORS = {
  official: "var(--success)",
  students: "var(--accent)",
  rumor: "var(--warn)",
  derived: "var(--ink-3)",
} as const;

/** Ознаки за изворите на една ставка: тип на извор, обоен според довербата; целото име е во title. */
export function SourceChips({ ids, brain }: { ids: string[]; brain: Pick<Brain, "sources"> }) {
  const byId = new Map(brain.sources.map((s) => [s.id, s]));
  const sources = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (sources.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <span key={s.id} className="chip !px-2 !py-0.5 !text-[10px] normal-case !tracking-normal" title={s.note ? `${s.title}. ${s.note}` : s.title}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TRUST_COLORS[SOURCE_TRUST[s.type]] }} />
          {SOURCE_TYPE_LABELS[s.type]}
        </span>
      ))}
    </span>
  );
}

/** Листа точки со извори (што се паѓало, замки, гласини…). */
export function PointList({ points, brain, tone }: { points: SourcedPoint[]; brain: Pick<Brain, "sources">; tone?: "warn" }) {
  return (
    <ul className="space-y-2">
      {points.map((p, i) => (
        <li key={i} className={`fill p-3 ${tone === "warn" ? "!border-l-[3px] !border-l-[color:var(--warn)]" : ""}`}>
          <p className="text-sm leading-relaxed">{p.text}</p>
          <div className="mt-2">
            <SourceChips ids={p.sources} brain={brain} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Лента на напредок по состојба (готови, совладани, се учат, погрешни); остатокот се нови. */
export function ProgressBar({ summary, className = "h-2.5" }: { summary: Pick<ProgressSummary, "total" | "states">; className?: string }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-[var(--line)] ${className}`}>
      {STATE_ORDER.filter((s) => s !== "new").map((s) =>
        summary.states[s] > 0 ? (
          <span key={s} className="h-full" style={{ width: `${(summary.states[s] / Math.max(1, summary.total)) * 100}%`, background: STATE_COLORS[s] }} />
        ) : null,
      )}
    </div>
  );
}

export function StateLegend({ states }: { states: Record<QuestionState, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
      {STATE_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLORS[s] }} />
          <span className="flex-1 text-ink-2">{STATE_LABELS[s]}</span>
          <span className="font-mono text-ink">{states[s]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Точки за важноста на темата (1–5). */
export function Importance({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Важност ${value} од 5`} aria-label={`Важност ${value} од 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < value ? "var(--warn)" : "var(--line-2)" }} />
      ))}
    </span>
  );
}
