"use client";

import { useState } from "react";
import { updateUsername } from "@/app/(app)/actions";
import { initial } from "@/lib/username";
import { Dialog } from "./dialog";
import { ActionForm } from "./forms";
import { Input } from "./ui";

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="chip-accent flex shrink-0 items-center justify-center rounded-full border font-mono text-[13px] font-bold"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial(name)}
    </span>
  );
}

/**
 * Името во лентата; клик отвора прозорец за промена. `compact` = само аватар (горна лента на телефон).
 * Нема сметки: профилот е локален (.mozokce/profile.json), како и напредокот.
 */
export function ProfileButton({ username, compact = false }: { username: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? "btn btn-ghost btn-icon" : "flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl p-1.5 text-left transition hover:bg-[var(--pill-hover)]"}
        title="Профил"
        aria-label={`Профил: ${username}`}
      >
        <Avatar name={username} size={compact ? 28 : 32} />
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{username}</span>
            <span className="block truncate font-mono text-[10.5px] text-ink-3">Профил</span>
          </span>
        )}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Профил" kicker="На овој компјутер">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={username} size={44} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{username}</div>
              <div className="text-sm text-ink-3">Напредокот со прашањата се чува само на овој компјутер.</div>
            </div>
          </div>
          <ActionForm action={updateUsername} submitLabel="Зачувај" variant="primary">
            <label className="block space-y-1.5">
              <span className="kicker">Име</span>
              <Input name="username" defaultValue={username} minLength={3} maxLength={24} autoComplete="username" required />
            </label>
            <p className="text-xs text-ink-3">3–24 знаци: букви, бројки и _ . -. Се прикажува во лентата и кај материјалите што ги додаваш.</p>
          </ActionForm>
        </div>
      </Dialog>
    </>
  );
}
