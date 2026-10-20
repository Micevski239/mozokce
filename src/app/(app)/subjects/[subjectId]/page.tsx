import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CalendarDays,
  FileText,
  FolderOpen,
  GraduationCap,
  MessagesSquare,
  Pin,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { ScheduleList } from "@/components/schedule-list";
import { Breadcrumbs, Button, EmptyState, Input, Panel, SubjectCover } from "@/components/ui";
import {
  groupByMonth,
  ORIGIN_COLORS,
  ORIGIN_LABELS,
  ORIGIN_ORDER,
  originCounts,
  type MaterialKind,
  type MaterialWithUrl,
} from "@/lib/materials";
import { timeAgo, todayKey } from "@/lib/stats";
import { addDays, expandOccurrences, IMPORTANT_KINDS, type Occurrence } from "@/lib/calendar";
import { summarizeProgress } from "@/lib/brain";
import { brainForCode } from "@/lib/brain-files";
import { fileUrl, getProgressRows, getSubject, listEvents, listMaterials } from "@/lib/data";
import { renameSubject, setSubjectArchived } from "../../actions";
import { AddMaterial } from "./add-material";
import { BrainOverview } from "./brain-overview";
import { BrainTopics } from "./brain-topics";
import { QuestionPractice } from "./question-practice";
import { MaterialList } from "./material-list";
import { SubjectTabs, TabLink, type SubjectTab } from "./subject-tabs";

const ADD_KINDS: MaterialKind[] = ["file", "chat", "note"];

export default async function SubjectPage({ params, searchParams }: PageProps<"/subjects/[subjectId]">) {
  const { subjectId } = await params;
  const sp = await searchParams;
  const autoOpen = ADD_KINDS.find((k) => k === sp.add) ?? null;
  const subject = await getSubject(subjectId);
  if (!subject) notFound();
  // Мозокот (brains/<id>/brain.json) е врзан со кратенката на предметот.
  const brain = await brainForCode(subject.code);

  const [materials, allEvents, rowsProgress] = await Promise.all([
    listMaterials(),
    listEvents(),
    brain ? getProgressRows(brain.id) : Promise.resolve([]),
  ]);
  const all: MaterialWithUrl[] = materials.filter((m) => m.subject_id === subject.id).map((m) => ({ ...m, url: fileUrl(m) }));
  const byKind = (kind: MaterialKind) => all.filter((m) => m.kind === kind);
  const counts: Record<MaterialKind, number> = { file: byKind("file").length, chat: byKind("chat").length, note: byKind("note").length };
  const today = todayKey();
  const events = allEvents.filter((e) => e.subject_id === subject.id);
  const schedule = expandOccurrences(events, today, addDays(today, 60)).slice(0, 5);
  const progress = brain ? summarizeProgress(brain, rowsProgress) : null;

  return (
    <div className="w-full space-y-[var(--gap)]">
      <Breadcrumbs items={[{ href: "/subjects", label: "Предмети" }, { label: subject.name }]} />

      {/* Херој */}
      <section className="glass p-2">
        <SubjectCover id={subject.id} name={subject.name} code={subject.code} className="p-6 sm:p-8">
          <div className="relative space-y-4 text-white">
            <div className="space-y-2">
              <div className="kicker flex flex-wrap items-center gap-2 !text-white/80">
                {subject.code && <span className="chip !border-white/40 !bg-white/20 normal-case !tracking-normal !text-white">{subject.code}</span>}
                <FolderOpen size={13} /> {all.length} {all.length === 1 ? "материјал" : "материјали"}
                {all[0] && <span>· последно {timeAgo(all[0].created_at)}</span>}
                {subject.archived && <span className="chip !border-white/30 !bg-black/20 !text-white">архивиран</span>}
              </div>
              <h1 className="display break-words text-[1.75rem] font-semibold leading-tight sm:text-4xl">{subject.name}</h1>
            </div>
            <AddMaterial subjectId={subject.id} today={today} autoOpen={autoOpen} tone="onCover" />
          </div>
        </SubjectCover>
      </section>

      <SubjectTabs
        counts={brain ? { ...counts, topic: brain.topics.length, question: brain.questions.length } : counts}
        panels={{
          ...(brain && progress
            ? {
                topics: <BrainTopics brain={brain} summary={progress} />,
                questions: <QuestionPractice brain={brain} initialRows={rowsProgress} />,
              }
            : {}),
          overview: brain && progress ? (
            <BrainOverview
              brain={brain}
              summary={progress}
              upcoming={expandOccurrences(events, today, addDays(today, 180))
                .filter((o) => IMPORTANT_KINDS.includes(o.event.kind))
                .slice(0, 4)}
              weekly={events.filter((e) => e.repeat_weekly && (!e.repeat_until || e.repeat_until >= today))}
              subjectId={subject.id}
              today={today}
            />
          ) : (
            all.length === 0 ? (
          <FirstSteps subjectId={subject.id} today={today} />
        ) : (
          <Overview all={all} subjectId={subject.id} today={today} schedule={schedule} />
        )
          ),
          files: (
            <Panel title="Датотеки" action={<AddMaterial subjectId={subject.id} today={today} only="file" />}>
          <MaterialList
            materials={byKind("file")}
           
            group="origin"
            searchable
            searchPlaceholder="Пребарај датотеки по име…"
            empty={<EmptyState icon={<FileText size={24} strokeWidth={1.75} />} title="Нема датотеки">Качи предавања, скрипти и стари колоквиуми.</EmptyState>}
          />
        </Panel>
          ),
          chats: (
            <Panel title="Discord чатови" action={<AddMaterial subjectId={subject.id} today={today} only="chat" />}>
          <MaterialList
            materials={byKind("chat")}
           
            group="month"
            searchable
            searchPlaceholder="Пребарај низ пораките…"
            empty={
              <EmptyState icon={<MessagesSquare size={24} strokeWidth={1.75} />} title="Нема зачувани чатови">
                Копирај ги корисните пораки од Discord каналот на предметот и залепи ги тука.
              </EmptyState>
            }
          />
        </Panel>
          ),
          notes: (
            <Panel title="Белешки" action={<AddMaterial subjectId={subject.id} today={today} only="note" />}>
          <MaterialList
            materials={byKind("note")}
           
            variant="notes"
            searchable
            searchPlaceholder="Пребарај белешки…"
            empty={
              <EmptyState icon={<StickyNote size={24} strokeWidth={1.75} />} title="Нема белешки">
                Запиши што кажал професорот, што влегува и што не, колку носи која задача.
              </EmptyState>
            }
          />
        </Panel>
          ),
          settings: (
            <div className="grid gap-[var(--gap)] lg:grid-cols-2">
          <Panel title="Име и кратенка">
            <ActionForm action={renameSubject} submitLabel="Зачувај">
              <input type="hidden" name="id" value={subject.id} />
              <label className="block space-y-1.5">
                <span className="kicker">Име</span>
                <Input name="name" defaultValue={subject.name} required />
              </label>
              <label className="block space-y-1.5">
                <span className="kicker">Кратенка</span>
                <Input name="code" defaultValue={subject.code ?? ""} maxLength={12} placeholder="на пр. ИС" className="sm:!w-44" />
              </label>
            </ActionForm>
          </Panel>
          <Panel title="Архива">
            <p className="mb-3 text-sm text-ink-2">
              Архивираните предмети се кријат од почетната (на пр. предмети од претходен семестар). Материјалите остануваат.
            </p>
            <form action={setSubjectArchived}>
              <input type="hidden" name="id" value={subject.id} />
              <input type="hidden" name="archived" value={subject.archived ? "false" : "true"} />
              <Button type="submit">
                {subject.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {subject.archived ? "Врати од архива" : "Архивирај"}
              </Button>
            </form>
          </Panel>
        </div>
          ),
        }}
      />
    </div>
  );
}

function FirstSteps({ subjectId, today }: { subjectId: string; today: string }) {
  const steps: { kind: MaterialKind; icon: LucideIcon; title: string; text: string }[] = [
    { kind: "file", icon: FileText, title: "Качи материјали", text: "Предавања, скрипти, стари колоквиуми и скриншоти." },
    { kind: "chat", icon: MessagesSquare, title: "Залепи Discord чат", text: "Пораките од каналот на предметот, без чистење." },
    { kind: "note", icon: StickyNote, title: "Запиши белешка", text: "Што кажал професорот, што влегува, колку носи." },
  ];
  return (
    <Panel>
      <div className="px-2 pb-2 pt-1 text-center">
        <div className="kicker mb-1">Празен предмет</div>
        <h2 className="display text-xl font-semibold">Собери сè за овој предмет на едно место</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-ink-2">Кога ќе дојде време за учење, сè ќе е тука. Почни со едно од овие:</p>
      </div>
      <div className="auto-grid mt-4 [--min:15rem]">
        {steps.map(({ kind, icon: Icon, title, text }) => (
          <div key={kind} className="fill flex flex-col items-start gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-2">
              <Icon size={18} />
            </span>
            <div>
              <div className="font-mono text-sm font-semibold">{title}</div>
              <div className="mt-0.5 text-sm text-ink-2">{text}</div>
            </div>
            <div className="mt-auto">
              <AddMaterial subjectId={subjectId} today={today} only={kind} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Overview({
  all,
  subjectId,
  today,
  schedule,
}: {
  all: MaterialWithUrl[];
  subjectId: string;
  today: string;
  schedule: Occurrence[];
}) {
  const pinned = all.filter((m) => m.pinned);
  const exams = all.filter((m) => m.origin === "exam");
  const recent = all.filter((m) => !m.pinned).slice(0, 5);
  const origins = originCounts(all);

  // Временска линија: месеците во кои има материјали (по датум на објава), најнови прво.
  const timeline = groupByMonth(all).slice(0, 8);
  const maxMonth = Math.max(1, ...timeline.map((g) => g.items.length));

  const seeAll = (tab: SubjectTab, label = "Види ги сите") => (
    <TabLink tab={tab} className="flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink">
      {label} <ArrowRight size={13} />
    </TabLink>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-[var(--gap)]">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Pin size={16} className="text-warn" /> Важно
            </span>
          }
        >
          {pinned.length === 0 ? (
            <p className="text-sm text-ink-2">
              Закачи ги најважните материјали (копчето <Pin size={13} className="inline" />) за да ти стојат тука, на врвот.
            </p>
          ) : (
            <MaterialList materials={pinned} />
          )}
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <GraduationCap size={16} className="text-warn" /> Колоквиуми и испити
            </span>
          }
          action={exams.length > 3 ? seeAll("files") : undefined}
        >
          {exams.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-2">Нема стари колоквиуми и испити. Тие се најкорисни за учење.</p>
              <AddMaterial subjectId={subjectId} today={today} only="file" />
            </div>
          ) : (
            <MaterialList materials={exams.slice(0, 3)} />
          )}
        </Panel>

        {recent.length > 0 && (
          <Panel title="Последно додадено">
            <MaterialList materials={recent} />
          </Panel>
        )}
      </div>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-1">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-accent-2" /> Следни активности
            </span>
          }
          action={
            <Link href={`/calendar?view=list&subject=${subjectId}`} className="flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink">
              Календар <ArrowRight size={13} />
            </Link>
          }
        >
          {schedule.length === 0 ? (
            <p className="text-sm text-ink-2">
              Нема закажани активности.{" "}
              <Link href={`/calendar?subject=${subjectId}`} className="text-accent-2 underline">
                Додај го распоредот
              </Link>
              .
            </p>
          ) : (
            <ScheduleList items={schedule} today={today} />
          )}
        </Panel>

        <Panel title="Состав по извор">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
            {ORIGIN_ORDER.map((o) => (
              <span key={o} className="h-full" style={{ width: `${(origins[o] / all.length) * 100}%`, background: ORIGIN_COLORS[o] }} />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {ORIGIN_ORDER.map((o) => (
              <li key={o} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[o] }} />
                <span className="flex-1 text-ink-2">{ORIGIN_LABELS[o]}</span>
                <span className="font-mono text-ink">{origins[o]}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Временска линија">
          <ul className="space-y-2">
            {timeline.map((g) => (
              <li key={g.key} className="grid grid-cols-[7.5rem_1fr_1.5rem] items-center gap-2 text-sm">
                <span className="truncate text-ink-2">{g.title}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(g.items.length / maxMonth) * 100}%` }} />
                </span>
                <span className="text-right font-mono text-ink">{g.items.length}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Според датумот на објава (или додавање) на материјалите.</p>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Sparkles size={16} /> Наскоро: AI
            </span>
          }
        >
          <p className="text-sm leading-relaxed text-ink-2">
            AI ќе ги чита материјалите на предметот и ќе ги извлече најважните теми, прашањата што доаѓаат на колоквиум и
            што кажал професорот, па ќе ти покаже на што да се фокусираш.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
