import { headers } from "next/headers";
import { userAgent } from "next/server";
import type { CalendarView } from "@/lib/calendar";
import { listEvents, listSubjects } from "@/lib/data";
import { todayKey } from "@/lib/stats";
import { CalendarApp } from "./calendar-app";

const VIEWS: CalendarView[] = ["week", "day", "month", "list"];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const [events, subjects] = await Promise.all([listEvents(), listSubjects()]);

  const today = todayKey();
  const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const date = param(sp.date);
  const { device } = userAgent({ headers: await headers() });
  // Телефон добива „Ден“ уште од серверот, за да нема трепкање при вчитување.
  const isPhone = device.type === "mobile";
  const view = VIEWS.find((v) => v === param(sp.view)) ?? (isPhone ? "day" : "week");

  return (
    <CalendarApp
      events={events}
      subjects={subjects.filter((s) => !s.archived)}
      allSubjects={subjects}
      today={today}
      initialView={view}
      initialDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today}
      initialSubjects={(param(sp.subject) ?? "").split(",").filter(Boolean)}
      initialWide={!isPhone}
    />
  );
}
