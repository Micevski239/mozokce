"use server";

import { revalidatePath } from "next/cache";
import { KIND_ORDER, type CalendarEvent } from "@/lib/calendar";
import { newId, patchEvent, putEvent, removeEvent } from "@/lib/data";

export type EventInput = Omit<CalendarEvent, "id" | "skip_dates">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function invalid(input: EventInput): string | null {
  if (!input.title?.trim()) return "Внеси наслов.";
  if (!KIND_ORDER.includes(input.kind)) return "Непознат вид на активност.";
  if (!DATE_RE.test(input.date)) return "Избери датум.";
  if (input.start_time && !TIME_RE.test(input.start_time)) return "Неважечко време.";
  if (input.end_time && (!TIME_RE.test(input.end_time) || !input.start_time || input.end_time <= input.start_time))
    return "Крајот мора да е после почетокот.";
  if (input.repeat_until && (!DATE_RE.test(input.repeat_until) || input.repeat_until < input.date))
    return "„Повторувај до“ мора да е после датумот.";
  return null;
}

/** Нов настан (`id` null) или промена на постоечки. */
export async function saveEvent(id: string | null, input: EventInput): Promise<{ error?: string }> {
  const error = invalid(input);
  if (error) return { error };
  const clean: EventInput = { ...input, title: input.title.trim() };
  if (id) await patchEvent(id, (e) => ({ ...e, ...clean }));
  else await putEvent({ ...clean, id: newId(), skip_dates: [] });
  revalidatePath("/", "layout");
  return {};
}

/** Ја брише целата серија. */
export async function deleteEvent(id: string): Promise<{ error?: string }> {
  await removeEvent(id);
  revalidatePath("/", "layout");
  return {};
}

/** Го брише само еден термин од неделна серија. */
export async function skipEventDate(id: string, date: string): Promise<{ error?: string }> {
  if (!DATE_RE.test(date)) return { error: "Неважечки датум." };
  await patchEvent(id, (e) => (e.skip_dates.includes(date) ? e : { ...e, skip_dates: [...e.skip_dates, date] }));
  revalidatePath("/", "layout");
  return {};
}
