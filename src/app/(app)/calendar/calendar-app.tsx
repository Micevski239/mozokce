"use client";

import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { eventColor, isImportant, KIND_ICONS, type SubjectRef } from "@/components/calendar-ui";
import { Button } from "@/components/ui";
import {
  addDays,
  addMonths,
  countdown,
  expandOccurrences,
  formatDayShort,
  formatMonthTitle,
  formatTimeRange,
  formatWeekTitle,
  monthGrid,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  weekDates,
  weekday,
  type CalendarEvent,
  type CalendarView,
  type Occurrence,
} from "@/lib/calendar";
import { Agenda } from "./agenda";
import { EventDetails } from "./event-details";
import { EventForm, type EventDraft } from "./event-form";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

const LIST_DAYS = 30;

// ---- прелистувач: ширина и моментално време -------------------------------

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getWide = () => window.matchMedia("(min-width: 768px)").matches;

const nowFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Skopje", hour: "2-digit", minute: "2-digit", hour12: false });
function subscribeNow(cb: () => void) {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
}
function getNowMinutes() {
  const [h, m] = nowFormat.format(new Date()).split(":").map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------

interface Props {
  events: CalendarEvent[];
  subjects: SubjectRef[];
  allSubjects: SubjectRef[];
  today: string;
  initialView: CalendarView;
  initialDate: string;
  initialSubjects: string[];
  initialWide: boolean;
}

const VIEWS: { key: CalendarView; label: string; icon: typeof List; wideOnly?: boolean }[] = [
  { key: "day", label: "Ден", icon: CalendarDays },
  { key: "week", label: "Недела", icon: CalendarRange, wideOnly: true },
  { key: "month", label: "Месец", icon: LayoutGrid },
  { key: "list", label: "Листа", icon: List },
];

export function CalendarApp(props: Props) {
  const { events, subjects, today } = props;
  const [view, setView] = useState<CalendarView>(props.initialView);
  const [anchor, setAnchor] = useState(props.initialDate);
  const [selected, setSelected] = useState<Set<string>>(new Set(props.initialSubjects));
  const [details, setDetails] = useState<Occurrence | null>(null);
  const [form, setForm] = useState<{ event?: CalendarEvent | null; draft?: EventDraft | null } | null>(null);

  const wide = useSyncExternalStore(subscribeWide, getWide, () => props.initialWide);
  const nowMinutes = useSyncExternalStore(subscribeNow, getNowMinutes, () => null);
  // Недела со 7 колони не е читлива на телефон: таму истиот избор прикажува еден ден.
  const effective: CalendarView = !wide && view === "week" ? "day" : view;

  const subjectMap = useMemo(() => new Map(props.allSubjects.map((s) => [s.id, s])), [props.allSubjects]);
  const visibleEvents = useMemo(
    () => (selected.size ? events.filter((e) => e.subject_id && selected.has(e.subject_id)) : events),
    [events, selected],
  );

  // Опсег за тековниот приказ.
  const range = useMemo((): { days: string[]; from: string; to: string } => {
    if (effective === "day") return { days: [anchor], from: anchor, to: anchor };
    if (effective === "week") {
      const days = weekDates(anchor);
      return { days, from: days[0], to: days[6] };
    }
    if (effective === "month") {
      const days = monthGrid(anchor);
      return { days, from: days[0], to: days[41] };
    }
    return { days: [], from: anchor, to: addDays(anchor, LIST_DAYS - 1) };
  }, [effective, anchor]);

  const occurrences = useMemo(() => expandOccurrences(visibleEvents, range.from, range.to), [visibleEvents, range]);
  const weekOccurrences = useMemo(() => {
    const days = weekDates(anchor);
    return expandOccurrences(visibleEvents, days[0], days[6]);
  }, [visibleEvents, anchor]);
  const upcoming = useMemo(() => {
    const next = expandOccurrences(visibleEvents, today, addDays(today, 45));
    return {
      today: next.filter((o) => o.date === today),
      // Денешните се веќе во картичката „Денес“; тука се следните важни (рокови, колоквиуми, испити).
      important: next.filter((o) => isImportant(o.event) && o.date > today).slice(0, 3),
    };
  }, [visibleEvents, today]);

  // Адресата го следи приказот (освежување/споделување), без повторно вчитување од серверот.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    url.searchParams.set("date", anchor);
    if (selected.size) url.searchParams.set("subject", [...selected].join(","));
    else url.searchParams.delete("subject");
    window.history.replaceState(null, "", url);
  }, [view, anchor, selected]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setAnchor((a) =>
        effective === "day" ? addDays(a, dir) : effective === "week" ? addDays(a, 7 * dir) : effective === "month" ? addMonths(a, dir) : addDays(a, LIST_DAYS * dir),
      );
    },
    [effective],
  );

  const openDay = (date: string) => {
    setAnchor(date);
    setView("day");
  };
  const create = (draft: EventDraft) => setForm({ draft: { subjectId: selected.size === 1 ? [...selected][0] : null, ...draft } });

  // Тастатура: ← → навигација, T денес, N нова активност.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e: KeyboardEvent) => {
      if (details || form) return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key.toLowerCase() === "t") setAnchor(today);
      else if (e.key.toLowerCase() === "n") create({ date: anchor });
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const title =
    effective === "day"
      ? `${WEEKDAY_LONG[weekday(anchor)]}, ${formatDayShort(anchor).split(", ")[1]} ${anchor.slice(0, 4)}`
      : effective === "week"
        ? formatWeekTitle(anchor)
        : effective === "month"
          ? formatMonthTitle(anchor)
          : `${formatDayShort(anchor)} – ${formatDayShort(addDays(anchor, LIST_DAYS - 1))}`;
  const isCurrent =
    effective === "day"
      ? anchor === today
      : effective === "week"
        ? weekDates(anchor).includes(today)
        : effective === "month"
          ? anchor.slice(0, 7) === today.slice(0, 7)
          : anchor === today;

  const toggleSubject = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="w-full space-y-[var(--gap)]">
      {/* Наслов и алатки */}
      <section className="glass flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => step(-1)} className="btn btn-ghost btn-icon" aria-label="Претходно" title="Претходно (←)">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => step(1)} className="btn btn-ghost btn-icon" aria-label="Следно" title="Следно (→)">
              <ChevronRight size={18} />
            </button>
          </div>
          <h1 className="display min-w-0 truncate text-lg font-semibold sm:text-xl">
            {effective === "day" ? (
              <>
                <span className="sm:hidden">{formatDayShort(anchor)}</span>
                <span className="hidden sm:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </h1>
          <button
            type="button"
            onClick={() => setAnchor(today)}
            disabled={isCurrent}
            className="btn !min-h-8 shrink-0 !px-3 !text-xs"
            title="Денес (T)"
          >
            Денес
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="fill grid flex-1 grid-cols-3 gap-1 p-1 md:grid-cols-4 lg:flex-none" role="tablist" aria-label="Приказ">
            {VIEWS.map(({ key, label, icon: Icon, wideOnly }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={effective === key}
                onClick={() => setView(key)}
                className={`${wideOnly ? "hidden md:flex" : "flex"} items-center justify-center gap-1.5 rounded-[12px] px-3 py-1.5 font-mono text-[12.5px] font-semibold transition ${
                  effective === key ? "bg-[var(--pill-on)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.3)]" : "text-ink-3 hover:text-ink"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => create({ date: effective === "day" ? anchor : isCurrent ? today : anchor })} title="Нова активност (N)">
            <Plus size={16} /> <span className="hidden sm:inline">Нова активност</span>
          </Button>
        </div>
      </section>

      {/* Предмети (филтер и легенда за боите) */}
      {props.subjects.length > 0 && (
        <div className="scroll-x -mx-1 flex gap-1.5 px-1">
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-pressed={selected.size === 0}
            className={`chip shrink-0 !py-1.5 normal-case !tracking-normal ${selected.size === 0 ? "chip-accent" : "hover:!border-[var(--accent-line)]"}`}
          >
            Сите предмети
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSubject(s.id)}
              aria-pressed={selected.has(s.id)}
              title={s.name}
              className={`chip shrink-0 !py-1.5 normal-case !tracking-normal ${selected.has(s.id) ? "chip-accent" : "hover:!border-[var(--accent-line)]"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: eventColor({ subject_id: s.id }) }} />
              {s.code || s.name}
            </button>
          ))}
        </div>
      )}

      {/* Денес и следно важно: на телефон хоризонтален ред со лизгање, на поголем екран мрежа. */}
      <div className="scroll-x -mx-1 flex snap-x gap-3 px-1 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] md:px-0 md:pb-0">
        <div className="glass w-[16.5rem] shrink-0 snap-start !rounded-[22px] p-4 md:w-auto">
          <div className="kicker mb-2 flex items-center justify-between">
            <span>Денес · {formatDayShort(today)}</span>
            <span className="font-mono normal-case tracking-normal text-ink-3">{upcoming.today.length}</span>
          </div>
          {upcoming.today.length === 0 ? (
            <p className="text-sm text-ink-2">Нема активности денес.</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.today.slice(0, 3).map((o) => (
                <li key={o.key}>
                  <button type="button" onClick={() => setDetails(o)} className="flex w-full min-w-0 items-center gap-2 text-left text-sm hover:text-accent-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: eventColor(o.event) }} />
                    <span className="shrink-0 font-mono text-[11.5px] text-ink-2">{formatTimeRange(o)}</span>
                    <span className="truncate font-medium">{o.event.title}</span>
                  </button>
                </li>
              ))}
              {upcoming.today.length > 3 && <li className="font-mono text-[11px] text-ink-3">+{upcoming.today.length - 3} уште</li>}
            </ul>
          )}
        </div>
        {upcoming.important.map((o) => {
          const days = Math.round((Date.parse(o.date) - Date.parse(today)) / 86400000);
          const subject = o.event.subject_id ? subjectMap.get(o.event.subject_id) : undefined;
          const Icon = KIND_ICONS[o.event.kind];
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setDetails(o)}
              className="glass w-[16.5rem] shrink-0 snap-start !rounded-[22px] p-4 text-left transition hover:border-[var(--accent-line)] md:w-auto"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="kicker flex items-center gap-1.5 !text-ink-2">
                  <Icon size={13} style={{ color: eventColor(o.event) }} /> {subject?.code || subject?.name || "Друго"}
                </span>
                <span className={`chip !py-0.5 ${days <= 3 ? "!border-danger/40 !bg-danger-soft !text-danger" : ""}`}>{countdown(o.date, today)}</span>
              </div>
              <div className="truncate font-semibold">{o.event.title}</div>
              <div className="mt-0.5 font-mono text-[11.5px] text-ink-3">
                {formatDayShort(o.date)} · {formatTimeRange(o)}
              </div>
            </button>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-ink-2">
          Календарот е празен. Додај го распоредот со <span className="font-semibold text-ink">Нова активност</span>, или кликни на празен
          термин во неделата. Предавањата и вежбите можат да се повторуваат секоја недела до крајот на семестарот.
        </p>
      )}

      {/* Приказ */}
      {effective === "day" && (
        <div className="space-y-3">
          <div className="glass grid grid-cols-7 gap-1 p-1.5">
            {weekDates(anchor).map((date) => {
              const count = weekOccurrences.filter((o) => o.date === date).length;
              const active = date === anchor;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setAnchor(date)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-0.5 rounded-[14px] py-2 transition ${
                    active ? "bg-[var(--pill-on)] shadow-[inset_0_1px_0_rgba(255,255,255,.3)]" : "hover:bg-[var(--pill-hover)]"
                  }`}
                >
                  <span className={`font-mono text-[10.5px] font-semibold uppercase ${date === today ? "text-accent-2" : "text-ink-3"}`}>
                    {WEEKDAY_SHORT[weekday(date)]}
                  </span>
                  <span
                    className={`display flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[15px] font-semibold ${
                      date === today ? "bg-accent text-white" : ""
                    }`}
                  >
                    {Number(date.slice(8))}
                  </span>
                  <span className={`h-1 w-1 rounded-full ${count ? "bg-ink-3" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
          {occurrences.length === 0 ? (
            <div className="glass flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-sm text-ink-2">Нема активности во {WEEKDAY_LONG[weekday(anchor)].toLowerCase()}.</p>
              <Button onClick={() => create({ date: anchor })}>
                <Plus size={16} /> Додај активност
              </Button>
            </div>
          ) : (
            <TimeGrid
              days={[anchor]}
              occurrences={occurrences}
              today={today}
              nowMinutes={nowMinutes}
              subjects={subjectMap}
              onSelect={setDetails}
              onCreate={(date, start) => create({ date, start })}
            />
          )}
        </div>
      )}

      {effective === "week" && (
        <TimeGrid
          days={range.days}
          occurrences={occurrences}
          today={today}
          nowMinutes={nowMinutes}
          subjects={subjectMap}
          onSelect={setDetails}
          onCreate={(date, start) => create({ date, start })}
          onPickDay={openDay}
        />
      )}

      {effective === "month" && (
        <MonthGrid anchor={anchor} occurrences={occurrences} today={today} subjects={subjectMap} onPickDay={openDay} onSelect={setDetails} />
      )}

      {effective === "list" && (
        <Agenda
          occurrences={occurrences}
          today={today}
          subjects={subjectMap}
          onSelect={setDetails}
          emptyHint={`Нема активности во следните ${LIST_DAYS} дена${selected.size ? " за избраните предмети" : ""}.`}
        />
      )}

      <p className="hidden px-1 text-xs text-ink-3 lg:block">Тастатура: ← → навигација · T денес · N нова активност · клик на празен термин во неделата за брзо додавање</p>

      {details && (
        <EventDetails
          occurrence={details}
          subject={details.event.subject_id ? subjectMap.get(details.event.subject_id) : undefined}
          today={today}
          onClose={() => setDetails(null)}
          onEdit={() => {
            setForm({ event: details.event });
            setDetails(null);
          }}
        />
      )}
      <EventForm open={form !== null} onClose={() => setForm(null)} subjects={subjects} event={form?.event} draft={form?.draft} />
    </div>
  );
}
