import { ArrowRight, Search } from "lucide-react";

/** Пребарување низ материјалите од сите предмети (обична GET форма кон /search). */
export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="relative flex w-full items-center">
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Пребарај низ сите предмети…"
        aria-label="Пребарај низ сите предмети"
        className="input !min-h-12 !rounded-full !pl-11 !pr-14 sm:!pr-28"
        minLength={2}
        required
      />
      <button type="submit" className="btn btn-primary absolute right-1.5 !min-h-9 !w-9 !px-0 sm:!w-auto sm:!px-4" aria-label="Барај">
        <ArrowRight size={16} className="sm:hidden" />
        <span className="hidden sm:inline">Барај</span>
      </button>
    </form>
  );
}
