"use client";

import { FileUp, MessagesSquare, StickyNote } from "lucide-react";
import { useCallback, useState } from "react";
import { Dialog } from "@/components/dialog";
import type { MaterialKind } from "@/lib/materials";
import { MaterialComposer } from "./material-composer";

const ACTIONS: { kind: MaterialKind; label: string; short: string; icon: typeof FileUp }[] = [
  { kind: "file", label: "Качи датотеки", short: "Качи", icon: FileUp },
  { kind: "chat", label: "Discord чат", short: "Чат", icon: MessagesSquare },
  { kind: "note", label: "Белешка", short: "Белешка", icon: StickyNote },
];

/**
 * Копчињата за додавање и прозорецот со формата. `autoOpen` (од ?add= во адресата)
 * го отвора прозорецот веднаш, на пр. од брзите копчиња на почетната.
 */
export function AddMaterial({
  subjectId,
  today,
  autoOpen,
  tone = "light",
  only,
}: {
  subjectId: string;
  today: string;
  autoOpen?: MaterialKind | null;
  tone?: "light" | "onCover";
  only?: MaterialKind;
}) {
  const [open, setOpen] = useState<MaterialKind | null>(autoOpen ?? null);

  const close = useCallback(() => {
    setOpen(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("add")) {
      url.searchParams.delete("add");
      window.history.replaceState(null, "", url);
    }
  }, []);

  const actions = only ? ACTIONS.filter((a) => a.kind === only) : ACTIONS;
  const onCover = tone === "onCover";

  return (
    <>
      {/* На телефон: три еднакви копчиња во ред со кратки натписи. */}
      <div className={actions.length > 1 ? "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" : "flex"}>
        {actions.map(({ kind, label, short, icon: Icon }, i) => (
          <button
            key={kind}
            type="button"
            onClick={() => setOpen(kind)}
            className={
              onCover
                ? `btn !border-white/40 !px-3 !text-white backdrop-blur-md sm:!px-[18px] ${i === 0 ? "!bg-white/25 hover:!bg-white/35" : "!bg-black/15 hover:!bg-black/25"}`
                : `btn !px-3 sm:!px-[18px] ${i === 0 ? "btn-primary" : ""}`
            }
          >
            <Icon size={16} className="shrink-0" />
            {actions.length > 1 ? (
              <>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onClose={close} title="Додај материјал" kicker="Нов материјал" wide>
        {open && <MaterialComposer key={open} subjectId={subjectId} today={today} initialTab={open} onDone={close} />}
      </Dialog>
    </>
  );
}
