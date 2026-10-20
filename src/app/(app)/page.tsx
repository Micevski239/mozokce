import { ArrowRight, BookOpen, CalendarDays, FileText, FolderOpen, MessagesSquare, Pin, Sparkles, StickyNote } from "lucide-react";
import Link from "next/link";
import { ScheduleList } from "@/components/schedule-list";
import { SearchBox } from "@/components/search-box";
import { SubjectCard } from "@/components/subject-card";
import { ButtonLink, EmptyState, Panel, Stat, subjectTint } from "@/components/ui";
import { addDays, expandOccurrences, IMPORTANT_KINDS } from "@/lib/calendar";
import { listEvents, listMaterials, loadSubjectOverviews } from "@/lib/data";
import type { MaterialKind } from "@/lib/materials";
import { dayKey, daysAgo, greeting, timeAgo, todayKey } from "@/lib/stats";

const KIND_ICONS = { file: FileText, chat: MessagesSquare, note: StickyNote } as const;
const TAB_FOR: Record<MaterialKind, string> = { file: "files", chat: "chats", note: "notes" };

export default async function HomePage() {
  const [subjects, materials, events] = await Promise.all([loadSubjectOverviews(), listMaterials(), listEvents()]);

  // Материјалите на активните предмети (најнови прво), со името на предметот.
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const active = materials
    .filter((m) => subjectName.has(m.subject_id))
    .map((m) => ({ ...m, subjects: { name: subjectName.get(m.subject_id)! } }));
  const recent = active.slice(0, 12);
  const pinned = active.filter((m) => m.pinned).slice(0, 8);
  const weekAgo = daysAgo(7).toISOString();
  const weekCount = materials.filter((m) => m.created_at >= weekAgo).length;

  // Распоред: денешните термини и следните важни (рокови, колоквиуми, испити) во наредните 3 недели.
  const today = todayKey();
  const upcoming = expandOccurrences(events, today, addDays(today, 21));
  const todayItems = upcoming.filter((o) => o.date === today);
  const nextImportant = upcoming.filter((o) => o.date > today && IMPORTANT_KINDS.includes(o.event.kind)).slice(0, 3);
  const subjectRefs = new Map(subjects.map((s) => [s.id, { id: s.id, name: s.name, code: s.code }]));

  const totals = subjects.reduce(
    (acc, s) => ({ total: acc.total + s.counts.total, chat: acc.chat + s.counts.chat, exam: acc.exam + s.origins.exam }),
    { total: 0, chat: 0, exam: 0 },
  );

  // Активност групирана по денови.
  const yesterday = dayKey(daysAgo(1));
  const days = new Map<string, typeof recent>();
  for (const m of recent) {
    const key = dayKey(new Date(m.created_at));
    days.set(key, [...(days.get(key) ?? []), m]);
  }
  const dayLabel = (key: string) => (key === today ? "Денес" : key === yesterday ? "Вчера" : key.split("-").reverse().join("."));

  const emptiest = subjects.filter((s) => s.counts.total === 0);

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-[var(--gap)]">
        <section className="glass space-y-4 p-6 sm:p-8">
          <div>
            <div className="kicker mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Сè за учење на едно место
            </div>
            <h1 className="display text-3xl font-semibold leading-tight sm:text-4xl">{greeting()}!</h1>
            <p className="mt-1 max-w-2xl text-ink-2">
              {subjects.length === 0
                ? "Додај ги предметите за овој семестар, па собирај материјали, Discord пораки и белешки во секој од нив."
                : `${subjects.length} ${subjects.length === 1 ? "предмет" : "предмети"} · ${totals.total} материјали${
                    weekCount ? ` · ${weekCount} нови оваа недела` : ""
                  }`}
            </p>
          </div>
          {subjects.length > 0 ? (
            <div className="max-w-3xl">
              <SearchBox />
            </div>
          ) : (
            <ButtonLink href="/subjects" variant="primary" size="lg">
              Додај предмет <ArrowRight size={18} />
            </ButtonLink>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Предмети" value={subjects.length} hint="активни" />
          <Stat label="Материјали" value={totals.total} hint="вкупно" />
          <Stat label="Колоквиуми" value={totals.exam} hint="стари колоквиуми и испити" tone="accent" />
          <Stat label="Оваа недела" value={weekCount ?? 0} hint="нови материјали" />
        </div>

        <Panel
          title="Предмети"
          action={
            <Link href="/subjects" className="flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink">
              Управувај <ArrowRight size={13} />
            </Link>
          }
        >
          {subjects.length === 0 ? (
            <EmptyState icon={<BookOpen size={24} strokeWidth={1.75} />} title="Сè уште нема предмети">
              Додај ги во{" "}
              <Link href="/subjects" className="text-accent-2 underline">
                Предмети
              </Link>
              .
            </EmptyState>
          ) : (
            <>
              <div className="auto-grid">
                {subjects.map((s) => (
                  <SubjectCard key={s.id} subject={s} />
                ))}
              </div>
              {emptiest.length > 0 && emptiest.length < subjects.length && (
                <p className="mt-3 px-1 text-xs text-ink-3">
                  Без материјали: {emptiest.map((s) => s.name).join(", ")}.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-1">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-accent-2" /> Денес
            </span>
          }
          action={
            <Link href="/calendar" className="flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink">
              Календар <ArrowRight size={13} />
            </Link>
          }
        >
          {todayItems.length === 0 ? (
            <p className="text-sm text-ink-2">Нема активности денес.</p>
          ) : (
            <ScheduleList items={todayItems} today={today} subjects={subjectRefs} showDate={false} />
          )}
          {nextImportant.length > 0 && (
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <div className="kicker mb-1 px-2">Следно важно</div>
              <ScheduleList items={nextImportant} today={today} subjects={subjectRefs} />
            </div>
          )}
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Pin size={16} className="text-warn" /> Важно
            </span>
          }
        >
          {!pinned?.length ? (
            <p className="text-sm text-ink-2">Закачените материјали од сите предмети ќе стојат тука.</p>
          ) : (
            <ul className="space-y-1">
              {pinned.map((m) => {
                const Icon = KIND_ICONS[m.kind as MaterialKind] ?? FolderOpen;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/subjects/${m.subject_id}?tab=${TAB_FOR[m.kind as MaterialKind]}#m-${m.id}`}
                      className="flex items-center gap-3 rounded-2xl p-2 hover:bg-[var(--pill-hover)]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.title}</span>
                        <span className="block truncate font-mono text-[11px] text-ink-3">{m.subjects.name}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Активност">
          {days.size === 0 ? (
            <p className="text-sm text-ink-2">Новите материјали ќе се појават тука.</p>
          ) : (
            <div className="space-y-3">
              {[...days.entries()].map(([key, items]) => (
                <div key={key}>
                  <div className="kicker mb-1 px-2">{dayLabel(key)}</div>
                  <ul className="space-y-0.5">
                    {items.map((m) => {
                      const Icon = KIND_ICONS[m.kind as MaterialKind] ?? FolderOpen;
                      return (
                        <li key={m.id}>
                          <Link
                            href={`/subjects/${m.subject_id}?tab=${TAB_FOR[m.kind as MaterialKind]}#m-${m.id}`}
                            className="flex items-center gap-3 rounded-2xl p-2 hover:bg-[var(--pill-hover)]"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                              style={{ background: subjectTint(m.subject_id) }}
                            >
                              <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{m.title}</span>
                              <span className="block truncate font-mono text-[11px] text-ink-3">
                                {m.subjects.name} · {timeAgo(m.created_at)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Sparkles size={16} /> Што следи
            </span>
          }
        >
          <p className="text-sm leading-relaxed text-ink-2">
            AI база на знаење по предмет: од материјалите и Discord пораките ќе ги извлече најважните теми и најчестите
            прашања на колоквиум, за да знаеш на што да се фокусираш.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
