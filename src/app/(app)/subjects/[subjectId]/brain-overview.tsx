import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleQuestionMark,
  GraduationCap,
  Library,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Repeat,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Importance, PointList, ProgressBar, SourceChips, StateLegend } from "@/components/brain-ui";
import { ScheduleList } from "@/components/schedule-list";
import { Panel } from "@/components/ui";
import { minPoints, pointsLabel, type AssessmentPart, type Brain, type ProgressSummary } from "@/lib/brain";
import { formatDayShort, formatMinutes, timeToMinutes, weekday, WEEKDAY_LONG, type CalendarEvent, type Occurrence } from "@/lib/calendar";
import { TabLink } from "./subject-tabs";

function Title({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      {icon} {children}
    </span>
  );
}

/** Прв екран на предмет со мозок: сè важно за полагање на едно место, по редоследот од планот. */
export function BrainOverview({
  brain,
  summary,
  upcoming,
  weekly,
  subjectId,
  today,
}: {
  brain: Brain;
  summary: ProgressSummary;
  /** Колоквиуми, испити и рокови од календарот што следат. */
  upcoming: Occurrence[];
  /** Неделните термини (предавања, вежби) на предметот. */
  weekly: CalendarEvent[];
  subjectId: string;
  today: string;
}) {
  const { overview } = brain;
  const topics = new Map(brain.topics.map((t) => [t.id, t]));
  const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  const slots = [...weekly].sort(
    (a, b) => weekday(a.date) - weekday(b.date) || (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0),
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-[var(--gap)]">
        <Panel
          title={<Title icon={<Sparkles size={16} className="text-accent-2" />}>Накратко</Title>}
          action={<span className="chip normal-case !tracking-normal">мозок · {formatDayShort(brain.updated)}</span>}
        >
          <p className="text-[15px] leading-relaxed">{overview.summary}</p>
        </Panel>

        <AssessmentPanel brain={brain} />

        {overview.focus.length > 0 && (
          <Panel title={<Title icon={<Target size={16} className="text-accent-2" />}>На што да се фокусираш</Title>}>
            <ol className="space-y-2">
              {overview.focus.map((f, i) => {
                const topic = f.topic ? topics.get(f.topic) : undefined;
                const tp = f.topic ? summary.byTopic[f.topic] : undefined;
                return (
                  <li key={i} className="fill flex gap-3 p-3">
                    <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-2">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug">{f.title}</div>
                      <p className="mt-0.5 text-sm text-ink-2">{f.why}</p>
                      {topic && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                          <Importance value={topic.importance} />
                          {tp && (
                            <span>
                              научени {tp.done}/{tp.total} прашања
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}

        {overview.exam_patterns.length > 0 && (
          <Panel title={<Title icon={<Repeat size={16} className="text-accent-2" />}>Што се паѓало досега</Title>}>
            <PointList points={overview.exam_patterns} brain={brain} />
          </Panel>
        )}

        {overview.pitfalls.length > 0 && (
          <Panel title={<Title icon={<TriangleAlert size={16} className="text-warn" />}>Внимавај</Title>}>
            <PointList points={overview.pitfalls} brain={brain} tone="warn" />
          </Panel>
        )}

        {overview.professor_said.length > 0 && (
          <Panel title={<Title icon={<Megaphone size={16} className="text-accent-2" />}>Што рекол професорот</Title>}>
            <PointList points={overview.professor_said} brain={brain} />
          </Panel>
        )}

        {overview.rumors.length > 0 && (
          <Panel
            title={<Title icon={<MessagesSquare size={16} className="text-warn" />}>Гласини</Title>}
            action={<span className="chip normal-case !tracking-normal !text-warn">непотврдено</span>}
          >
            <PointList points={overview.rumors} brain={brain} />
          </Panel>
        )}

        {overview.gaps.length > 0 && (
          <Panel title={<Title icon={<CircleQuestionMark size={16} className="text-ink-2" />}>Што ни недостига</Title>}>
            <ul className="space-y-1.5 text-sm">
              {overview.gaps.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--line-2)]" />
                  <span className="text-ink-2">{g}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">Кога ќе ги најдеш, прати ги во сесија со Claude и мозокот ќе се надгради.</p>
          </Panel>
        )}
      </div>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-1">
        <Panel title={<Title icon={<ListChecks size={16} className="text-success" />}>Твој напредок</Title>}>
          <div className="flex items-baseline gap-2">
            <span className="display text-3xl font-semibold">{summary.done}</span>
            <span className="font-mono text-sm text-ink-3">/ {summary.total} научени</span>
            <span className="ml-auto font-mono text-sm text-ink-2">{pct}%</span>
          </div>
          <ProgressBar summary={summary} className="mt-3 h-2.5" />
          <div className="mt-4">
            <StateLegend states={summary.states} />
          </div>
          <ul className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
            {brain.topics.map((t) => {
              const tp = summary.byTopic[t.id];
              if (!tp) return null;
              return (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="truncate text-ink-2" title={t.title}>
                    {t.title}
                  </span>
                  <span className="text-right font-mono text-xs text-ink">
                    {tp.done}/{tp.total}
                  </span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full bg-success" style={{ width: `${(tp.done / tp.total) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <TabLink tab="questions" className="btn btn-primary mt-4 w-full">
            Вежбај прашања <ArrowRight size={16} />
          </TabLink>
          <p className="mt-2 text-center text-xs text-ink-3">Научени = Совладани + Готови. Напредокот е само твој, прашањата се исти за сите.</p>
        </Panel>

        <Panel
          title={<Title icon={<CalendarClock size={16} className="text-danger" />}>Што следи</Title>}
          action={
            <Link href={`/calendar?view=list&subject=${subjectId}`} className="flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink">
              Календар <ArrowRight size={13} />
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-2">
              Нема внесен датум за колоквиум, испит или рок.{" "}
              <Link href={`/calendar?subject=${subjectId}`} className="text-accent-2 underline">
                Додај го во календарот
              </Link>{" "}
              кога ќе се знае.
            </p>
          ) : (
            <ScheduleList items={upcoming} today={today} />
          )}
        </Panel>

        {(brain.staff.length > 0 || slots.length > 0) && (
          <Panel title={<Title icon={<Users size={16} className="text-accent-2" />}>Кој предава и кога</Title>}>
            {brain.staff.length > 0 && (
              <ul className="space-y-1.5 text-sm">
                {brain.staff.map((s) => (
                  <li key={s.name} className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-right text-xs text-ink-3">{s.role}</span>
                  </li>
                ))}
              </ul>
            )}
            {slots.length > 0 && (
              <ul className={`space-y-1.5 ${brain.staff.length > 0 ? "mt-3 border-t border-[var(--line)] pt-3" : ""}`}>
                {slots.map((e) => {
                  const start = timeToMinutes(e.start_time);
                  const end = timeToMinutes(e.end_time);
                  return (
                    <li key={e.id} className="fill px-3 py-2">
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="font-mono text-[11px] text-ink-3">
                        {WEEKDAY_LONG[weekday(e.date)]}
                        {start !== null && ` · ${formatMinutes(start)}${end !== null ? `–${formatMinutes(end)}` : ""}`}
                        {e.location && ` · ${e.location}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        <Panel title={<Title icon={<Library size={16} className="text-ink-2" />}>Од што е направен мозокот</Title>}>
          <ul className="space-y-2.5">
            {brain.sources.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChips ids={[s.id]} brain={brain} />
                </div>
                <div className="mt-1 font-medium leading-snug">{s.title}</div>
                {s.note && <div className="mt-0.5 text-xs text-ink-3">{s.note}</div>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Точката покажува доверба: зелено официјално, сино од студенти, жолто од чат, сиво дополнето од Claude.</p>
        </Panel>
      </aside>
    </div>
  );
}

/** „Како се полага“: табела со деловите (како на courses), па картичка за секој дел. */
function AssessmentPanel({ brain }: { brain: Brain }) {
  const a = brain.assessment;
  const totalPoints = a.total?.points ?? a.parts.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const minCell = (points: number | null, pct: number | null) => {
    const min = minPoints(points, pct);
    if (pct === null) return <span className="text-ink-3">—</span>;
    return (
      <>
        <span className="font-semibold">{pct}%</span>
        {min !== null && <span className="block font-mono text-[11px] text-ink-3">{pointsLabel(min)}</span>}
      </>
    );
  };
  return (
    <Panel
      title={<Title icon={<GraduationCap size={16} className="text-warn" />}>Како се полага</Title>}
      action={
        a.confirmed ? (
          <span className="chip normal-case !tracking-normal !text-success">официјално</span>
        ) : (
          <span className="chip normal-case !tracking-normal !text-warn">од колеги · непотврдено</span>
        )
      }
    >
      <p className="text-sm text-ink-2">{a.summary}</p>

      {a.parts.length > 0 && (
        <div className="fill mt-4 overflow-hidden" role="table" aria-label="Делови на оценката">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_4rem_6.5rem] gap-3 border-b border-[var(--line)] px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_5rem_9rem]">
            <span role="columnheader" className="kicker !text-[10px]">Дел</span>
            <span role="columnheader" className="kicker text-right !text-[10px]">Поени</span>
            <span role="columnheader" className="kicker text-right !text-[10px]">Минимум</span>
          </div>
          {a.parts.map((p) => (
            <div key={p.id} role="row" className="grid grid-cols-[minmax(0,1fr)_4rem_6.5rem] items-center gap-3 border-b border-[var(--line)] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_5rem_9rem]">
              <span role="cell" className="min-w-0">
                <span className="block font-medium leading-snug">{p.name}</span>
                {p.points !== null && totalPoints > 0 && (
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(p.points / totalPoints) * 100}%` }} />
                  </span>
                )}
              </span>
              <span role="cell" className="display text-right text-lg font-semibold">{p.points ?? "—"}</span>
              <span role="cell" className="text-right text-sm leading-tight">{minCell(p.points, p.min_percent)}</span>
            </div>
          ))}
          {a.total && (
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_4rem_6.5rem] items-center gap-3 bg-accent-soft px-4 py-3 sm:grid-cols-[minmax(0,1fr)_5rem_9rem]">
              <span role="cell" className="font-semibold">Вкупно за положување</span>
              <span role="cell" className="display text-right text-lg font-semibold">{a.total.points}</span>
              <span role="cell" className="text-right text-sm leading-tight">{minCell(a.total.points, a.total.min_percent)}</span>
            </div>
          )}
        </div>
      )}

      {a.parts.length > 0 && (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          {a.parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <SourceChips ids={[...new Set([...a.sources, ...a.parts.flatMap((p) => p.sources)])]} brain={brain} />
        {a.note && <span>{a.note}</span>}
      </div>
    </Panel>
  );
}

function PartCard({ part }: { part: AssessmentPart }) {
  const hasRight = part.steps.length > 0 || part.from_students.length > 0;
  return (
    <section className="fill p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="display font-semibold leading-snug">{part.name}</h3>
        {part.points !== null && <span className="chip chip-accent shrink-0 normal-case !tracking-normal">{pointsLabel(part.points)}</span>}
      </div>
      <p className="mt-1 text-sm text-ink-2">{part.summary}</p>

      {/* Лево: факти и правила. Десно: етапи и што велат колегите. На телефон една под друга. */}
      <div className={`mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-4 ${hasRight ? "lg:grid-cols-2" : ""}`}>
        <div className="min-w-0 space-y-4">
          {part.facts.length > 0 && (
            <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
              {part.facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="shrink-0 text-ink-3">{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {part.rules.length > 0 && (
            <div>
              <div className="kicker mb-2">Правила</div>
              <ul className="space-y-2">
                {part.rules.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-snug">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent-2" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {hasRight && (
          <div className="min-w-0 space-y-4">
            {part.steps.length > 0 && (
              <div>
                <div className="kicker mb-2.5">Етапи</div>
                <ol className="space-y-3">
                  {part.steps.map((st, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-2">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-snug">{st.title}</div>
                        {st.when && <div className="mt-0.5 font-mono text-[11px] font-semibold text-warn">{st.when}</div>}
                        {st.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{st.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {part.from_students.length > 0 && (
              <div className="rounded-2xl border border-dashed border-[color:var(--warn)] p-3">
                <div className="kicker mb-2 !text-warn">Од колеги · непотврдено</div>
                <ul className="space-y-1.5">
                  {part.from_students.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-snug">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                      <span>{pt.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
