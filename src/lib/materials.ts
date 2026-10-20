export type MaterialKind = "file" | "chat" | "note";
export type MaterialOrigin = "official" | "exam" | "student" | "other";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface Material {
  id: string;
  subject_id: string;
  kind: MaterialKind;
  title: string;
  body: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  origin: MaterialOrigin;
  source_date: string | null;
  created_by: string | null;
  created_at: string;
  pinned: boolean;
}

/** Материјал со линк за отворање (само за датотеки: /api/files/<id>) и корисничкото име на авторот. */
export type MaterialWithUrl = Material & { url: string | null; author?: string | null };


export const KIND_LABELS: Record<MaterialKind, string> = {
  file: "Датотека",
  chat: "Discord чат",
  note: "Белешка",
};

export const ORIGIN_LABELS: Record<MaterialOrigin, string> = {
  official: "Официјално",
  exam: "Колоквиум / испит",
  student: "Студенти",
  other: "Друго",
};

export const ORIGIN_HINTS: Record<MaterialOrigin, string> = {
  official: "Професор, асистент, курсот на факултет",
  exam: "Стари колоквиуми и испити",
  student: "Discord, колеги, белешки од други",
  other: "Сè друго",
};

/** Наслови на групи кога материјалите се подредени по извор (редоследот е важен за учење). */
export const ORIGIN_GROUP_TITLES: Record<MaterialOrigin, string> = {
  exam: "Колоквиуми и испити",
  official: "Предавања и официјални материјали",
  student: "Од студенти",
  other: "Друго",
};
export const ORIGIN_ORDER: MaterialOrigin[] = ["exam", "official", "student", "other"];

export const ORIGIN_COLORS: Record<MaterialOrigin, string> = {
  official: "var(--accent)",
  exam: "var(--warn)",
  student: "#7C5CFF",
  other: "var(--line-2)",
};

export const DEFAULT_ORIGIN: Record<MaterialKind, MaterialOrigin> = {
  file: "official",
  chat: "student",
  note: "other",
};

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.txt,.md,.pptx,.ppt,.docx,.doc";

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  txt: "text/plain",
  md: "text/markdown",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

/** MIME типот од прелистувачот, или од екстензијата кога прелистувачот не знае (на пр. .md, .heic). */
export function resolveMimeType(fileName: string, browserType: string): string {
  if (browserType && ACCEPTED_FILE_TYPES.includes(browserType)) return browserType;
  return EXTENSION_TYPES[extensionOf(fileName)] ?? browserType;
}

export function isAcceptedFile(fileName: string, browserType: string): boolean {
  return ACCEPTED_FILE_TYPES.includes(resolveMimeType(fileName, browserType));
}

/**
 * Патека на датотеката во .mozokce/files: предмет/uuid.екстензија. Без кирилица и без
 * судири на имиња; оригиналното име се чува во materials.json (file_name).
 */
export function storageKey(subjectId: string, fileName: string, id: string): string {
  const ext = extensionOf(fileName);
  return `${subjectId}/${id}${ext ? `.${ext}` : ""}`;
}

/** Наслов од име на датотека: без екстензија, со празни места наместо _ и -. */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{1,8}$/i, "");
  const cleaned = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || fileName;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export type FileFamily = "pdf" | "image" | "slides" | "doc" | "text" | "other";

export function fileFamily(mime: string | null): FileFamily {
  if (!mime) return "other";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "slides";
  if (mime.includes("word")) return "doc";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

/** Кратки бројки за залепен текст: редови и знаци. */
export function textStats(text: string): { lines: number; chars: number } {
  const trimmed = text.trim();
  if (!trimmed) return { lines: 0, chars: 0 };
  return { lines: trimmed.split(/\r?\n/).filter((l) => l.trim()).length, chars: trimmed.length };
}

const MONTHS = ["јан.", "фев.", "мар.", "апр.", "мај", "јун.", "јул.", "авг.", "сеп.", "окт.", "ное.", "дек."];

/** Датум (YYYY-MM-DD) → „12 окт. 2026“ (рачно, за да е исто на сервер и прелистувач). */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const MONTH_NAMES = ["Јануари", "Февруари", "Март", "Април", "Мај", "Јуни", "Јули", "Август", "Септември", "Октомври", "Ноември", "Декември"];

/** Месец (YYYY-MM) на материјалот: датумот на објава, или кога е додаден. */
export function materialMonth(m: Pick<Material, "source_date" | "created_at">): string {
  return (m.source_date ?? m.created_at).slice(0, 7);
}

/** „2026-01“ → „Јануари 2026“. */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m ? `${MONTH_NAMES[m - 1]} ${y}` : month;
}

export interface MaterialGroup<T> {
  key: string;
  title: string;
  items: T[];
}

/** Групи по извор, по редослед за учење (колоквиуми прво); празните групи се изоставаат. */
export function groupByOrigin<T extends Pick<Material, "origin">>(items: T[]): MaterialGroup<T>[] {
  return ORIGIN_ORDER.map((o) => ({ key: o, title: ORIGIN_GROUP_TITLES[o], items: items.filter((i) => i.origin === o) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Групи по месец, од најнов кон најстар. */
export function groupByMonth<T extends Pick<Material, "source_date" | "created_at">>(items: T[]): MaterialGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = materialMonth(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({ key, title: formatMonth(key), items: list }));
}

export function originCounts(items: Pick<Material, "origin">[]): Record<MaterialOrigin, number> {
  const counts: Record<MaterialOrigin, number> = { official: 0, exam: 0, student: 0, other: 0 };
  for (const i of items) counts[i.origin]++;
  return counts;
}
