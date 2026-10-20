"use client";

import { eventColor, isImportant, type SubjectRef } from "@/components/calendar-ui";
import { formatMinutes, monthGrid, WEEKDAY_SHORT, weekday, type Occurrence } from "@/lib/calendar";

const MAX_PILLS = 3;

/** Месечен приказ: на телефон точки во бојата на предметот, на поголем екран термини со час. */
export function MonthGrid({
  anchor,
  occurrences,
  today,
  subjects,
  onPickDay,
  onSelect,
}: {
  anchor: string;
  occurrences: Occurrence[];
  today: string;
  subjects: Map<string, SubjectRef>;
  onPickDay: (date: string) => void;
  onSelect: (o: Occurrence) => void;
}) {
  const days = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occurrences) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);

  return (
    <div className="glass overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--line)]">
        {WEEKDAY_SHORT.map((d, i) => (
          <div
            key={d}
            className={`py-2.5 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${i >= 5 ? "text-ink-3/70" : "text-ink-3"}`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const inMonth = date.startsWith(month);
          const isToday = date === today;
          const items = byDay.get(date) ?? [];
          const extra = items.length - MAX_PILLS;
          return (
            <div
              key={date}
              className={`flex min-h-[4.25rem] min-w-0 flex-col gap-1 p-1 sm:min-h-[6.5rem] sm:p-1.5 lg:min-h-[7.25rem] ${
                i % 7 !== 0 ? "border-l" : ""
              } ${i >= 7 ? "border-t" : ""} border-[var(--line)] ${!inMonth ? "bg-[var(--fill-bg)]/60" : weekday(date) >= 5 ? "bg-[var(--fill-bg)]" : ""}`}
            >
              <button
                type="button"
                onClick={() => onPickDay(date)}
                className={`flex h-7 w-7 items-center justify-center self-start rounded-full font-mono text-[13px] font-semibold transition ${
                  isToday ? "bg-accent text-white" : inMonth ? "hover:bg-[var(--pill-hover)]" : "text-ink-3/60 hover:bg-[var(--pill-hover)]"
                }`}
                title="Отвори го денот"
              >
                {Number(date.slice(8))}
              </button>

              {/* Телефон: точки */}
              {items.length > 0 && (
                <button type="button" onClick={() => onPickDay(date)} className="flex flex-wrap gap-1 px-1 sm:hidden" aria-label={`${items.length} активности`}>
                  {items.slice(0, 4).map((o) => (
                    <span
                      key={o.key}
                      className={`h-1.5 w-1.5 rounded-full ${isImportant(o.event) ? "ring-2 ring-danger/40" : ""}`}
                      style={{ background: eventColor(o.event) }}
                    />
                  ))}
                </button>
              )}

              {/* Таблет и десктоп: термини */}
              <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                {items.slice(0, MAX_PILLS).map((o) => {
                  const subject = o.event.subject_id ? subjects.get(o.event.subject_id) : undefined;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => onSelect(o)}
                      className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11.5px] leading-tight transition hover:bg-[var(--pill-hover)]"
                      title={o.event.title}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${isImportant(o.event) ? "ring-2 ring-danger/40" : ""}`}
                        style={{ background: eventColor(o.event) }}
                      />
                      {o.start !== null && <span className="hidden shrink-0 font-mono text-[10px] text-ink-3 lg:inline">{formatMinutes(o.start)}</span>}
                      <span className="truncate font-medium">{subject?.code ? `${subject.code} · ${o.event.title}` : o.event.title}</span>
                    </button>
                  );
                })}
                {extra > 0 && (
                  <button type="button" onClick={() => onPickDay(date)} className="px-1.5 text-left font-mono text-[11px] text-ink-3 hover:text-ink">
                    +{extra} уште
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
