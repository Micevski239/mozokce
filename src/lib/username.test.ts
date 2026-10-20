import { describe, expect, it } from "vitest";
import { initial, validatePasswords, validateUsername } from "./username";

describe("validateUsername", () => {
  it("прифаќа латиница, кирилица, бројки и _ . -", () => {
    expect(validateUsername("ilija_04")).toBeNull();
    expect(validateUsername("Илија.А")).toBeNull();
    expect(validateUsername("  ana-m  ")).toBeNull();
  });
  it("одбива кратки, долги и со празни места или други знаци", () => {
    expect(validateUsername("ab")).toContain("најмалку 3");
    expect(validateUsername("a".repeat(25))).toContain("најмногу 24");
    expect(validateUsername("ilija a")).toContain("Дозволени");
    expect(validateUsername("ilija@")).toContain("Дозволени");
  });
});

describe("validatePasswords", () => {
  it("должина и совпаѓање", () => {
    expect(validatePasswords("short", "short")).toContain("8 знаци");
    expect(validatePasswords("testtest123", "testtest12")).toContain("не се совпаѓаат");
    expect(validatePasswords("testtest123", "testtest123")).toBeNull();
  });
});

describe("initial", () => {
  it("прва буква, голема", () => {
    expect(initial("ilija")).toBe("I");
    expect(initial("ѓорѓи")).toBe("Ѓ");
  });
});
