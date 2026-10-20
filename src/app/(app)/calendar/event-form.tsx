"use client";

import { Repeat } from "lucide-react";
import { useState } from "react";
import { KIND_ICONS, type SubjectRef } from "@/components/calendar-ui";
import { Dialog } from "@/components/dialog";
import { Button, FormError, Input } from "@/components/ui";
import { addDays, formatMinutes, KIND_LABELS, KIND_ORDER, WEEKDAY_LONG, weekday, type CalendarEvent, type EventKind } from "@/lib/calendar";
import { saveEvent } from "./actions";

type TimeMode = "range" | "deadline" | "allday";

export interface EventDraft {
  date: string;
  start?: number;
  subjectId?: string | null;
}

const DEFAULT_MODE: Record<EventKind, TimeMode> = {
  lecture: "range",
  exercise: "range",
  lab: "range",
  homework: "deadline",
  kolokvium: "range",
  exam: "range",
  other: "range",
};
const WEEKLY_KINDS: EventKind[] = ["lecture", "exercise", "lab"];

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** Прозорец за нова активност или уредување на постоечка (кај повторувањата се менува целата серија). */
export function EventForm({
  open,
  onClose,
  subjects,
  event,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectRef[];
  event?: CalendarEvent | null;
  draft?: EventDraft | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={event ? "Уреди активност" : "Нова активност"} kicker="Календар" wide>
      {open && <EventFormBody key={event?.id ?? `${draft?.date}-${draft?.start}`} onClose={onClose} subjects={subjects} event={event} draft={draft} />}
    </Dialog>
  );
}

function EventFormBody({
  onClose,
  subjects,
  event,
  draft,
}: {
  onClose: () => void;
  subjects: SubjectRef[];
  event?: CalendarEvent | null;
  draft?: EventDraft | null;
}) {
  const initialKind: EventKind = event?.kind ?? "lecture";
  const start = draft?.start ?? 10 * 60;

  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(initialKind);
  const [subjectId, setSubjectId] = useState(event?.subject_id ?? draft?.subjectId ?? "");
  const [date, setDate] = useState(event?.date ?? draft?.date ?? "");
  const [mode, setMode] = useState<TimeMode>(
    event ? (event.start_time === null ? "allday" : event.end_time === null ? "deadline" : "range") : DEFAULT_MODE[initialKind],
  );
  const [startTime, setStartTime] = useState(event ? hhmm(event.start_time) : formatMinutes(start));
  const [endTime, setEndTime] = useState(event ? hhmm(event.end_time) : formatMinutes(Math.min(start + 120, 23 * 60 + 59)));
  const [deadlineTime, setDeadlineTime] = useState(event?.end_time === null && event.start_time ? hhmm(event.start_time) : "23:59");
  const [weekly, setWeekly] = useState(event?.repeat_weekly ?? WEEKLY_KINDS.includes(initialKind));
  const [until, setUntil] = useState(event?.repeat_until ?? (date ? addDays(date, 7 * 14) : ""));
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function chooseKind(k: EventKind) {
    setKind(k);
    if (!event) {
      setMode(DEFAULT_MODE[k]);
      setWeekly(WEEKLY_KINDS.includes(k));
    }
  }

  async function save() {
    if (!title.trim()) return setError("Внеси наслов.");
    if (!date) return setError("Избери датум.");
    if (mode === "range" && (!startTime || !endTime || endTime <= startTime)) return setError("Крајот мора да е после почетокот.");
    if (weekly && until && until < date) return setError("„Повторувај до“ мора да е после датумот.");
    setSaving(true);
    setError(null);
    const row = {
      title: title.trim(),
      kind,
      subject_id: subjectId || null,
      date,
      start_time: mode === "allday" ? null : mode === "deadline" ? deadlineTime : startTime,
      end_time: mode === "range" ? endTime : null,
      repeat_weekly: weekly,
      repeat_until: weekly ? until || null : null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    const { error: e } = await saveEvent(event?.id ?? null, row).catch(() => ({ error: "Не може да се зачува." }));
    setSaving(false);
    if (e) return setError(e);
    onClose();
  }

  const modes: { key: TimeMode; label: string }[] = [
    { key: "range", label: "Од – до" },
    { key: "deadline", label: "Рок" },
    { key: "allday", label: "Цел ден" },
  ];

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="kicker">Наслов</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="на пр. Лабораториски вежби 3" maxLength={120} autoFocus />
      </label>

      <div className="space-y-1.5">
        <span className="kicker">Тип</span>
        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => {
            const Icon = KIND_ICONS[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => chooseKind(k)}
                className={`chip !py-1.5 normal-case !tracking-normal ${kind === k ? "chip-accent" : "hover:!border-[var(--accent-line)]"}`}
              >
                <Icon size={13} /> {KIND_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="kicker">Предмет</span>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input appearance-none">
            <option value="">Без предмет</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code ? `${s.code} · ${s.name}` : s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="kicker">Датум</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="kicker">Време</span>
          <div className="fill flex gap-1 p-1" role="radiogroup">
            {modes.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition ${
                  mode === m.key ? "bg-[var(--pill-on)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.3)]" : "text-ink-3 hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {mode === "range" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-ink-3">Од</span>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} step={300} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-ink-3">До</span>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step={300} />
            </label>
          </div>
        )}
        {mode === "deadline" && (
          <label className="block space-y-1">
            <span className="text-xs text-ink-3">Рок до</span>
            <Input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} className="sm:!w-44" />
          </label>
        )}
      </div>

      <div className="fill space-y-3 p-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          <Repeat size={16} className="text-ink-3" />
          <span className="text-sm">
            Повторувај секоја недела{date ? ` (${WEEKDAY_LONG[weekday(date)].toLowerCase()})` : ""}
          </span>
        </label>
        {weekly && (
          <label className="flex flex-wrap items-center gap-2 pl-7">
            <span className="text-xs text-ink-3">до</span>
            <Input type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} className="!min-h-9 !w-auto !py-1.5" />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="kicker">Локација</span>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="на пр. Лаб 215, Барака 2" maxLength={80} />
        </label>
        <label className="block space-y-1.5">
          <span className="kicker">Белешка</span>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="на пр. да се донесе лаптоп" maxLength={300} />
        </label>
      </div>

      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Откажи
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          Зачувај
        </Button>
      </div>
    </div>
  );
}
