import { Brain } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "./nav-links";
import { ProfileButton } from "./profile-button";
import { ThemeToggle } from "./theme-toggle";

interface ShellProps {
  children: ReactNode;
  username: string;
}

function Logo() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 px-1">
      <span className="chip-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
        <Brain size={19} strokeWidth={1.75} />
      </span>
      <span className="display truncate text-[19px] font-semibold">Мозокче</span>
    </Link>
  );
}

/**
 * Рамка на апликацијата.
 * - desktop (≥ lg): лента лево, содржината ја зафаќа целата преостаната ширина;
 * - телефон/таблет: горна лента (лого, тема, профил) и долна навигација со јазичиња.
 * Целата рамка е ограничена на 1920px за многу широки екрани.
 */
export function AppShell({ children, username }: ShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1920px] gap-[var(--gap)] p-3 sm:p-4 lg:p-[var(--gap)]">
      <aside className="glass sticky top-[var(--gap)] hidden h-[calc(100dvh-2*var(--gap))] w-60 shrink-0 flex-col p-4 lg:flex 2xl:w-64">
        <Logo />
        <NavLinks className="mt-7 flex flex-col gap-1" />
        <div className="mt-auto flex items-center gap-1 border-t border-[var(--line)] pt-3">
          <ProfileButton username={username} />
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4 lg:gap-[var(--gap)]">
        <header className="glass flex items-center gap-1 py-2 pl-3 pr-2 lg:hidden">
          <Logo />
          <div className="ml-auto flex items-center">
            <ThemeToggle />
            <ProfileButton username={username} compact />
          </div>
        </header>
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
      </div>

      <NavLinks variant="tabbar" className="glass tabbar fixed inset-x-3 z-40 grid grid-cols-4 gap-1 p-1.5 sm:inset-x-4 lg:hidden" />
    </div>
  );
}
