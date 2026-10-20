"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveProfile, updateSubjects } from "@/lib/data";
import { subjectSlug } from "@/lib/subjects";
import { validateUsername } from "@/lib/username";

export interface FormState {
  error?: string;
  notice?: string;
}

function subjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().slice(0, 12);
  return { name, code: code || null };
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function createSubject(_prev: FormState, formData: FormData): Promise<FormState> {
  const { name, code } = subjectFields(formData);
  if (!name) return { error: "Внеси име на предметот." };
  let id = "";
  let duplicate = false;
  await updateSubjects((list) => {
    if (list.some((s) => sameName(s.name, name))) {
      duplicate = true;
      return list;
    }
    id = subjectSlug(code ?? name, list.map((s) => s.id));
    return [...list, { id, name, code, archived: false, created_at: new Date().toISOString() }];
  });
  if (duplicate) return { error: "Веќе постои предмет со тоа име." };
  revalidatePath("/", "layout");
  redirect(`/subjects/${id}`);
}

export async function renameSubject(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const { name, code } = subjectFields(formData);
  if (!name) return { error: "Внеси име." };
  let duplicate = false;
  await updateSubjects((list) => {
    if (list.some((s) => s.id !== id && sameName(s.name, name))) {
      duplicate = true;
      return list;
    }
    return list.map((s) => (s.id === id ? { ...s, name, code } : s));
  });
  if (duplicate) return { error: "Веќе постои предмет со тоа име." };
  revalidatePath("/", "layout");
  return { notice: "Зачувано." };
}

export async function setSubjectArchived(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  await updateSubjects((list) => list.map((s) => (s.id === id ? { ...s, archived } : s)));
  revalidatePath("/", "layout");
}

export async function updateUsername(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const invalid = validateUsername(username);
  if (invalid) return { error: invalid };
  await saveProfile({ username });
  revalidatePath("/", "layout");
  return { notice: "Зачувано." };
}
