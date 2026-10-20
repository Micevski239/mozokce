"use client";

import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  File,
  FileImage,
  FileText,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  Presentation,
  Search,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Dialog } from "@/components/dialog";
import { Button, FormError, Input } from "@/components/ui";
import {
  fileFamily,
  formatBytes,
  formatDate,
  groupByMonth,
  groupByOrigin,
  KIND_LABELS,
  ORIGIN_COLORS,
  ORIGIN_HINTS,
  ORIGIN_LABELS,
  textStats,
  type MaterialGroup,
  type MaterialOrigin,
  type MaterialWithUrl,
} from "@/lib/materials";
import { timeAgo } from "@/lib/stats";
import { deleteMaterial, setMaterialPinned, updateMaterial } from "./actions";

const FILE_ICONS: Record<ReturnType<typeof fileFamily>, LucideIcon> = {
  pdf: FileText,
  image: FileImage,
  slides: Presentation,
  doc: FileText,
  text: FileText,
  other: File,
};

function iconFor(m: MaterialWithUrl): { icon: LucideIcon; tone: string } {
  if (m.kind === "chat") return { icon: MessagesSquare, tone: "bg-[rgba(124,92,255,.14)] text-[#7C5CFF]" };
  if (m.kind === "note") return { icon: StickyNote, tone: "bg-warn-soft text-warn" };
  const family = fileFamily(m.mime_type);
  return {
    icon: FILE_ICONS[family],
    tone: family === "pdf" ? "bg-danger-soft text-danger" : family === "slides" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent-2",
  };
}

interface Props {
  materials: MaterialWithUrl[];
  group?: "origin" | "month" | "none";
  variant?: "list" | "notes";
  searchable?: boolean;
  empty?: ReactNode;
  searchPlaceholder?: string;
}

export function MaterialList({
  materials,
  group = "none",
  variant = "list",
  searchable = false,
  empty,
  searchPlaceholder = "Пребарај…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<MaterialWithUrl | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? materials.filter((m) => [m.title, m.body, m.file_name].some((v) => v?.toLowerCase().includes(q))) : materials;
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [materials, query]);

  const groups: MaterialGroup<MaterialWithUrl>[] = useMemo(() => {
    if (group === "origin") return groupByOrigin(visible);
    if (group === "month") return groupByMonth(visible);
    return [{ key: "all", title: "", items: visible }];
  }, [group, visible]);

  async function remove(m: MaterialWithUrl) {
    if (!window.confirm(`„${m.title}“ ќе се избрише и за другите (по следниот git push). Продолжи?`)) return;
    setBusy(m.id);
    const { error } = await deleteMaterial(m.id).catch(() => ({ error: "x" }));
    setBusy(null);
    if (error) window.alert("Не може да се избрише.");
  }

  async function togglePin(m: MaterialWithUrl) {
    setBusy(m.id);
    await setMaterialPinned(m.id, !m.pinned).catch(() => undefined);
    setBusy(null);
  }

  async function copy(m: MaterialWithUrl) {
    await navigator.clipboard.writeText(m.body ?? "").catch(() => {});
    setCopied(m.id);
    setTimeout(() => setCopied(null), 1500);
  }

  if (materials.length === 0) return <>{empty}</>;

  const actions = (m: MaterialWithUrl, className = "flex shrink-0 items-center") => (
    <div className={className}>
      {m.kind === "file" && m.url && (
        <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="Отвори" aria-label="Отвори">
          <ExternalLink size={16} />
        </a>
      )}
      {m.kind !== "file" && (
        <button type="button" className="btn btn-ghost btn-icon" title="Копирај текст" aria-label="Копирај текст" onClick={() => copy(m)}>
          {copied === m.id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
        </button>
      )}
      <button
        type="button"
        className={`btn btn-ghost btn-icon ${m.pinned ? "!text-warn" : ""}`}
        title={m.pinned ? "Откачи од Важно" : "Закачи како Важно"}
        aria-label={m.pinned ? "Откачи од Важно" : "Закачи како Важно"}
        aria-pressed={m.pinned}
        disabled={busy === m.id}
        onClick={() => togglePin(m)}
      >
        {m.pinned ? <PinOff size={16} /> : <Pin size={16} />}
      </button>
      <button type="button" className="btn btn-ghost btn-icon" title="Уреди" aria-label="Уреди" onClick={() => setEditing(m)}>
        <Pencil size={15} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-icon hover:!text-danger"
        title="Избриши"
        aria-label="Избриши"
        disabled={busy === m.id}
        onClick={() => remove(m)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const meta = (m: MaterialWithUrl) => {
    const stats = m.kind !== "file" ? textStats(m.body ?? "") : null;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-3">
        {m.pinned && <span className="chip !px-2 !py-0 !text-warn">важно</span>}
        <span className="chip !px-2 !py-0">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORIGIN_COLORS[m.origin] }} />
          {ORIGIN_LABELS[m.origin]}
        </span>
        {m.source_date && <span>{formatDate(m.source_date)}</span>}
        {m.kind === "file" && <span>{formatBytes(m.size_bytes)}</span>}
        {stats && (
          <span>
            {stats.lines} {stats.lines === 1 ? "ред" : "редови"}
          </span>
        )}
        <span>
          · {m.created_by ? `${m.created_by}, ` : ""}
          {/* Релативното време може да се разликува за една минута меѓу серверот и прелистувачот. */}
          <time dateTime={m.created_at} suppressHydrationWarning>
            {timeAgo(m.created_at)}
          </time>
        </span>
      </div>
    );
  };

  const row = (m: MaterialWithUrl) => {
    const { icon: Icon, tone } = iconFor(m);
    const isText = m.kind !== "file";
    const isOpen = open === m.id;
    const isImage = m.kind === "file" && fileFamily(m.mime_type) === "image" && m.url;
    return (
      <li key={m.id} id={`m-${m.id}`} className={`fill overflow-hidden ${m.pinned ? "!border-[color-mix(in_oklab,var(--warn)_45%,transparent)]" : ""}`}>
        <div className="flex items-start gap-3 p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url!} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`} title={KIND_LABELS[m.kind]}>
              <Icon size={19} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {isText ? (
              <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-2 text-left" aria-expanded={isOpen}>
                <span className="truncate font-medium">{m.title}</span>
                <ChevronDown size={16} className={`shrink-0 text-ink-3 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <a href={m.url ?? undefined} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-accent-2">
                {m.title}
              </a>
            )}
            {meta(m)}
            {isText && !isOpen && <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-sm text-ink-2">{m.body}</p>}
          </div>
          {actions(m, "hidden shrink-0 items-center sm:flex")}
        </div>
        {/* На телефон акциите се во посебен ред, за насловот да има место. */}
        {actions(m, "flex items-center justify-end border-t border-[var(--line)] px-2 py-1 sm:hidden")}
        {isText && isOpen && (
          <div className="max-h-[28rem] overflow-y-auto border-t border-[var(--line)] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {m.body}
          </div>
        )}
      </li>
    );
  };

  const note = (m: MaterialWithUrl) => (
    <li
      key={m.id}
      id={`m-${m.id}`}
      className={`fill flex flex-col p-4 ${m.pinned ? "!border-[color-mix(in_oklab,var(--warn)_45%,transparent)]" : ""}`}
    >
      <div className="flex items-start gap-2">
        <StickyNote size={16} className="mt-1 shrink-0 text-warn" />
        <h3 className="min-w-0 flex-1 font-semibold leading-snug">{m.title}</h3>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{m.body}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-[var(--line)] pt-2">
        {meta(m)}
        {actions(m)}
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="input !pl-10" />
        </div>
      )}
      {visible.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-ink-2">Ништо не одговара на пребарувањето.</p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="space-y-2">
            {g.title && (
              <div className="flex items-center gap-2 px-1 pt-1">
                {group === "origin" && (
                  <span className="h-2 w-2 rounded-full" style={{ background: ORIGIN_COLORS[g.key as MaterialOrigin] }} />
                )}
                <h3 className="kicker !text-ink-2">{g.title}</h3>
                <span className="font-mono text-[11px] text-ink-3">{g.items.length}</span>
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>
            )}
            <ul className={variant === "notes" ? "auto-grid [--min:19rem]" : "space-y-2"}>
              {g.items.map((m) => (variant === "notes" ? note(m) : row(m)))}
            </ul>
          </div>
        ))
      )}
      {editing && <EditMaterial material={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const ORIGINS: MaterialOrigin[] = ["official", "exam", "student", "other"];

function EditMaterial({ material, onClose }: { material: MaterialWithUrl; onClose: () => void }) {
  const [title, setTitle] = useState(material.title);
  const [origin, setOrigin] = useState<MaterialOrigin>(material.origin);
  const [sourceDate, setSourceDate] = useState(material.source_date ?? "");
  const [body, setBody] = useState(material.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return setError("Насловот не може да е празен.");
    if (material.kind !== "file" && !body.trim()) return setError("Текстот не може да е празен.");
    setSaving(true);
    const { error: e } = await updateMaterial(material.id, {
      title,
      origin,
      sourceDate: sourceDate || null,
      ...(material.kind !== "file" ? { body } : {}),
    }).catch(() => ({ error: "Не може да се зачува." }));
    setSaving(false);
    if (e) return setError(e);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title="Уреди материјал" kicker={KIND_LABELS[material.kind]} wide={material.kind !== "file"}>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="kicker">Наслов</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        {material.kind !== "file" && (
          <label className="block space-y-1.5">
            <span className="kicker">Текст</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="input min-h-40 resize-y leading-relaxed" />
          </label>
        )}
        <div className="space-y-1.5">
          <span className="kicker">Извор</span>
          <div className="flex flex-wrap gap-1.5">
            {ORIGINS.map((o) => (
              <button
                key={o}
                type="button"
                title={ORIGIN_HINTS[o]}
                aria-pressed={origin === o}
                onClick={() => setOrigin(o)}
                className={`chip !py-1.5 ${origin === o ? "chip-accent" : "hover:!border-[var(--accent-line)]"}`}
              >
                {ORIGIN_LABELS[o]}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="kicker">Датум</span>
          <Input type="date" value={sourceDate} onChange={(e) => setSourceDate(e.target.value)} className="sm:w-48" />
        </label>
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
    </Dialog>
  );
}
