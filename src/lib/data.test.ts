import { copyFile, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { QuestionProgressRow } from "./brain";
import { brainForCode } from "./brain-files";
import type { CalendarEvent } from "./calendar";
import {
  getMaterial,
  getProfile,
  getProgressRows,
  listEvents,
  listMaterials,
  listSubjects,
  patchEvent,
  patchMaterial,
  putEvent,
  putMaterial,
  readStoredFile,
  removeEvent,
  removeMaterial,
  saveProfile,
  saveProgressRows,
  storeFile,
} from "./data";
import type { Material } from "./materials";

// Заедничка папка (data/) и две лични (.mozokce/) во привремен директориум: еден „компјутер“ по лична папка.
let root: string;
let ana: string;
let boris: string;
const as = (who: string) => {
  process.env.MOZOKCE_DATA_DIR = who;
};

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "mozokce-test-"));
  const shared = path.join(root, "data");
  await mkdir(shared, { recursive: true });
  await copyFile(path.join(process.cwd(), "data", "subjects.json"), path.join(shared, "subjects.json"));
  ana = path.join(root, "ana");
  boris = path.join(root, "boris");
  process.env.MOZOKCE_SHARED_DIR = shared;
  as(ana);
});
afterAll(async () => {
  delete process.env.MOZOKCE_SHARED_DIR;
  delete process.env.MOZOKCE_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

const row = (id: string, streak: number): QuestionProgressRow => ({
  question_id: id,
  in_wrong: false,
  flagged: false,
  mastery_streak: streak,
  completed_streak: 0,
  tainted: false,
  wrong_strikes: 0,
  redemption: 0,
});

const event = (id: string, date: string): CalendarEvent => ({
  id,
  subject_id: "ikt",
  title: `Настан ${id}`,
  kind: "kolokvium",
  date,
  start_time: null,
  end_time: null,
  repeat_weekly: false,
  repeat_until: null,
  skip_dates: [],
  location: null,
  notes: null,
});

describe("заеднички предмети", () => {
  it("секој мозок има свој предмет по кратенка", async () => {
    const subjects = await listSubjects();
    expect(subjects.length).toBeGreaterThan(0);
    expect(new Set(subjects.map((s) => s.id)).size).toBe(subjects.length);
    const ikt = subjects.find((s) => s.id === "ikt");
    expect((await brainForCode(ikt?.code))?.id).toBe("ikt");
  });
});

describe("заеднички календар (data/calendar/<id>.json)", () => {
  it("секој настан е своја датотека; двајцата го гледаат истото", async () => {
    as(ana);
    await putEvent(event("b", "2026-11-02"));
    as(boris);
    await putEvent(event("a", "2026-11-01"));
    expect((await listEvents()).map((e) => e.id)).toEqual(["a", "b"]);
    as(ana);
    expect((await listEvents()).map((e) => e.id)).toEqual(["a", "b"]);
    expect(await readdir(path.join(root, "data", "calendar"))).toEqual(["a.json", "b.json"]);
  });

  it("промена, прескокнат термин и бришење", async () => {
    await patchEvent("a", (e) => ({ ...e, skip_dates: ["2026-11-08"] }));
    expect((await listEvents()).find((e) => e.id === "a")?.skip_dates).toEqual(["2026-11-08"]);
    await patchEvent("nema", (e) => e); // непостоечки: ништо не се создава
    await removeEvent("b");
    expect((await listEvents()).map((e) => e.id)).toEqual(["a"]);
  });

  it("ознака со патека се одбива", async () => {
    await expect(putEvent(event("../x", "2026-11-01"))).rejects.toThrow(/неважечка ознака/);
  });
});

describe("заеднички материјали (data/materials/<id>.json + data/files)", () => {
  it("датотека: се чува, се менува и се брише заедно со записот", async () => {
    const key = await storeFile("ikt", "Предавање 1.pdf", "m1", new Uint8Array([1, 2, 3]));
    expect(key).toBe("ikt/m1.pdf");
    const m: Material = {
      id: "m1",
      subject_id: "ikt",
      kind: "file",
      title: "Предавање 1",
      body: null,
      storage_path: key,
      file_name: "Предавање 1.pdf",
      mime_type: "application/pdf",
      size_bytes: 3,
      origin: "official",
      source_date: null,
      created_by: "ana",
      created_at: "2026-10-19T10:00:00.000Z",
      pinned: false,
    };
    await putMaterial(m);
    await patchMaterial("m1", (x) => ({ ...x, pinned: true }));
    as(boris);
    expect((await listMaterials()).map((x) => [x.id, x.pinned])).toEqual([["m1", true]]);
    expect([...(await readStoredFile(key))]).toEqual([1, 2, 3]);
    await removeMaterial("m1");
    expect(await getMaterial("m1")).toBeNull();
    await expect(readStoredFile(key)).rejects.toThrow();
    await expect(readStoredFile("../subjects.json")).rejects.toThrow(/неважечка патека/);
  });
});

describe("личен напредок и профил (.mozokce/)", () => {
  it("напредокот е одвоен по компјутер", async () => {
    as(ana);
    await saveProgressRows("ikt", [{ id: "b01", row: row("b01", 1) }]);
    as(boris);
    expect(await getProgressRows("ikt")).toEqual([]);
    await saveProgressRows("ikt", [{ id: "b02", row: row("b02", 2) }]);
    as(ana);
    expect(await getProgressRows("ikt")).toEqual([row("b01", 1)]);
  });

  it("брзи последователни записи не се губат; row: null брише", async () => {
    as(ana);
    await Promise.all(Array.from({ length: 25 }, (_, i) => saveProgressRows("ikt", [{ id: `q${i}`, row: row(`q${i}`, 1) }])));
    expect((await getProgressRows("ikt")).length).toBe(26);
    await saveProgressRows("ikt", [{ id: "b01", row: null }]);
    expect((await getProgressRows("ikt")).some((r) => r.question_id === "b01")).toBe(false);
  });

  it("профилот има стандардно име и може да се смени", async () => {
    as(boris);
    expect((await getProfile()).username.length).toBeGreaterThan(0);
    await saveProfile({ username: "boris" });
    expect((await getProfile()).username).toBe("boris");
    as(ana);
    expect((await getProfile()).username).not.toBe("boris");
  });
});
