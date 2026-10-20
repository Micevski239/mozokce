"use client";

import {
  BookOpen,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Settings2,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export type SubjectTab = "overview" | "topics" | "questions" | "files" | "chats" | "notes" | "settings";
type CountKey = "topic" | "question" | "file" | "chat" | "note";

const TABS: { key: SubjectTab; label: string; icon: LucideIcon; count?: CountKey }[] = [
  { key: "overview", label: "Преглед", icon: LayoutDashboard },
  { key: "topics", label: "Теми", icon: BookOpen, count: "topic" },
  { key: "questions", label: "Прашања", icon: ListChecks, count: "question" },
  { key: "files", label: "Датотеки", icon: FileText, count: "file" },
  { key: "chats", label: "Discord", icon: MessagesSquare, count: "chat" },
  { key: "notes", label: "Белешки", icon: StickyNote, count: "note" },
  { key: "settings", label: "Поставки", icon: Settings2 },
];

/**
 * Менува јазиче без барање до серверот: ги менува само `?tab=` во адресата
 * (history.pushState, кој Next го синхронизира со useSearchParams). Сите делови се
 * веќе вчитани, па промената е моментална, а „назад“ во прелистувачот работи.
 */
function goToTab(tab: SubjectTab) {
  const url = new URL(window.location.href);
  if (tab === "overview") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  url.searchParams.delete("add");
  window.history.pushState(null, "", url);
}

/** Јазичињата „Теми“ и „Прашања“ постојат само кога предметот има мозок (нема панел → нема јазиче). */
export function SubjectTabs({
  counts,
  panels,
}: {
  counts: Partial<Record<CountKey, number>>;
  panels: Partial<Record<SubjectTab, ReactNode>> & { overview: ReactNode };
}) {
  const requested = useSearchParams().get("tab");
  const tabs = TABS.filter((t) => panels[t.key] !== undefined);
  const tab = tabs.find((t) => t.key === requested)?.key ?? "overview";
  return (
    <>
      <nav className="glass scroll-x flex gap-1 p-1.5" aria-label="Делови на предметот">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => goToTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className="nav-link shrink-0 !py-2 text-[13px]"
          >
            <Icon size={16} /> {label}
            {count && counts[count] !== undefined && <span className="font-mono text-[11px] text-ink-3">{counts[count]}</span>}
          </button>
        ))}
      </nav>
      {panels[tab]}
    </>
  );
}

/** Линк до друго јазиче од внатрешноста на панел (на пр. „Види ги сите“). */
export function TabLink({ tab, children, className }: { tab: SubjectTab; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => goToTab(tab)} className={className}>
      {children}
    </button>
  );
}
