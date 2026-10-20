import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { parseBrain, type Brain } from "./brain";

/** Папката со мозоците: brains/<id>/brain.json (id = мали латинични букви, како името на папката). */
export const BRAINS_DIR = path.join(process.cwd(), "brains");

async function readBrain(dir: string): Promise<Brain> {
  const file = path.join(BRAINS_DIR, dir, "brain.json");
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    throw new Error(`brains/${dir}/brain.json: не може да се прочита (${(e as Error).message})`);
  }
  let brain: Brain;
  try {
    brain = parseBrain(raw);
  } catch (e) {
    throw new Error(`brains/${dir}/brain.json → ${(e as Error).message}`);
  }
  if (brain.id !== dir) throw new Error(`brains/${dir}/brain.json → id: треба „${dir}“ (името на папката)`);
  return brain;
}

/** Сите мозоци од диск. Се чита при секое барање (во рамки на едно барање еднаш), па `git pull` се гледа веднаш. */
export const loadBrains = cache(async (): Promise<Brain[]> => {
  let dirs: string[];
  try {
    dirs = (await readdir(BRAINS_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  return Promise.all(dirs.sort().map(readBrain));
});

/** Мозокот на предметот според кратенката (subjects.code ↔ brain.subject.code). */
export async function brainForCode(code: string | null | undefined): Promise<Brain | null> {
  if (!code?.trim()) return null;
  const wanted = code.trim().toLowerCase();
  return (await loadBrains()).find((b) => b.subject.code.toLowerCase() === wanted) ?? null;
}
