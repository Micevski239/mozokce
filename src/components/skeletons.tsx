import type { ReactNode } from "react";

/**
 * Скелети за loading.tsx. Секој ја има формата на својата страница (истите панели,
 * мрежи и ширини), за кога ќе стигне содржината ништо да не скока.
 */

export function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

function Loading({ children }: { children: ReactNode }) {
  return (
    <div className="w-full space-y-[var(--gap)]" role="status" aria-live="polite" aria-busy>
      <span className="sr-only">Се вчитува…</span>
      {children}
    </div>
  );
}

const MAIN_WITH_RAIL =
  "grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]";
const RAIL = "grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-1";

function PanelSkeleton({ rows = 3, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="glass space-y-3 p-4 sm:p-5">
      {title && <Bar className="mb-1 h-4 w-32" />}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bar className="h-10 w-10 shrink-0 !rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className="h-3.5 w-3/5" />
            <Bar className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeaderSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="space-y-2 px-1 pt-1">
      <Bar className="h-3 w-24" />
      <Bar className={`h-8 ${wide ? "w-72" : "w-48"} max-w-full`} />
      <Bar className="h-4 w-80 max-w-full" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="fill space-y-2 px-4 py-3">
          <Bar className="h-3 w-16" />
          <Bar className="h-7 w-10" />
          <Bar className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function SubjectCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="auto-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="fill space-y-3 p-2">
          <Bar className="h-32 !rounded-[18px]" />
          <div className="space-y-3 px-2 pb-1">
            <Bar className="h-1.5 w-full" />
            <Bar className="h-3.5 w-1/2" />
            <Bar className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Почетна: поздрав со пребарување, бројки, предмети, десна колона. */
export function HomeSkeleton() {
  return (
    <Loading>
      <div className={MAIN_WITH_RAIL}>
        <div className="min-w-0 space-y-[var(--gap)]">
          <div className="glass space-y-4 p-6 sm:p-8">
            <div className="space-y-2">
              <Bar className="h-3 w-40" />
              <Bar className="h-9 w-56 max-w-full" />
              <Bar className="h-4 w-72 max-w-full" />
            </div>
            <Bar className="h-12 w-full max-w-3xl !rounded-full" />
          </div>
          <StatsSkeleton />
          <div className="glass p-4 sm:p-5">
            <Bar className="mb-4 h-4 w-28" />
            <SubjectCardsSkeleton count={4} />
          </div>
        </div>
        <div className={RAIL}>
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={3} />
        </div>
      </div>
    </Loading>
  );
}

/** Листа предмети: наслов, картички, форма за нов предмет. */
export function SubjectsSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="glass p-4 sm:p-5">
        <SubjectCardsSkeleton />
      </div>
      <div className="glass space-y-3 p-4 sm:p-5">
        <Bar className="h-4 w-32" />
        <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
          <Bar className="h-[42px] sm:w-44" />
          <Bar className="h-[42px] flex-1" />
          <Bar className="h-10 w-36 !rounded-full" />
        </div>
      </div>
    </Loading>
  );
}

/** Предмет: патека, корица со копчиња, јазичиња, преглед со десна колона. */
export function SubjectSkeleton() {
  return (
    <Loading>
      <Bar className="h-3 w-40" />
      <div className="glass p-2">
        <div className="skeleton space-y-4 !rounded-[18px] p-6 sm:p-8">
          <Bar className="h-3 w-44 !bg-white/15" />
          <Bar className="h-9 w-72 max-w-full !bg-white/15" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Bar key={i} className="h-10 w-28 !rounded-full !bg-white/15 sm:w-36" />
            ))}
          </div>
        </div>
      </div>
      <div className="glass flex gap-1 overflow-hidden p-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Bar key={i} className="h-9 w-28 shrink-0 !rounded-[14px]" />
        ))}
      </div>
      <div className={MAIN_WITH_RAIL}>
        <div className="min-w-0 space-y-[var(--gap)]">
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={3} />
        </div>
        <div className={RAIL}>
          <PanelSkeleton rows={3} />
          <div className="glass space-y-3 p-4 sm:p-5">
            <Bar className="h-4 w-32" />
            <Bar className="h-2.5 w-full" />
            {Array.from({ length: 4 }, (_, i) => (
              <Bar key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Loading>
  );
}

/** Календар: алатки, филтер, „Денес/Следно“, мрежа со часови. */
export function CalendarSkeleton() {
  return (
    <Loading>
      <div className="glass flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Bar className="h-9 w-20" />
          <Bar className="h-7 w-48 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bar className="h-10 flex-1 !rounded-[14px] lg:w-80 lg:flex-none" />
          <Bar className="h-10 w-10 !rounded-full sm:w-44" />
        </div>
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 9 }, (_, i) => (
          <Bar key={i} className="h-8 w-16 shrink-0 !rounded-full" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="glass w-[16.5rem] shrink-0 space-y-2.5 !rounded-[22px] p-4 md:w-auto">
            <Bar className="h-3 w-28" />
            <Bar className="h-4 w-4/5" />
            <Bar className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="glass overflow-hidden">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-[var(--line)]">
          <div />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 border-l border-[var(--line)] py-2.5">
              <Bar className="h-2.5 w-8" />
              <Bar className="h-7 w-7 !rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid h-[34rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="relative border-l border-[var(--line)]">
              {i < 5 && (
                <div
                  className="skeleton absolute inset-x-1 !rounded-lg"
                  style={{ top: `${8 + ((i * 17) % 40)}%`, height: `${14 + ((i * 7) % 10)}%` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

/** Водич: наслов и картички во мрежа. */
export function GuideSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="auto-grid [--min:21rem] !gap-[var(--gap)]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="glass space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Bar className="h-10 w-10 !rounded-2xl" />
              <Bar className="h-4 w-32" />
            </div>
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-11/12" />
            <Bar className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Пребарување: наслов, поле, резултати по предмет. */
export function SearchSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton wide />
      <Bar className="h-12 w-full max-w-3xl !rounded-full" />
      <PanelSkeleton rows={3} />
      <PanelSkeleton rows={2} />
    </Loading>
  );
}
