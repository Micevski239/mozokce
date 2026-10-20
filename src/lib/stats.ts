const TZ = "Europe/Skopje";
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Датум (YYYY-MM-DD) во локалното време на Скопје. */
export function dayKey(date: Date): string {
  return dayFormat.format(date);
}

function previousDay(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Колку дена по ред е учено (барем една сесија на ден). Серијата важи ако
 * последниот ден е денес или вчера, за да не „изгори“ наутро пред да се учи.
 */
export function studyStreak(sessionDates: (string | Date)[], now: Date = new Date()): number {
  const days = new Set(sessionDates.map((d) => dayKey(new Date(d))));
  const today = dayKey(now);
  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** „пред 5 мин.“, „вчера“, „пред 3 дена“ (рачно, бидејќи прелистувачите често немаат македонски Intl). */
export function timeAgo(date: string | Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "штотуку";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `пред ${minutes} мин.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `пред ${hours} ч.`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчера";
  if (days < 30) return `пред ${days} дена`;
  const months = Math.round(days / 30);
  return months < 12 ? `пред ${months} мес.` : `пред ${Math.round(months / 12)} год.`;
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now));
  if (hour < 5) return "Добра ноќ";
  if (hour < 12) return "Добро утро";
  if (hour < 18) return "Добар ден";
  return "Добра вечер";
}

/** Множина за македонски: 1 ден / 2 дена, 1 сесија / 2 сесии. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : many}`;
}

/** Моментот пред `days` дена. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400 * 1000);
}

/** Денешниот датум (YYYY-MM-DD) во Скопје. */
export function todayKey(): string {
  return dayKey(new Date());
}
