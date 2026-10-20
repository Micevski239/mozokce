import { describe, expect, it } from "vitest";
import {
  extensionOf,
  formatMonth,
  groupByMonth,
  groupByOrigin,
  originCounts,
  fileFamily,
  formatBytes,
  formatDate,
  isAcceptedFile,
  resolveMimeType,
  storageKey,
  textStats,
  titleFromFileName,
} from "./materials";

describe("storageKey", () => {
  it("не содржи кирилица и ја задржува екстензијата", () => {
    expect(storageKey("subj", "Предавање 3.PDF", "abc")).toBe("subj/abc.pdf");
    expect(storageKey("subj", "без екстензија", "abc")).toBe("subj/abc");
  });
});

describe("типови датотеки", () => {
  it("MIME од екстензија кога прелистувачот не знае", () => {
    expect(resolveMimeType("beleski.md", "")).toBe("text/markdown");
    expect(resolveMimeType("slajdovi.pptx", "application/octet-stream")).toContain("presentation");
    expect(resolveMimeType("a.pdf", "application/pdf")).toBe("application/pdf");
  });
  it("прифаќа само дозволени типови", () => {
    expect(isAcceptedFile("x.pdf", "application/pdf")).toBe(true);
    expect(isAcceptedFile("x.exe", "application/x-msdownload")).toBe(false);
    expect(isAcceptedFile("x.zip", "")).toBe(false);
  });
  it("фамилии", () => {
    expect(fileFamily("image/png")).toBe("image");
    expect(fileFamily("application/vnd.ms-powerpoint")).toBe("slides");
    expect(fileFamily(null)).toBe("other");
  });
  it("екстензија", () => {
    expect(extensionOf("a.b.JPEG")).toBe("jpeg");
    expect(extensionOf("noext")).toBe("");
  });
});

describe("приказ", () => {
  it("наслов од име", () => {
    expect(titleFromFileName("predavanje_03_kmeans.pdf")).toBe("predavanje 03 kmeans");
  });
  it("големина", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(15 * 1024 * 1024)).toBe("15 MB");
  });
  it("датум на македонски", () => {
    expect(formatDate("2026-01-12")).toBe("12 јан. 2026");
    expect(formatDate("2026-05-03")).toBe("3 мај 2026");
  });
  it("бројки за текст", () => {
    expect(textStats("  а\n\nб\nв  ")).toEqual({ lines: 3, chars: 6 });
    expect(textStats("   ")).toEqual({ lines: 0, chars: 0 });
  });
});

describe("групирање", () => {
  const items = [
    { id: "a", origin: "student" as const, source_date: "2026-01-12", created_at: "2026-09-30T10:00:00Z" },
    { id: "b", origin: "exam" as const, source_date: null, created_at: "2026-09-29T10:00:00Z" },
    { id: "c", origin: "official" as const, source_date: "2026-01-02", created_at: "2026-09-28T10:00:00Z" },
    { id: "d", origin: "exam" as const, source_date: "2025-06-01", created_at: "2026-09-27T10:00:00Z" },
  ];
  it("по извор: колоквиуми прво, без празни групи", () => {
    expect(groupByOrigin(items).map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ["exam", ["b", "d"]],
      ["official", ["c"]],
      ["student", ["a"]],
    ]);
  });
  it("по месец: од најнов, датум на објава пред датум на додавање", () => {
    expect(groupByMonth(items).map((g) => [g.title, g.items.map((i) => i.id)])).toEqual([
      ["Септември 2026", ["b"]],
      ["Јануари 2026", ["a", "c"]],
      ["Јуни 2025", ["d"]],
    ]);
  });
  it("бројки по извор и месеци", () => {
    expect(originCounts(items)).toEqual({ official: 1, exam: 2, student: 1, other: 0 });
    expect(formatMonth("2026-12")).toBe("Декември 2026");
  });
});
