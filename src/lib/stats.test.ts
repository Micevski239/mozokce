import { describe, expect, it } from "vitest";
import { dayKey, plural, studyStreak, timeAgo } from "./stats";

// 30 септември 2026, 14:00 во Скопје (UTC+2)
const now = new Date("2026-09-30T12:00:00Z");

describe("dayKey", () => {
  it("користи време во Скопје", () => {
    expect(dayKey(new Date("2026-09-29T23:30:00Z"))).toBe("2026-09-30");
  });
});

describe("studyStreak", () => {
  it("брои дена по ред до денес", () => {
    expect(
      studyStreak(["2026-09-30T08:00:00Z", "2026-09-29T08:00:00Z", "2026-09-29T09:00:00Z", "2026-09-28T08:00:00Z"], now),
    ).toBe(3);
  });
  it("серијата важи и ако последно е учено вчера", () => {
    expect(studyStreak(["2026-09-29T08:00:00Z", "2026-09-28T08:00:00Z"], now)).toBe(2);
  });
  it("прекината серија = 0", () => {
    expect(studyStreak(["2026-09-27T08:00:00Z"], now)).toBe(0);
    expect(studyStreak([], now)).toBe(0);
  });
});

describe("plural", () => {
  it("еднина само за 1, 21, 31…", () => {
    expect(plural(1, "ден", "дена")).toBe("1 ден");
    expect(plural(2, "ден", "дена")).toBe("2 дена");
    expect(plural(11, "ден", "дена")).toBe("11 дена");
    expect(plural(21, "ден", "дена")).toBe("21 ден");
  });
});

describe("timeAgo", () => {
  it("македонски релативни времиња", () => {
    const n = new Date("2026-09-30T12:00:00Z");
    expect(timeAgo("2026-09-30T11:59:30Z", n)).toBe("штотуку");
    expect(timeAgo("2026-09-30T11:55:00Z", n)).toBe("пред 5 мин.");
    expect(timeAgo("2026-09-30T09:00:00Z", n)).toBe("пред 3 ч.");
    expect(timeAgo("2026-09-29T12:00:00Z", n)).toBe("вчера");
    expect(timeAgo("2026-09-25T12:00:00Z", n)).toBe("пред 5 дена");
  });
});
