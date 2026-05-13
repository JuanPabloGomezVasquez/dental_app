import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { verifySession } from "@/lib/dal";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const formData = await req.formData();
  const file = formData.get("file");
  const label = formData.get("label");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: "Tipo de archivo no permitido. Solo PDF e imágenes." },
      { status: 400 }
    );
  }

  try {
    const blob = await put(file.name, file, { access: "public" });
    const patientFile = await clinicalHistoryService.addFile(id, {
      name: file.name,
      label: typeof label === "string" && label.trim() ? label.trim() : undefined,
      url: blob.url,
      mimeType: file.type,
    });
    return Response.json(patientFile, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;
  const fileId = req.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return Response.json({ error: "fileId requerido" }, { status: 400 });
  }

  try {
    await clinicalHistoryService.deleteFile(id, fileId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
