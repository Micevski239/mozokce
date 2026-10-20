"use client";

import { CalendarX2, MapPin } from "lucide-react";
import { eventColor, isImportant, KIND_ICONS, type SubjectRef } from "@/components/calendar-ui";
import { EmptyState } from "@/components/ui";
import { countdown, formatDayLong, formatTimeRange, KIND_SHORT, type Occurrence } from "@/lib/calendar";

/** Листа по денови (најпрегледно на телефон). */
export function Agenda({
  occurrences,
  today,
  subjects,
  onSelect,
  emptyHint,
}: {
  occurrences: Occurrence[];
  today: string;
  subjects: Map<string, SubjectRef>;
  onSelect: (o: Occurrence) => void;
  emptyHint: string;
}) {
  const days = new Map<string, Occurrence[]>();
  for (const o of occurrences) days.set(o.date, [...(days.get(o.date) ?? []), o]);

  if (days.size === 0) {
    return (
      <div className="glass">
        <EmptyState icon={<CalendarX2 size={24} strokeWidth={1.75} />} title="Нема активности">
          {emptyHint}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[...days.entries()].map(([date, items]) => (
        <section key={date} className="glass overflow-hidden">
          <header
            className={`flex items-baseline justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5 ${date === today ? "bg-accent-soft" : ""}`}
          >
            <h3 className="display text-[15px] font-semibold">{formatDayLong(date)}</h3>
            <span className={`font-mono text-xs ${date === today ? "font-semibold text-accent-2" : "text-ink-3"}`}>{countdown(date, today)}</span>
          </header>
          <ul className="divide-y divide-[var(--line)]">
            {items.map((o) => {
              const subject = o.event.subject_id ? subjects.get(o.event.subject_id) : undefined;
              const Icon = KIND_ICONS[o.event.kind];
              const color = eventColor(o.event);
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(o)}
                    className="grid w-full grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--pill-hover)] sm:grid-cols-[6.5rem_minmax(0,1fr)]"
                  >
                    <span className="pt-0.5 font-mono text-[12px] font-semibold text-ink-2">{formatTimeRange(o)}</span>
                    <span className="flex min-w-0 gap-3">
                      <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: color }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 font-semibold leading-snug">{o.event.title}</span>
                          {isImportant(o.event) && <span className="chip shrink-0 !text-danger">{KIND_SHORT[o.event.kind]}</span>}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
                          <span className="flex items-center gap-1">
                            <Icon size={13} style={{ color }} /> {KIND_SHORT[o.event.kind]}
                          </span>
                          {subject && <span className="font-medium">{subject.code || subject.name}</span>}
                          {o.event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {o.event.location}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
