"use client";

import { CircleCheck, CircleX, FileUp, LoaderCircle, MessagesSquare, StickyNote, Upload, X, type LucideIcon } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Button, FormError, FormNotice, Input } from "@/components/ui";
import {
  ACCEPT_ATTR,
  DEFAULT_ORIGIN,
  formatBytes,
  formatDate,
  isAcceptedFile,
  MAX_FILE_BYTES,
  ORIGIN_HINTS,
  ORIGIN_LABELS,
  textStats,
  type MaterialKind,
  type MaterialOrigin,
} from "@/lib/materials";
import { addTextMaterial, uploadMaterial } from "./actions";

interface PendingFile {
  key: string;
  file: File;
  state: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const TABS: { kind: MaterialKind; label: string; icon: LucideIcon }[] = [
  { kind: "file", label: "Датотеки", icon: FileUp },
  { kind: "chat", label: "Discord чат", icon: MessagesSquare },
  { kind: "note", label: "Белешка", icon: StickyNote },
];

const ORIGINS: MaterialOrigin[] = ["official", "exam", "student", "other"];

export function MaterialComposer({
  subjectId,
  today,
  initialTab = "file",
  onDone,
}: {
  subjectId: string;
  today: string;
  initialTab?: MaterialKind;
  /** Се повикува по успешно зачувување (на пр. за да се затвори прозорецот). */
  onDone?: () => void;
}) {
  const [tab, setTab] = useState<MaterialKind>(initialTab);
  const [origin, setOrigin] = useState<MaterialOrigin>(DEFAULT_ORIGIN[initialTab]);
  const [sourceDate, setSourceDate] = useState(today);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function switchTab(kind: MaterialKind) {
    setTab(kind);
    setOrigin(DEFAULT_ORIGIN[kind]);
    setError(null);
    setNotice(null);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added: PendingFile[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      if (!isAcceptedFile(file.name, file.type)) rejected.push(`${file.name}: типот не е поддржан`);
      else if (file.size > MAX_FILE_BYTES) rejected.push(`${file.name}: поголема од 50 MB`);
      else added.push({ key: `${file.name}-${file.size}-${file.lastModified}`, file, state: "pending" });
    }
    setFiles((prev) => [...prev.filter((p) => p.state !== "done"), ...added.filter((a) => !prev.some((p) => p.key === a.key))]);
    setError(rejected.length ? rejected.join(" · ") : null);
    setNotice(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  const setFileState = (key: string, patch: Partial<PendingFile>) =>
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  async function uploadFiles() {
    const queue = files.filter((f) => f.state === "pending" || f.state === "error");
    if (!queue.length) return;
    setBusy(true);
    setError(null);
    let ok = 0;
    for (const item of queue) {
      setFileState(item.key, { state: "uploading", error: undefined });
      const form = new FormData();
      form.set("file", item.file);
      form.set("subject_id", subjectId);
      form.set("origin", origin);
      form.set("source_date", sourceDate);
      const { error: uploadError } = await uploadMaterial(form).catch(() => ({ error: "качувањето не успеа" }));
      if (uploadError) {
        setFileState(item.key, { state: "error", error: uploadError });
        continue;
      }
      setFileState(item.key, { state: "done" });
      ok++;
    }
    setBusy(false);
    if (ok) {
      setNotice(`Качени ${ok} ${ok === 1 ? "датотека" : "датотеки"}.`);
      if (ok === queue.length) onDone?.();
    }
  }

  async function saveText() {
    const text = body.trim();
    const name = title.trim();
    if (!text) return setError(tab === "chat" ? "Залепи ги пораките од чатот." : "Напиши ја белешката.");
    if (tab === "note" && !name) return setError("Дај ѝ наслов на белешката.");
    setBusy(true);
    setError(null);
    const { error: insertError } = await addTextMaterial({
      subjectId,
      kind: tab === "chat" ? "chat" : "note",
      title: name || `Discord чат${sourceDate ? ` · ${formatDate(sourceDate)}` : ""}`,
      body: text,
      origin,
      sourceDate: sourceDate || null,
    }).catch(() => ({ error: "x" }));
    setBusy(false);
    if (insertError) return setError("Не може да се зачува.");
    setTitle("");
    setBody("");
    setNotice(tab === "chat" ? "Чатот е зачуван." : "Белешката е зачувана.");
    onDone?.();
  }

  const stats = textStats(body);
  const pendingCount = files.filter((f) => f.state === "pending" || f.state === "error").length;

  return (
    <div className="space-y-4">
      <div className="fill grid grid-cols-3 gap-1 p-1" role="tablist">
        {TABS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => switchTab(kind)}
            className={`flex items-center justify-center gap-2 rounded-[14px] px-2 py-2.5 font-mono text-[13px] font-semibold transition ${
              tab === kind ? "bg-[var(--pill-on)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.3)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {tab === "file" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center gap-2 rounded-[18px] border-2 border-dashed px-4 py-8 text-center transition ${
              dragging ? "border-accent bg-accent-soft" : "border-[var(--line-2)] hover:border-[var(--accent-line)] hover:bg-[var(--pill-hover)]"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-2">
              <Upload size={22} />
            </span>
            <span className="font-mono text-sm font-semibold">Повлечи датотеки тука или кликни за избор</span>
            <span className="text-xs text-ink-3">PDF, слики, презентации, Word, текст · до 50 MB по датотека</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li key={f.key} className="fill flex items-center gap-3 px-3 py-2 text-sm">
                  {f.state === "uploading" ? (
                    <LoaderCircle size={16} className="shrink-0 animate-spin text-accent-2" />
                  ) : f.state === "done" ? (
                    <CircleCheck size={16} className="shrink-0 text-success" />
                  ) : f.state === "error" ? (
                    <CircleX size={16} className="shrink-0 text-danger" />
                  ) : (
                    <FileUp size={16} className="shrink-0 text-ink-3" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-3">{f.error ?? formatBytes(f.file.size)}</span>
                  {f.state !== "uploading" && f.state !== "done" && (
                    <button
                      type="button"
                      className="text-ink-3 hover:text-ink"
                      aria-label="Отстрани"
                      onClick={() => setFiles((prev) => prev.filter((p) => p.key !== f.key))}
                    >
                      <X size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tab === "chat" ? "Наслов (опционално), на пр. #kolokvium канал" : "Наслов, на пр. Професорот за кол2"}
            maxLength={200}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={tab === "chat" ? 10 : 6}
            placeholder={
              tab === "chat"
                ? "Залепи ги пораките од Discord (Ctrl+V). Може заедно со имињата и времињата, ништо не мора да се чисти."
                : "Што треба да се запамети за овој предмет?"
            }
            className="input min-h-40 resize-y leading-relaxed"
          />
          {body && (
            <div className="font-mono text-[11px] text-ink-3">
              {stats.lines} {stats.lines === 1 ? "ред" : "редови"} · {stats.chars.toLocaleString("mk-MK")} знаци
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <div className="kicker">Извор</div>
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
        <label className="space-y-1.5">
          <span className="kicker block">{tab === "chat" ? "Датум на разговорот" : "Датум на објава"}</span>
          <Input type="date" value={sourceDate} max={today} onChange={(e) => setSourceDate(e.target.value)} className="!min-h-9 !py-1.5 sm:w-44" />
        </label>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="flex justify-end">
        {tab === "file" ? (
          <Button variant="primary" onClick={uploadFiles} disabled={busy || pendingCount === 0}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            Качи {pendingCount > 0 ? `(${pendingCount})` : ""}
          </Button>
        ) : (
          <Button variant="primary" onClick={saveText} disabled={busy || !body.trim()}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
            Зачувај
          </Button>
        )}
      </div>
    </div>
  );
}
