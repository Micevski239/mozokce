import { getMaterial, readStoredFile } from "@/lib/data";

/** Ја отвора датотеката од материјал (од data/files) во прелистувачот. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = await getMaterial(id).catch(() => null);
  if (!material?.storage_path) return new Response("Датотеката не постои.", { status: 404 });
  const bytes = await readStoredFile(material.storage_path).catch(() => null);
  if (!bytes) return new Response("Датотеката не постои.", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": material.mime_type ?? "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(material.file_name ?? "datoteka")}`,
      "cache-control": "private, max-age=3600",
    },
  });
}
