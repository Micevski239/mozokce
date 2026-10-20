"use server";

import { revalidatePath } from "next/cache";
import type { QuestionProgressRow } from "@/lib/brain";
import { getProfile, getSubject, newId, patchMaterial, putMaterial, removeMaterial, saveProgressRows, storeFile } from "@/lib/data";
import {
  isAcceptedFile,
  MAX_FILE_BYTES,
  ORIGIN_ORDER,
  resolveMimeType,
  titleFromFileName,
  type Material,
  type MaterialKind,
  type MaterialOrigin,
} from "@/lib/materials";

type Result = { error?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const cleanDate = (v: unknown) => (typeof v === "string" && DATE_RE.test(v) ? v : null);
const cleanOrigin = (v: unknown): MaterialOrigin => (ORIGIN_ORDER.includes(v as MaterialOrigin) ? (v as MaterialOrigin) : "other");

/** Една датотека: се запишува во data/files, а записот во data/materials/<id>.json (заеднички, преку git). */
export async function uploadMaterial(formData: FormData): Promise<Result> {
  const file = formData.get("file");
  const subjectId = String(formData.get("subject_id") ?? "");
  if (!(file instanceof File)) return { error: "Нема датотека." };
  if (!(await getSubject(subjectId))) return { error: "Предметот не постои." };
  if (!isAcceptedFile(file.name, file.type)) return { error: "типот не е поддржан" };
  if (file.size > MAX_FILE_BYTES) return { error: "поголема од 50 MB" };

  const id = newId();
  const storagePath = await storeFile(subjectId, file.name, id, new Uint8Array(await file.arrayBuffer()));
  const material: Material = {
    id,
    subject_id: subjectId,
    kind: "file",
    title: titleFromFileName(file.name),
    body: null,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: resolveMimeType(file.name, file.type),
    size_bytes: file.size,
    origin: cleanOrigin(formData.get("origin")),
    source_date: cleanDate(formData.get("source_date")),
    created_by: (await getProfile()).username,
    created_at: new Date().toISOString(),
    pinned: false,
  };
  await putMaterial(material);
  revalidatePath("/", "layout");
  return {};
}

/** Discord чат или белешка. */
export async function addTextMaterial(input: {
  subjectId: string;
  kind: Exclude<MaterialKind, "file">;
  title: string;
  body: string;
  origin: MaterialOrigin;
  sourceDate: string | null;
}): Promise<Result> {
  if (!(await getSubject(input.subjectId))) return { error: "Предметот не постои." };
  if (input.kind !== "chat" && input.kind !== "note") return { error: "Непознат вид." };
  if (!input.body.trim() || !input.title.trim()) return { error: "Недостасува текст или наслов." };
  const material: Material = {
    id: newId(),
    subject_id: input.subjectId,
    kind: input.kind,
    title: input.title.trim().slice(0, 200),
    body: input.body.trim(),
    storage_path: null,
    file_name: null,
    mime_type: null,
    size_bytes: null,
    origin: cleanOrigin(input.origin),
    source_date: cleanDate(input.sourceDate),
    created_by: (await getProfile()).username,
    created_at: new Date().toISOString(),
    pinned: false,
  };
  await putMaterial(material);
  revalidatePath("/", "layout");
  return {};
}

export async function updateMaterial(
  id: string,
  patch: { title: string; origin: MaterialOrigin; sourceDate: string | null; body?: string },
): Promise<Result> {
  if (!patch.title.trim()) return { error: "Насловот не може да е празен." };
  await patchMaterial(id, (m) => ({
    ...m,
    title: patch.title.trim().slice(0, 200),
    origin: cleanOrigin(patch.origin),
    source_date: cleanDate(patch.sourceDate),
    ...(m.kind !== "file" && patch.body?.trim() ? { body: patch.body.trim() } : {}),
  }));
  revalidatePath("/", "layout");
  return {};
}

export async function setMaterialPinned(id: string, pinned: boolean): Promise<Result> {
  await patchMaterial(id, (m) => ({ ...m, pinned }));
  revalidatePath("/", "layout");
  return {};
}

export async function deleteMaterial(id: string): Promise<Result> {
  await removeMaterial(id);
  revalidatePath("/", "layout");
  return {};
}

/**
 * Напредок со прашањата (лично, .mozokce/progress.json). Намерно без revalidatePath:
 * страницата не треба да се прецртува по секој одговор; квизот прави refresh на крајот на сесијата.
 */
export async function saveQuestionProgress(
  brainId: string,
  changes: { id: string; row: QuestionProgressRow | null }[],
): Promise<Result> {
  if (!/^[a-z0-9-]+$/.test(brainId)) return { error: "Непознат мозок." };
  await saveProgressRows(brainId, changes);
  return {};
}
