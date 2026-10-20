"use client";

import { CalendarDays, Clock, MapPin, Pencil, Repeat, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { eventColor, isImportant, KIND_ICONS, type SubjectRef } from "@/components/calendar-ui";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui";
import { countdown, formatDayLong, formatTimeRange, KIND_LABELS, WEEKDAY_LONG, weekday, type Occurrence } from "@/lib/calendar";
import { formatDate } from "@/lib/materials";
import { deleteEvent, skipEventDate } from "./actions";

export function EventDetails({
  occurrence,
  subject,
  today,
  onClose,
  onEdit,
}: {
  occurrence: Occurrence | null;
  subject?: SubjectRef;
  today: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!occurrence) return null;
  const { event } = occurrence;
  const Icon = KIND_ICONS[event.kind];
  const color = eventColor(event);

  async function removeSeries() {
    setBusy(true);
    const { error } = await deleteEvent(event.id).catch(() => ({ error: "x" }));
    setBusy(false);
    if (error) return window.alert("Не може да се избрише.");
    onClose();
  }

  async function removeOne() {
    setBusy(true);
    const { error } = await skipEventDate(event.id, occurrence!.date).catch(() => ({ error: "x" }));
    setBusy(false);
    if (error) return window.alert("Не може да се избрише.");
    onClose();
  }

  const rows = [
    { icon: CalendarDays, text: `${formatDayLong(occurrence.date)} · ${countdown(occurrence.date, today)}` },
    { icon: Clock, text: formatTimeRange(occurrence) },
    event.repeat_weekly && {
      icon: Repeat,
      text: `Секој ${WEEKDAY_LONG[weekday(event.date)].toLowerCase()}${event.repeat_until ? ` до ${formatDate(event.repeat_until)}` : ""}`,
    },
    event.location && { icon: MapPin, text: event.location },
    event.notes && { icon: StickyNote, text: event.notes },
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  return (
    <Dialog open onClose={onClose} title={event.title} kicker={KIND_LABELS[event.kind]}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip normal-case !tracking-normal" style={{ color }}>
            <Icon size={13} /> {KIND_LABELS[event.kind]}
          </span>
          {subject ? (
            <Link href={`/subjects/${subject.id}`} className="chip normal-case !tracking-normal hover:!border-[var(--accent-line)]">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {subject.code ? `${subject.code} · ${subject.name}` : subject.name}
            </Link>
          ) : (
            <span className="chip normal-case !tracking-normal">Без предмет</span>
          )}
          {isImportant(event) && <span className="chip !text-danger">важно</span>}
        </div>

        <ul className="space-y-2.5">
          {rows.map(({ icon: RowIcon, text }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <RowIcon size={16} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="min-w-0 whitespace-pre-wrap break-words">{text}</span>
            </li>
          ))}
        </ul>

        {confirming ? (
          <div className="fill space-y-3 p-3">
            <p className="text-sm">{event.repeat_weekly ? "Што да се избрише?" : "Да се избрише оваа активност?"}</p>
            <div className="flex flex-wrap gap-2">
              {event.repeat_weekly && (
                <Button variant="danger" onClick={removeOne} disabled={busy}>
                  Само овој термин
                </Button>
              )}
              <Button variant="danger" onClick={removeSeries} disabled={busy}>
                {event.repeat_weekly ? "Сите термини" : "Избриши"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Откажи
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-3">
            <Button variant="ghost" className="hover:!text-danger" onClick={() => setConfirming(true)}>
              <Trash2 size={16} /> Избриши
            </Button>
            <Button variant="primary" onClick={onEdit}>
              <Pencil size={15} /> Уреди{event.repeat_weekly ? " серија" : ""}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
