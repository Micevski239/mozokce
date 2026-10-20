"use client";

import { BookOpen, CalendarDays, Compass, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Почетна", icon: House, match: (p: string) => p === "/" || p.startsWith("/search") },
  { href: "/subjects", label: "Предмети", icon: BookOpen, match: (p: string) => p.startsWith("/subjects") },
  { href: "/calendar", label: "Календар", icon: CalendarDays, match: (p: string) => p.startsWith("/calendar") },
  { href: "/guide", label: "Водич", icon: Compass, match: (p: string) => p.startsWith("/guide") },
];

/** Главна навигација: вертикална во лентата (desktop) или јазичиња долу (телефон/таблет). */
export function NavLinks({ className = "", variant = "sidebar" }: { className?: string; variant?: "sidebar" | "tabbar" }) {
  const pathname = usePathname();
  const tabbar = variant === "tabbar";
  return (
    <nav className={className} aria-label="Главна навигација">
      {ITEMS.map(({ href, label, icon: Icon, match }) => (
        <Link
          key={href}
          href={href}
          aria-current={match(pathname) ? "page" : undefined}
          className={tabbar ? "nav-link flex-col justify-center !gap-1 !py-2 text-[11px]" : "nav-link"}
        >
          <Icon size={tabbar ? 20 : 19} strokeWidth={1.75} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
