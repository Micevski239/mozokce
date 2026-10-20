import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { QuestionProgressRow } from "./brain";
import type { CalendarEvent } from "./calendar";
import { itemFile, patchItem, personalDir, readItems, readJson, removeItem, sharedDir, updateJson, writeJsonAtomic } from "./local-store";
import { storageKey, type Material, type MaterialOrigin } from "./materials";
import type { Subject, SubjectOverview } from "./subjects";

/**
 * Сите податоци на апликацијата, без база (само на серверот: користи fs).
 * Намерно без React cache: акција што чита па запишува не смее да остави стар список во истото барање.
 * Заедничко (data/, оди на git): subjects.json, calendar/<id>.json, materials/<id>.json, files/.
 * Лично (.mozokce/, git го игнорира): progress.json, profile.json.
 */

const subjectsFile = () => path.join(sharedDir(), "subjects.json");
const eventsDir = () => path.join(sharedDir(), "calendar");
const materialsDir = () => path.join(sharedDir(), "materials");
const filesDir = () => path.join(sharedDir(), "files");
const progressFile = () => path.join(personalDir(), "progress.json");
const profileFile = () => path.join(personalDir(), "profile.json");

// ---- предмети (заеднички) ------------------------------------------------------

const byName = (a: Subject, b: Subject) => a.name.localeCompare(b.name, "mk");

export async function listSubjects(): Promise<Subject[]> {
  return (await readJson<Subject[]>(subjectsFile(), [])).sort(byName);
}

export async function getSubject(id: string): Promise<Subject | null> {
  return (await listSubjects()).find((s) => s.id === id) ?? null;
}

export function updateSubjects(change: (subjects: Subject[]) => Subject[]) {
  return updateJson<Subject[]>(subjectsFile(), [], (list) => change(list).sort(byName));
}

/** Предметите со број на материјали по вид и извор, и кога е последно додадено. */
export async function loadSubjectOverviews(opts: { includeArchived?: boolean } = {}): Promise<SubjectOverview[]> {
  const [subjects, materials] = await Promise.all([listSubjects(), listMaterials()]);
  return subjects
    .filter((s) => opts.includeArchived || !s.archived)
    .map((s) => {
      const counts = { file: 0, chat: 0, note: 0, total: 0, pinned: 0 };
      const origins: Record<MaterialOrigin, number> = { official: 0, exam: 0, student: 0, other: 0 };
      let lastAddedAt: string | null = null;
      for (const m of materials) {
        if (m.subject_id !== s.id) continue;
        counts[m.kind]++;
        counts.total++;
        if (m.pinned) counts.pinned++;
        origins[m.origin]++;
        if (!lastAddedAt || m.created_at > lastAddedAt) lastAddedAt = m.created_at;
      }
      return { id: s.id, name: s.name, code: s.code, archived: s.archived, counts, origins, lastAddedAt };
    });
}

// ---- календар (заеднички) ---------------------------------------------------------

export async function listEvents(): Promise<CalendarEvent[]> {
  return (await readItems<CalendarEvent>(eventsDir())).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export async function putEvent(event: CalendarEvent) {
  await writeJsonAtomic(itemFile(eventsDir(), event.id), event);
}

export function patchEvent(id: string, change: (event: CalendarEvent) => CalendarEvent) {
  return patchItem<CalendarEvent>(eventsDir(), id, change);
}

export function removeEvent(id: string) {
  return removeItem(eventsDir(), id);
}

export function newId(): string {
  return randomUUID();
}

// ---- материјали (заеднички) -------------------------------------------------------

/** Сите материјали, најнови прво. */
export async function listMaterials(): Promise<Material[]> {
  return (await readItems<Material>(materialsDir())).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getMaterial(id: string): Promise<Material | null> {
  return await readJson<Material | null>(itemFile(materialsDir(), id), null);
}

export async function putMaterial(material: Material) {
  await writeJsonAtomic(itemFile(materialsDir(), material.id), material);
}

export function patchMaterial(id: string, change: (material: Material) => Material) {
  return patchItem<Material>(materialsDir(), id, change);
}

/** Го брише записот и датотеката (ако има). */
export async function removeMaterial(id: string) {
  const material = await getMaterial(id);
  await removeItem(materialsDir(), id);
  if (material?.storage_path) await removeStoredFile(material.storage_path);
}

/** Ја запишува датотеката во data/files/<предмет>/<uuid>.<ext> и ја враќа патеката (storage_path). */
export async function storeFile(subjectId: string, fileName: string, id: string, bytes: Uint8Array): Promise<string> {
  const key = storageKey(subjectId, fileName, id);
  const full = path.join(filesDir(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const full = path.resolve(filesDir(), key);
  // Само датотеки од files/, ништо надвор од неа.
  if (!full.startsWith(path.resolve(filesDir()) + path.sep)) throw new Error("неважечка патека");
  return readFile(full);
}

export async function removeStoredFile(key: string) {
  await unlink(path.join(filesDir(), key)).catch(() => undefined);
}

/** Адреса за отворање на датотека од материјал (го служи /api/files/[id]). */
export function fileUrl(m: Pick<Material, "id" | "storage_path">): string | null {
  return m.storage_path ? `/api/files/${m.id}` : null;
}

// ---- напредок со прашањата (личен) ------------------------------------------------

type ProgressStore = Record<string, Record<string, QuestionProgressRow>>;

export async function getProgressRows(brainId: string): Promise<QuestionProgressRow[]> {
  const store = await readJson<ProgressStore>(progressFile(), {});
  return Object.values(store[brainId] ?? {});
}

/** `row: null` го брише напредокот за прашањето (празен ред не се чува). */
export function saveProgressRows(brainId: string, changes: { id: string; row: QuestionProgressRow | null }[]) {
  return updateJson<ProgressStore>(progressFile(), {}, (store) => {
    const brain = { ...(store[brainId] ?? {}) };
    for (const c of changes) {
      if (c.row) brain[c.id] = c.row;
      else delete brain[c.id];
    }
    return { ...store, [brainId]: brain };
  });
}

// ---- профил (личен) ----------------------------------------------------------------

export interface Profile {
  username: string;
}

/** Името во лентата; ако не е поставено, корисничкото име на компјутерот. */
export async function getProfile(): Promise<Profile> {
  const saved = await readJson<Partial<Profile>>(profileFile(), {});
  return { username: saved.username?.trim() || os.userInfo().username || "јас" };
}

export function saveProfile(profile: Profile) {
  return updateJson<Profile>(profileFile(), profile, () => profile);
}
