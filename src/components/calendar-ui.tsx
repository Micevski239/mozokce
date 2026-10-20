import {
  BookCheck,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  PencilLine,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { IMPORTANT_KINDS, type CalendarEvent, type EventKind } from "@/lib/calendar";
import { subjectTint } from "./ui";

export interface SubjectRef {
  id: string;
  name: string;
  code: string | null;
}

export const KIND_ICONS: Record<EventKind, LucideIcon> = {
  lecture: Presentation,
  exercise: PencilLine,
  lab: FlaskConical,
  homework: ClipboardList,
  kolokvium: BookCheck,
  exam: GraduationCap,
  other: CalendarDays,
};

const NEUTRAL = "#64748B";

/** Боја на настанот = боја на предметот (иста како корицата); без предмет = сива. */
export function eventColor(event: Pick<CalendarEvent, "subject_id">): string {
  return event.subject_id ? subjectTint(event.subject_id) : NEUTRAL;
}

/** Стилови за картичка на термин: обоена позадина и лента лево во бојата на предметот. */
export function eventStyle(event: Pick<CalendarEvent, "subject_id">): CSSProperties {
  const color = eventColor(event);
  return {
    background: `color-mix(in oklab, ${color} 17%, var(--surface))`,
    borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
    boxShadow: `inset 3px 0 0 ${color}`,
  };
}

export function isImportant(event: Pick<CalendarEvent, "kind">): boolean {
  return IMPORTANT_KINDS.includes(event.kind);
}

export function subjectLabel(subject: SubjectRef | undefined): string | null {
  if (!subject) return null;
  return subject.code || subject.name;
}
