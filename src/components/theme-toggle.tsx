"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE } from "@/lib/theme";

/**
 * Прекинувач светла/темна тема. Додека корисникот не избере, се следи темата на системот.
 * Иконата ја бира CSS-от (.theme-to-dark / .theme-to-light во globals.css) според
 * активната тема, па нема разлика меѓу серверот и прелистувачот.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const isDark =
      root.dataset.theme === "dark" || (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button type="button" onClick={toggle} className={`btn btn-ghost btn-icon ${className}`} aria-label="Промени тема" title="Светла / темна тема">
      <Moon size={18} strokeWidth={1.75} className="theme-to-dark" />
      <Sun size={18} strokeWidth={1.75} className="theme-to-light" />
    </button>
  );
}
