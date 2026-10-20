import { Archive, BookOpen, Plus } from "lucide-react";
import { ActionForm } from "@/components/forms";
import { SubjectCard } from "@/components/subject-card";
import { EmptyState, Input, PageHeader, Panel } from "@/components/ui";
import { loadSubjectOverviews } from "@/lib/data";
import { createSubject } from "../actions";

export default async function SubjectsPage() {
  const subjects = await loadSubjectOverviews({ includeArchived: true });
  const active = subjects.filter((s) => !s.archived);
  const archived = subjects.filter((s) => s.archived);

  return (
    <div className="w-full space-y-[var(--gap)]">
      <PageHeader kicker="Семестар" title="Предмети" subtitle="Секој предмет ги чува своите материјали, чатови и белешки." />

      <Panel>
        {active.length === 0 ? (
          <EmptyState icon={<BookOpen size={24} strokeWidth={1.75} />} title="Нема активни предмети">
            Додај ги предметите што ги полагаш овој семестар.
          </EmptyState>
        ) : (
          <div className="auto-grid">
            {active.map((s) => (
              <SubjectCard key={s.id} subject={s} />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Plus size={16} /> Нов предмет
          </span>
        }
      >
        <ActionForm action={createSubject} submitLabel="Додај предмет" className="flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-start">
          <Input name="code" placeholder="Кратенка, на пр. ИС" maxLength={12} className="sm:!w-44 sm:shrink-0" aria-label="Кратенка" />
          <Input name="name" placeholder="Име, на пр. Интегрирани системи" required aria-label="Име на предметот" />
        </ActionForm>
      </Panel>

      {archived.length > 0 && (
        <Panel>
          <details>
            <summary className="flex cursor-pointer items-center gap-2 font-mono text-sm font-semibold text-ink-2">
              <Archive size={16} /> Архивирани предмети ({archived.length})
            </summary>
            <div className="auto-grid mt-4">
              {archived.map((s) => (
                <SubjectCard key={s.id} subject={s} />
              ))}
            </div>
          </details>
        </Panel>
      )}
    </div>
  );
}
