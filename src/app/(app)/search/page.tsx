import { FileText, MessagesSquare, SearchX, StickyNote } from "lucide-react";
import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { EmptyState, PageHeader, Panel, subjectTint } from "@/components/ui";
import { formatDate, KIND_LABELS, ORIGIN_LABELS, type MaterialKind, type MaterialOrigin } from "@/lib/materials";
import { listMaterials, listSubjects } from "@/lib/data";
import { sanitizeSearch, snippet } from "@/lib/subjects";

const KIND_ICONS = { file: FileText, chat: MessagesSquare, note: StickyNote } as const;
const TAB_FOR: Record<MaterialKind, string> = { file: "files", chat: "chats", note: "notes" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const raw = (await searchParams).q;
  const q = sanitizeSearch(typeof raw === "string" ? raw : "");
  // Пребарување низ насловите, имињата на датотеките и текстот (без разлика на големи/мали букви).
  const [materials, subjects] = q.length >= 2 ? await Promise.all([listMaterials(), listSubjects()]) : [[], []];
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const needle = q.toLowerCase();
  const results = materials
    .filter((m) => [m.title, m.body, m.file_name].some((v) => v?.toLowerCase().includes(needle)))
    .slice(0, 100)
    .map((m) => ({ ...m, subjects: { name: subjectName.get(m.subject_id) ?? "Предмет" } }));

  const bySubject = new Map<string, typeof results>();
  for (const r of results) bySubject.set(r.subject_id, [...(bySubject.get(r.subject_id) ?? []), r]);

  return (
    <div className="w-full space-y-[var(--gap)]">
      <PageHeader
        kicker="Пребарување"
        title={q ? `„${q}“` : "Пребарај"}
        subtitle={q ? `${results?.length ?? 0} резултати во ${bySubject.size} предмети` : "Низ насловите на датотеките и целиот текст на чатовите и белешките."}
      />
      <div className="max-w-3xl">
        <SearchBox defaultValue={q} autoFocus={!q} />
      </div>

      {q && !results?.length && (
        <Panel>
          <EmptyState icon={<SearchX size={24} strokeWidth={1.75} />} title="Нема резултати">
            Пробај со друг збор или пократок дел од зборот.
          </EmptyState>
        </Panel>
      )}

      {[...bySubject.entries()].map(([subjectId, items]) => (
        <Panel
          key={subjectId}
          title={
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectTint(subjectId) }} />
              {items[0].subjects?.name}
              <span className="font-mono text-xs text-ink-3">{items.length}</span>
            </span>
          }
        >
          <ul className="space-y-2">
            {items.map((m) => {
              const Icon = KIND_ICONS[m.kind as MaterialKind];
              const hit = snippet(m.body ?? "", q) ?? snippet(m.file_name ?? "", q);
              return (
                <li key={m.id}>
                  <Link
                    href={`/subjects/${subjectId}?tab=${TAB_FOR[m.kind as MaterialKind]}#m-${m.id}`}
                    className="fill flex items-start gap-3 p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-2">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.title}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
                        {KIND_LABELS[m.kind as MaterialKind]} · {ORIGIN_LABELS[m.origin as MaterialOrigin]}
                        {m.source_date && ` · ${formatDate(m.source_date)}`}
                      </span>
                      {hit && (
                        <span className="mt-1.5 block text-sm text-ink-2">
                          {hit.before}
                          <mark className="rounded bg-accent-soft px-0.5 text-ink">{hit.match}</mark>
                          {hit.after}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
