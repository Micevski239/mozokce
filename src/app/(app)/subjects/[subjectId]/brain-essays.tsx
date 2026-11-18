"use client";

import { ChevronDown, Eye, EyeOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BrainText, SourceChips } from "@/components/brain-ui";
import { EmptyState, Input, Panel } from "@/components/ui";
import type { Brain } from "@/lib/brain";

/**
 * Есејски прашања со идеален одговор: прво се чита прашањето, па „Покажи го одговорот“.
 * Служи за вежбање на отворени прашања, кои квизот со понудени одговори не ги покрива.
 */
export function BrainEssays({ brain }: { brain: Brain }) {
  const groups = useMemo(() => [...new Set(brain.essays.map((e) => e.group))], [brain.essays]);
  const [group, setGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const visible = brain.essays.filter(
    (e) => (group === null || e.group === group) && (!q || `${e.question} ${e.answer}`.toLowerCase().includes(q)),
  );
  const allOpen = visible.length > 0 && visible.every((e) => open.has(e.id));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setOpen((prev) => {
      const next = new Set(prev);
      for (const e of visible) {
        if (allOpen) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)]">
      <Panel
        title="Есејски прашања"
        action={
          <button type="button" onClick={toggleAll} className="btn !py-1.5 text-xs">
            {allOpen ? <EyeOff size={14} /> : <Eye size={14} />} {allOpen ? "Сокриј ги одговорите" : "Покажи ги сите одговори"}
          </button>
        }
      >
        <p className="text-sm text-ink-2">
          Прочитај го прашањето, одговори на глас или на хартија (дефиниција, предности, недостатоци, пример), па отвори го идеалниот одговор и спореди.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {groups.length > 1 && (
            <>
              <button type="button" onClick={() => setGroup(null)} aria-pressed={group === null} className={`chip ${group === null ? "!border-[var(--accent)]" : ""}`}>
                Сите ({brain.essays.length})
              </button>
              {groups.map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={`chip ${group === g ? "!border-[var(--accent)]" : ""}`}>
                  {g} ({brain.essays.filter((e) => e.group === g).length})
                </button>
              ))}
            </>
          )}
          <label className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пребарај прашање или одговор…" className="!pl-9" />
          </label>
        </div>
      </Panel>

      {visible.length === 0 ? (
        <EmptyState icon={<Search size={24} strokeWidth={1.75} />} title="Нема резултати">
          Пробај друг збор или избери „Сите“.
        </EmptyState>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {visible.map((e, i) => {
            const isOpen = open.has(e.id);
            return (
              <li key={e.id} className="glass p-4 sm:p-5">
                <button type="button" onClick={() => toggle(e.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 text-left">
                  <span className="mt-0.5 font-mono text-xs text-ink-3">{i + 1}.</span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium leading-relaxed">
                    <BrainText text={e.question} />
                  </span>
                  <ChevronDown size={18} className={`mt-0.5 shrink-0 text-ink-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="fill mt-3 p-3 sm:p-4">
                    <p className="kicker mb-1.5">Идеален одговор</p>
                    <p className="text-[14.5px] leading-relaxed">
                      <BrainText text={e.answer} />
                    </p>
                    <div className="mt-3">
                      <SourceChips ids={e.sources} brain={brain} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
