import Link from "next/link";
import { countdown, formatDayShort, formatTimeRange, type Occurrence } from "@/lib/calendar";
import { eventColor, isImportant, KIND_ICONS, type SubjectRef } from "./calendar-ui";

/** Кратка листа термини (почетна, преглед на предмет). Секој води до денот во календарот. */
export function ScheduleList({
  items,
  today,
  subjects,
  showDate = true,
}: {
  items: Occurrence[];
  today: string;
  subjects?: Map<string, SubjectRef>;
  showDate?: boolean;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((o) => {
        const Icon = KIND_ICONS[o.event.kind];
        const color = eventColor(o.event);
        const subject = o.event.subject_id ? subjects?.get(o.event.subject_id) : undefined;
        const important = isImportant(o.event);
        return (
          <li key={o.key}>
            <Link
              href={`/calendar?view=day&date=${o.date}`}
              className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[var(--pill-hover)]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{o.event.title}</span>
                <span className="block truncate font-mono text-[11px] text-ink-3">
                  {showDate && `${formatDayShort(o.date)} · `}
                  {formatTimeRange(o)}
                  {subject && ` · ${subject.code || subject.name}`}
                </span>
              </span>
              {important && o.date !== today && (
                <span className={`chip shrink-0 !px-2 !py-0.5 ${countdown(o.date, today).match(/^(утре|за [1-3] ден)/) ? "!text-danger" : ""}`}>
                  {countdown(o.date, today)}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
