import type { MaterialKind, MaterialOrigin } from "@/lib/materials";

/** Предмет од `data/subjects.json` (заеднички, во git). `id` е латинична ознака, на пр. „ikt“. */
export interface Subject {
  id: string;
  name: string;
  code: string | null;
  archived: boolean;
  created_at: string;
}

export interface SubjectOverview {
  id: string;
  name: string;
  code: string | null;
  archived: boolean;
  counts: Record<MaterialKind, number> & { total: number; pinned: number };
  origins: Record<MaterialOrigin, number>;
  lastAddedAt: string | null;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ѓ: "gj", е: "e", ж: "zh", з: "z", ѕ: "dz", и: "i", ј: "j",
  к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ќ: "kj",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", џ: "dj", ш: "sh",
};

/** Латинична ознака за адреса: „ИКТ“ → „ikt“, „Тимски проект“ → „timski-proekt“. Различна од `taken`. */
export function subjectSlug(text: string, taken: Iterable<string> = []): string {
  const base =
    [...text.toLowerCase()]
      .map((ch) => TRANSLIT[ch] ?? ch)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "predmet";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

/**
 * Текст за пребарување безбеден за PostgREST `or(...ilike...)`: без знаци што
 * го кршат филтерот (запирки, загради, наводници) или се џокери во ilike.
 */
export function sanitizeSearch(q: string): string {
  return q
    .replace(/[%_*,()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Исечок од текстот околу првото совпаѓање, за приказ во резултатите. */
export function snippet(text: string, q: string, radius = 70): { before: string; match: string; after: string } | null {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0 || !q) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  const clean = (s: string) => s.replace(/\s+/g, " ");
  return {
    before: (start > 0 ? "…" : "") + clean(text.slice(start, idx)),
    match: text.slice(idx, idx + q.length),
    after: clean(text.slice(idx + q.length, end)) + (end < text.length ? "…" : ""),
  };
}
