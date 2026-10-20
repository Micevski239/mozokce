import { describe, expect, it } from "vitest";
import { sanitizeSearch, snippet, subjectSlug } from "./subjects";

describe("sanitizeSearch", () => {
  it("ги трга знаците што го кршат PostgREST филтерот", () => {
    expect(sanitizeSearch("  k-means, (elbow) 100%_ ")).toBe("k-means elbow 100");
    expect(sanitizeSearch("а".repeat(150))).toHaveLength(100);
  });
});

describe("snippet", () => {
  it("исечок околу совпаѓањето, без разлика на големи/мали букви", () => {
    const s = snippet("Професорот рече дека ELMo не влегува на кол2", "elmo", 10);
    expect(s).toEqual({ before: "…рече дека ", match: "ELMo", after: " не влегув…" });
  });
  it("null кога нема совпаѓање", () => {
    expect(snippet("abc", "x")).toBeNull();
  });
});

describe("subjectSlug", () => {
  it("кирилица во латиница", () => {
    expect(subjectSlug("ИКТ")).toBe("ikt");
    expect(subjectSlug("Тимски проект")).toBe("timski-proekt");
    expect(subjectSlug("Ѓорѓи Џиџев")).toBe("gjorgji-djidjev");
    expect(subjectSlug("AdvDB")).toBe("advdb");
  });
  it("различна од постоечките", () => {
    expect(subjectSlug("ИС", ["is"])).toBe("is-2");
    expect(subjectSlug("ИС", ["is", "is-2"])).toBe("is-3");
    expect(subjectSlug("!!!")).toBe("predmet");
  });
});
