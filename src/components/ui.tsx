import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "",
  ghost: "btn-ghost",
  danger: "btn-danger",
};
const SIZES: Record<Size, string> = { md: "", lg: "btn-lg", icon: "btn-icon" };

export function buttonClass(variant: Variant = "secondary", extra = "", size: Size = "md") {
  return `btn ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, className, size)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, className, size)} {...props} />;
}

/** Стаклен панел со опционален наслов (mono) и акција десно. */
export function Panel({
  title,
  action,
  className = "",
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`glass p-4 sm:p-5 ${className}`} {...props}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && <h2 className="display min-w-0 text-[15px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`input ${className}`} {...props} />;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "success" | "danger" | "accent" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent-2" : "";
  return (
    <div className="fill px-4 py-3">
      <div className="kicker">{label}</div>
      <div className={`display mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-3">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-2">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
  crumbs,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: { href?: string; label: string }[];
}) {
  return (
    <header className="space-y-2 px-1 pt-1">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {kicker && <div className="kicker mb-1">{kicker}</div>}
          <h1 className="display text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{message}</p>;
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-2xl bg-success-soft px-4 py-2.5 text-sm text-success">{message}</p>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {icon && <div className="fill flex h-14 w-14 items-center justify-center text-ink-2">{icon}</div>}
      <div className="display text-lg font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-ink-2">{children}</div>}
    </div>
  );
}

// ---- идентитет на предмет ---------------------------------------------------

const SUBJECT_TINTS = ["#2F7DF6", "#7C5CFF", "#12A594", "#E5484D", "#F76B15", "#0EA5E9", "#D6409F", "#30A46C"];

export function subjectTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SUBJECT_TINTS[h % SUBJECT_TINTS.length];
}

function monogram(name: string): string {
  const words = name.trim().split(/[\s\-–]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Обоена „корица“ на предметот (како насловните слики кај Coachfio). */
export function SubjectCover({
  id,
  name,
  code,
  className = "",
  children,
  style,
}: {
  id: string;
  name: string;
  /** Кратенка (на пр. „ИС“); ако ја нема, се прави од името. */
  code?: string | null;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const tint = subjectTint(id);
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] ${className}`}
      style={{
        background: `radial-gradient(120% 90% at 85% 10%, color-mix(in oklab, ${tint} 70%, white) 0%, transparent 55%), linear-gradient(135deg, color-mix(in oklab, ${tint} 55%, #070d1a) 0%, ${tint} 100%)`,
        ...style,
      }}
    >
      <span
        aria-hidden
        className="display pointer-events-none absolute -bottom-3 right-3 select-none text-[64px] font-bold leading-none text-white/15"
      >
        {code?.trim() || monogram(name)}
      </span>
      {children}
    </div>
  );
}
