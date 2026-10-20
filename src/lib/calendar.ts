/**
 * Логика на календарот, без I/O. Датумите се низи „YYYY-MM-DD“ (локално време во Скопје),
 * а времињата се минути од полноќ. Така нема временски зони ни летно/зимско време.
 */

export type EventKind = "lecture" | "exercise" | "lab" | "homework" | "kolokvium" | "exam" | "other";
export type CalendarView = "week" | "day" | "month" | "list";

export interface CalendarEvent {
  id: string;
  subject_id: string | null;
  title: string;
  kind: EventKind;
  date: string;
  start_time: string | null;
  end_time: string | null;
  repeat_weekly: boolean;
  repeat_until: string | null;
  skip_dates: string[];
  location: string | null;
  notes: string | null;
}

export const EVENT_COLUMNS =
  "id, subject_id, title, kind, date, start_time, end_time, repeat_weekly, repeat_until, skip_dates, location, notes";

/** Еден термин на настан во конкретен ден. */
export interface Occurrence {
  key: string;
  event: CalendarEvent;
  date: string;
  /** минути од полноќ; null = цел ден */
  start: number | null;
  /** null = рок (точка во време) или цел ден */
  end: number | null;
}

export const KIND_LABELS: Record<EventKind, string> = {
  lecture: "Предавање",
  exercise: "Аудиториски вежби",
  lab: "Лабораториски вежби",
  homework: "Домашна / рок",
  kolokvium: "Колоквиум",
  exam: "Испит",
  other: "Друго",
};

export const KIND_SHORT: Record<EventKind, string> = {
  lecture: "Предавање",
  exercise: "Аудиториски",
  lab: "Лаб",
  homework: "Рок",
  kolokvium: "Колоквиум",
  exam: "Испит",
  other: "Друго",
};

export const KIND_ORDER: EventKind[] = ["lecture", "exercise", "lab", "homework", "kolokvium", "exam", "other"];

/** Настани што треба да се истакнат (одбројување, црвена ознака). */
export const IMPORTANT_KINDS: EventKind[] = ["kolokvium", "exam", "homework"];

// ---- датуми --------------------------------------------------------------

function toUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

export function addMonths(date: string, months: number): string {
  const d = toUTC(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return fromUTC(d);
}

/** 0 = понеделник … 6 = недела. */
export function weekday(date: string): number {
  return (toUTC(date).getUTCDay() + 6) % 7;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86400000);
}

export function startOfWeek(date: string): string {
  return addDays(date, -weekday(date));
}

export function weekDates(date: string): string[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 6 недели (42 дена) што го покриваат месецот, од понеделник. */
export function monthGrid(date: string): string[] {
  const first = `${date.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_SHORT = ["пон", "вто", "сре", "чет", "пет", "саб", "нед"];
export const WEEKDAY_LONG = ["Понеделник", "Вторник", "Среда", "Четврток", "Петок", "Сабота", "Недела"];
const MONTHS = ["јануари", "февруари", "март", "април", "мај", "јуни", "јули", "август", "септември", "октомври", "ноември", "декември"];
const MONTHS_SHORT = ["јан", "фев", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "ное", "дек"];

const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

export function formatMonthTitle(date: string): string {
  const [y, m] = parts(date);
  return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}

/** „пон, 5 окт“ */
export function formatDayShort(date: string): string {
  const [, m, d] = parts(date);
  return `${WEEKDAY_SHORT[weekday(date)]}, ${d} ${MONTHS_SHORT[m - 1]}`;
}

/** „Понеделник, 5 октомври“ */
export function formatDayLong(date: string): string {
  const [, m, d] = parts(date);
  return `${WEEKDAY_LONG[weekday(date)]}, ${d} ${MONTHS[m - 1]}`;
}

/** „29 сеп – 5 окт 2026“ или „5 – 11 окт 2026“ */
export function formatWeekTitle(date: string): string {
  const days = weekDates(date);
  const [y1, m1, d1] = parts(days[0]);
  const [y2, m2, d2] = parts(days[6]);
  if (y1 !== y2) return `${d1} ${MONTHS_SHORT[m1 - 1]} ${y1} – ${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
  return `${d1} – ${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
}

// ---- времиња -------------------------------------------------------------

/** „09:30“ или „09:30:00“ → 570. */
export function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTimeRange(o: Pick<Occurrence, "start" | "end">): string {
  if (o.start === null) return "Цел ден";
  if (o.end === null) return `до ${formatMinutes(o.start)}`;
  return `${formatMinutes(o.start)}–${formatMinutes(o.end)}`;
}

/** Термин со почеток и крај (се црта во мрежата со часови). Роковите и целодневните се над мрежата. */
export function isTimed(o: Pick<Occurrence, "start" | "end">): boolean {
  return o.start !== null && o.end !== null;
}

// ---- повторувања ---------------------------------------------------------

/** Сите термини на настаните во опсегот [from, to] (вклучително), подредени по датум и час. */
export function expandOccurrences(events: CalendarEvent[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    const start = timeToMinutes(event.start_time);
    const end = timeToMinutes(event.end_time);
    const push = (date: string) => {
      if (event.skip_dates.includes(date)) return;
      out.push({ key: `${event.id}:${date}`, event, date, start, end });
    };
    if (!event.repeat_weekly) {
      if (event.date >= from && event.date <= to) push(event.date);
      continue;
    }
    const last = event.repeat_until && event.repeat_until < to ? event.repeat_until : to;
    let date = event.date;
    if (date < from) date = addDays(date, Math.ceil(daysBetween(date, from) / 7) * 7);
    for (; date <= last; date = addDays(date, 7)) push(date);
  }
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1) || a.event.title.localeCompare(b.event.title),
  );
}

// ---- распоредување во мрежата --------------------------------------------

export interface Placed<T> {
  item: T;
  column: number;
  columns: number;
}

/**
 * Термините што се преклопуваат се ставаат еден до друг.
 * Групите се термини поврзани со преклопување; секоја група ги дели колоните.
 */
export function layoutOverlaps<T extends { start: number | null; end: number | null }>(items: T[]): Placed<T>[] {
  const timed = items.filter((i) => i.start !== null && i.end !== null).sort((a, b) => a.start! - b.start! || b.end! - a.end!);
  const result: Placed<T>[] = [];
  let group: Placed<T>[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const cols = columnEnds.length;
    for (const p of group) p.columns = cols;
    result.push(...group);
    group = [];
    columnEnds = [];
  };

  for (const item of timed) {
    if (group.length && item.start! >= groupEnd) flush();
    let col = columnEnds.findIndex((end) => end <= item.start!);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end!);
    } else {
      columnEnds[col] = item.end!;
    }
    group.push({ item, column: col, columns: 1 });
    groupEnd = Math.max(groupEnd, item.end!);
  }
  if (group.length) flush();
  return result;
}

/**
 * Опсег на часови за мрежата: стандардно 8–20, проширено ако има термини надвор.
 * Роковите и целодневните се прикажуваат над мрежата, па не го шират опсегот.
 */
export function hourRange(occurrences: Occurrence[], min = 8, max = 20): [number, number] {
  let lo = min;
  let hi = max;
  for (const o of occurrences) {
    if (!isTimed(o)) continue;
    lo = Math.min(lo, Math.floor(o.start! / 60));
    hi = Math.max(hi, Math.ceil(o.end! / 60));
  }
  return [Math.max(0, lo), Math.min(24, hi)];
}

// ---- текстови ------------------------------------------------------------

/** „денес“, „утре“, „за 3 дена“, „пред 2 дена“. */
export function countdown(date: string, today: string): string {
  const d = daysBetween(today, date);
  if (d === 0) return "денес";
  if (d === 1) return "утре";
  if (d === -1) return "вчера";
  if (d > 1) return `за ${d} ${d % 10 === 1 && d % 100 !== 11 ? "ден" : "дена"}`;
  return `пред ${-d} дена`;
}
