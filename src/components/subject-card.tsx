import { FileText, FileUp, MessagesSquare, Pin, StickyNote } from "lucide-react";
import Link from "next/link";
import { ORIGIN_COLORS, ORIGIN_LABELS, ORIGIN_ORDER } from "@/lib/materials";
import { timeAgo } from "@/lib/stats";
import type { SubjectOverview } from "@/lib/subjects";
import { SubjectCover } from "./ui";

export function SubjectCard({ subject }: { subject: SubjectOverview }) {
  const { counts, origins } = subject;
  const base = `/subjects/${subject.id}`;
  return (
    <div className="fill flex flex-col gap-3 p-2 transition hover:border-[var(--accent-line)]">
      <Link href={base} className="block">
        <SubjectCover id={subject.id} name={subject.name} code={subject.code} className="h-32 p-4">
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex flex-wrap gap-1.5">
              {subject.code && <span className="chip !border-white/40 !bg-white/20 normal-case !tracking-normal !text-white">{subject.code}</span>}
              <span className="chip !border-white/30 !bg-black/20 !text-white/90">
                {counts.total} {counts.total === 1 ? "материјал" : "материјали"}
              </span>
              {counts.pinned > 0 && (
                <span className="chip !border-white/30 !bg-black/20 !text-white/90">
                  <Pin size={11} /> {counts.pinned}
                </span>
              )}
            </div>
            <span className="display text-2xl font-semibold leading-tight text-white drop-shadow-sm">{subject.name}</span>
          </div>
        </SubjectCover>
      </Link>

      <div className="space-y-3 px-2 pb-1">
        {counts.total > 0 ? (
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
            title={ORIGIN_ORDER.map((o) => `${ORIGIN_LABELS[o]}: ${origins[o]}`).join(" · ")}
          >
            {ORIGIN_ORDER.map((o) => (
              <span key={o} className="h-full" style={{ width: `${(origins[o] / counts.total) * 100}%`, background: ORIGIN_COLORS[o] }} />
            ))}
          </div>
        ) : (
          <div className="h-1.5 w-full rounded-full bg-[var(--line)]" />
        )}

        <div className="flex items-center justify-between gap-2 text-sm text-ink-2">
          <span className="flex items-center gap-3">
            <Link href={`${base}?tab=files`} className="flex items-center gap-1 hover:text-ink" title="Датотеки">
              <FileText size={14} /> <span className="font-mono">{counts.file}</span>
            </Link>
            <Link href={`${base}?tab=chats`} className="flex items-center gap-1 hover:text-ink" title="Discord чатови">
              <MessagesSquare size={14} /> <span className="font-mono">{counts.chat}</span>
            </Link>
            <Link href={`${base}?tab=notes`} className="flex items-center gap-1 hover:text-ink" title="Белешки">
              <StickyNote size={14} /> <span className="font-mono">{counts.note}</span>
            </Link>
          </span>
          <span className="truncate font-mono text-[11px] text-ink-3">
            {subject.lastAddedAt ? timeAgo(subject.lastAddedAt) : "празно"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--line)] pt-2.5">
          {[
            { add: "file", label: "Качи", icon: FileUp },
            { add: "chat", label: "Чат", icon: MessagesSquare },
            { add: "note", label: "Белешка", icon: StickyNote },
          ].map(({ add, label, icon: Icon }) => (
            <Link key={add} href={`${base}?add=${add}`} className="btn btn-ghost !min-h-8 !px-2 !text-xs" title={`Додај: ${label}`}>
              <Icon size={14} /> {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
