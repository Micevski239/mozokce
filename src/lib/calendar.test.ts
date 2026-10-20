import { describe, expect, it } from "vitest";
import {
  addMonths,
  countdown,
  expandOccurrences,
  formatTimeRange,
  formatWeekTitle,
  hourRange,
  layoutOverlaps,
  monthGrid,
  startOfWeek,
  timeToMinutes,
  weekDates,
  weekday,
  type CalendarEvent,
} from "./calendar";

function ev(over: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e",
    subject_id: null,
    title: "Настан",
    kind: "lecture",
    date: "2026-10-06",
    start_time: "10:00:00",
    end_time: "12:00:00",
    repeat_weekly: false,
    repeat_until: null,
    skip_dates: [],
    location: null,
    notes: null,
    ...over,
  };
}

describe("датуми", () => {
  it("неделата почнува во понеделник", () => {
    expect(weekday("2026-10-05")).toBe(0); // понеделник
    expect(weekday("2026-10-11")).toBe(6); // недела
    expect(startOfWeek("2026-10-08")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(weekDates("2026-10-01")).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });
  it("мрежа за месец: 42 дена од понеделник", () => {
    const g = monthGrid("2026-10-15");
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-28");
    expect(g).toContain("2026-10-31");
  });
  it("месеци со различна должина", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
  it("наслов на недела", () => {
    expect(formatWeekTitle("2026-10-01")).toBe("28 сеп – 4 окт 2026");
    expect(formatWeekTitle("2026-10-07")).toBe("5 – 11 окт 2026");
    expect(formatWeekTitle("2026-12-31")).toBe("28 дек 2026 – 3 јан 2027");
  });
});

describe("expandOccurrences", () => {
  it("еднократен настан само во опсегот", () => {
    expect(expandOccurrences([ev({})], "2026-10-05", "2026-10-11")).toHaveLength(1);
    expect(expandOccurrences([ev({})], "2026-10-12", "2026-10-18")).toHaveLength(0);
  });
  it("неделно повторување до крајниот датум, без прескокнатите", () => {
    const e = ev({ repeat_weekly: true, repeat_until: "2026-10-27", skip_dates: ["2026-10-13"] });
    const dates = expandOccurrences([e], "2026-10-01", "2026-12-31").map((o) => o.date);
    expect(dates).toEqual(["2026-10-06", "2026-10-20", "2026-10-27"]);
  });
  it("повторување кое почнало пред опсегот", () => {
    const e = ev({ date: "2026-09-01", repeat_weekly: true });
    expect(expandOccurrences([e], "2026-10-05", "2026-10-11").map((o) => o.date)).toEqual(["2026-10-06"]);
  });
  it("подредено по датум, па по час; целодневните први", () => {
    const list = expandOccurrences(
      [ev({ id: "b", start_time: "14:00", end_time: "15:00" }), ev({ id: "a", start_time: null, end_time: null }), ev({ id: "c", start_time: "08:00", end_time: "09:00" })],
      "2026-10-06",
      "2026-10-06",
    );
    expect(list.map((o) => o.event.id)).toEqual(["a", "c", "b"]);
  });
});

describe("layoutOverlaps", () => {
  it("термини што се преклопуваат се во различни колони", () => {
    const items = [
      { id: 1, start: 600, end: 720 },
      { id: 2, start: 660, end: 780 },
      { id: 3, start: 720, end: 750 },
      { id: 4, start: 900, end: 960 },
    ];
    const placed = layoutOverlaps(items);
    const byId = Object.fromEntries(placed.map((p) => [p.item.id, [p.column, p.columns]]));
    expect(byId[1]).toEqual([0, 2]);
    expect(byId[2]).toEqual([1, 2]);
    expect(byId[3]).toEqual([0, 2]);
    expect(byId[4]).toEqual([0, 1]);
  });
  it("рокови и целодневни не се во мрежата", () => {
    expect(layoutOverlaps([{ start: 600, end: null }, { start: null, end: null }])).toEqual([]);
  });
});

describe("текстови и опсег", () => {
  it("времиња", () => {
    expect(timeToMinutes("09:30:00")).toBe(570);
    expect(formatTimeRange({ start: 570, end: 660 })).toBe("09:30–11:00");
    expect(formatTimeRange({ start: 1439, end: null })).toBe("до 23:59");
    expect(formatTimeRange({ start: null, end: null })).toBe("Цел ден");
  });
  it("опсег на часови се проширува, но не и од рокови", () => {
    expect(hourRange([])).toEqual([8, 20]);
    const [o] = expandOccurrences([ev({ start_time: "07:15", end_time: "21:30" })], "2026-10-06", "2026-10-06");
    expect(hourRange([o])).toEqual([7, 22]);
    const [deadline] = expandOccurrences([ev({ start_time: "23:59", end_time: null })], "2026-10-06", "2026-10-06");
    expect(hourRange([deadline])).toEqual([8, 20]);
  });
  it("одбројување", () => {
    expect(countdown("2026-10-06", "2026-10-06")).toBe("денес");
    expect(countdown("2026-10-07", "2026-10-06")).toBe("утре");
    expect(countdown("2026-10-09", "2026-10-06")).toBe("за 3 дена");
    expect(countdown("2026-10-27", "2026-10-06")).toBe("за 21 ден");
  });
});
