import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Податоците на Мозокче живеат во датотеки, без база (како старата desktop апликација):
 * - `data/` во репото: заедничко, оди на GitHub (предмети, календар, материјали);
 * - `.mozokce/` во репото: лично, git го игнорира (напредок со прашањата, име).
 * Секој што ќе го клонира репото добива свој `.mozokce/`, па напредокот е одвоен.
 */

/** Заедничката папка; MOZOKCE_SHARED_DIR ја менува (за тестови). */
export function sharedDir(): string {
  return process.env.MOZOKCE_SHARED_DIR || path.join(process.cwd(), "data");
}

/** Личната папка; MOZOKCE_DATA_DIR ја менува (за тестови). */
export function personalDir(): string {
  return process.env.MOZOKCE_DATA_DIR || path.join(process.cwd(), ".mozokce");
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(`${path.relative(process.cwd(), file)}: не може да се прочита (${(e as Error).message})`);
  }
}

export async function writeJsonAtomic(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  // Прво во привремена датотека, па преименување: прекин на средина не ја расипува датотеката.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

const queues = new Map<string, Promise<unknown>>();

/**
 * Чита → менува → запишува, по ред за секоја датотека, за два брзи одговори
 * (на пр. во квизот) да не се препишат еден со друг. Ако `change` врати `undefined`,
 * ништо не се запишува.
 */
export function updateJson<T>(file: string, fallback: T, change: (data: T) => T | undefined | Promise<T | undefined>): Promise<T> {
  const previous = queues.get(file) ?? Promise.resolve();
  const run = previous.then(async () => {
    const current = await readJson(file, fallback);
    const next = await change(current);
    if (next === undefined) return current;
    await writeJsonAtomic(file, next);
    return next;
  });
  queues.set(
    file,
    run.catch(() => undefined),
  );
  return run;
}

// ---- папка со по една датотека за секој запис ---------------------------------------
// Календарот и материјалите се заеднички преку git: секој запис е своја датотека, па кога
// двајца додаваат во исто време, git ги спојува без конфликт.

const ITEM_ID = /^[a-z0-9-]{1,64}$/;

export function itemFile(dir: string, id: string): string {
  if (!ITEM_ID.test(id)) throw new Error(`неважечка ознака „${id}“`);
  return path.join(dir, `${id}.json`);
}

export async function readItems<T>(dir: string): Promise<T[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const items: (T | null)[] = await Promise.all(names.map((n) => readJson<T | null>(path.join(dir, n), null)));
  return items.filter((x): x is T => x !== null);
}

/** Го менува постоечкиот запис; ако не постои, не прави ништо. */
export async function patchItem<T>(dir: string, id: string, change: (item: T) => T): Promise<void> {
  await updateJson<T | null>(itemFile(dir, id), null, (item) => (item ? change(item) : undefined));
}

export async function removeItem(dir: string, id: string): Promise<void> {
  await unlink(itemFile(dir, id)).catch(() => undefined);
}
