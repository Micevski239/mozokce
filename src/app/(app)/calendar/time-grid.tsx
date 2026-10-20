"use client";

import type { MouseEvent } from "react";
import { eventColor, eventStyle, isImportant, KIND_ICONS, subjectLabel, type SubjectRef } from "@/components/calendar-ui";
import {
  formatMinutes,
  formatTimeRange,
  hourRange,
  isTimed,
  layoutOverlaps,
  WEEKDAY_SHORT,
  weekday,
  type Occurrence,
} from "@/lib/calendar";

interface Props {
  days: string[];
  occurrences: Occurrence[];
  today: string;
  nowMinutes: number | null;
  subjects: Map<string, SubjectRef>;
  onSelect: (o: Occurrence) => void;
  onCreate: (date: string, minutes: number) => void;
  onPickDay?: (date: string) => void;
}

/** Мрежа со часови за еден или повеќе денови (приказ Недела / Ден). */
export function TimeGrid({ days, occurrences, today, nowMinutes, subjects, onSelect, onCreate, onPickDay }: Props) {
  const single = days.length === 1;
  const HOUR = single ? 64 : 56;
  const [lo, hi] = hourRange(occurrences);
  const height = (hi - lo) * HOUR;
  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  const untimed = occurrences.filter((o) => !isTimed(o));
  const byDay = (date: string) => occurrences.filter((o) => o.date === date);

  const clickSlot = (date: string) => (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const minutes = lo * 60 + Math.floor((y / HOUR) * 2) * 30;
    onCreate(date, Math.min(minutes, 23 * 60));
  };

  return (
    <div className="glass overflow-hidden">
      {/* Заглавие со денови (во приказ „Ден“ денот е веќе избран во лентата над мрежата) */}
      <div className={`grid border-b border-[var(--line)] ${single ? "hidden" : ""}`} style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((date) => {
          const isToday = date === today;
          const weekend = weekday(date) >= 5;
          const content = (
            <>
              <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${isToday ? "text-accent-2" : "text-ink-3"}`}>
                {WEEKDAY_SHORT[weekday(date)]}
              </span>
              <span
                className={`display flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-lg font-semibold ${
                  isToday ? "bg-accent text-white" : weekend ? "text-ink-3" : ""
                }`}
              >
                {Number(date.slice(8))}
              </span>
            </>
          );
          return onPickDay && !single ? (
            <button
              key={date}
              type="button"
              onClick={() => onPickDay(date)}
              className="flex flex-col items-center gap-0.5 border-l border-[var(--line)] py-2.5 transition hover:bg-[var(--pill-hover)]"
              title="Отвори го денот"
            >
              {content}
            </button>
          ) : (
            <div key={date} className="flex flex-col items-center gap-0.5 border-l border-[var(--line)] py-2.5">
              {content}
            </div>
          );
        })}
      </div>

      {/* Рокови и целодневни активности */}
      {untimed.length > 0 && (
        <div className="grid border-b border-[var(--line)] bg-[var(--fill-bg)]" style={{ gridTemplateColumns: cols }}>
          <div className="flex items-start justify-end px-2 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Рокови
          </div>
          {days.map((date) => (
            <div key={date} className="min-w-0 space-y-1 border-l border-[var(--line)] p-1.5">
              {untimed
                .filter((o) => o.date === date)
                .map((o) => {
                  const Icon = KIND_ICONS[o.event.kind];
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => onSelect(o)}
                      className="flex w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[12px] font-medium transition hover:brightness-105"
                      style={eventStyle(o.event)}
                      title={`${o.event.title} · ${formatTimeRange(o)}`}
                    >
                      <Icon size={12} className="shrink-0" style={{ color: eventColor(o.event) }} />
                      <span className="truncate">{o.event.title}</span>
                      {o.start !== null && !single && <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-ink-3 xl:inline">{formatMinutes(o.start)}</span>}
                      {single && <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-3">{formatTimeRange(o)}</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {/* Часови */}
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div className="relative" style={{ height }}>
          {Array.from({ length: hi - lo }, (_, i) => (
            <span
              key={i}
              className={`absolute right-2 font-mono text-[11px] text-ink-3 ${i === 0 ? "translate-y-1" : "-translate-y-1/2"}`}
              style={{ top: i * HOUR }}
            >
              {String(lo + i).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((date) => {
          const isToday = date === today;
          const placed = layoutOverlaps(byDay(date));
          return (
            <div
              key={date}
              onClick={clickSlot(date)}
              className={`relative cursor-cell border-l border-[var(--line)] ${isToday ? "bg-accent-soft/60" : weekday(date) >= 5 ? "bg-[var(--fill-bg)]" : ""}`}
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px ${HOUR}px)`,
              }}
              title="Клик за нова активност"
            >
              {placed.map(({ item: o, column, columns }) => {
                const top = ((o.start! - lo * 60) / 60) * HOUR;
                const h = Math.max(((o.end! - o.start!) / 60) * HOUR - 2, 22);
                const subject = o.event.subject_id ? subjects.get(o.event.subject_id) : undefined;
                const label = subjectLabel(subject);
                const Icon = KIND_ICONS[o.event.kind];
                const important = isImportant(o.event);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onSelect(o)}
                    className={`absolute overflow-hidden rounded-lg border px-2 py-1 text-left transition hover:z-10 hover:brightness-105 hover:shadow-lg ${
                      important ? "ring-1 ring-danger/60" : ""
                    }`}
                    style={{
                      ...eventStyle(o.event),
                      top: top + 1,
                      height: h,
                      left: `calc(${(column / columns) * 100}% + 3px)`,
                      width: `calc(${100 / columns}% - 6px)`,
                    }}
                    title={`${o.event.title} · ${formatTimeRange(o)}${label ? ` · ${label}` : ""}${o.event.location ? ` · ${o.event.location}` : ""}`}
                  >
                    {h < 40 ? (
                      <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-tight">
                        <span className="shrink-0 font-mono text-[10px] text-ink-2">{formatMinutes(o.start!)}</span>
                        <span className="truncate font-semibold">{o.event.title}</span>
                      </span>
                    ) : (
                      <span className="flex h-full min-w-0 flex-col gap-0.5">
                        <span className="flex min-w-0 items-start gap-1">
                          <span className={`min-w-0 flex-1 font-semibold leading-tight [overflow-wrap:anywhere] ${h >= 76 ? "line-clamp-2" : "truncate"} text-[12.5px]`}>
                            {o.event.title}
                          </span>
                          {important && <Icon size={12} className="mt-0.5 shrink-0 text-danger" />}
                        </span>
                        <span className="truncate font-mono text-[10.5px] text-ink-2">{formatTimeRange(o)}</span>
                        {h >= 64 && (label || o.event.location) && (
                          <span className="truncate text-[11px] text-ink-2">
                            {[label, o.event.location].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}

              {isToday && nowMinutes !== null && nowMinutes >= lo * 60 && nowMinutes <= hi * 60 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: ((nowMinutes - lo * 60) / 60) * HOUR }}
                  aria-hidden
                >
                  <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-danger" />
                  <span className="h-0.5 flex-1 bg-danger" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
