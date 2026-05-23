import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { createNoteSchema } from "@/lib/validations/clinical-history.schema";
import { handleApiError } from "@/lib/errors";
import { writeAuditLog, requestMeta } from "@/lib/audit";

type Params = Promise<{ id: string }>;

const updateNoteSchema = z.object({
  content: z.string().min(1, "El contenido es requerido").max(5000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  if (!session.doctorId) {
    return Response.json(
      { error: "Solo los doctores pueden crear notas clínicas" },
      { status: 403 }
    );
  }

  try {
    const note = await clinicalHistoryService.addNote(id, {
      ...parsed.data,
      doctorId: session.doctorId,
    });
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "CLINICAL_NOTE_CREATED",
      resource: "ClinicalNote",
      resourceId: note.id,
      organizationId: session.organizationId,
      ...requestMeta(req),
    });
    return Response.json(note, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);
  const { id } = await ctx.params;
  const noteId = req.nextUrl.searchParams.get("noteId");

  if (!noteId) {
    return Response.json({ error: "noteId requerido" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const note = await clinicalHistoryService.updateNote(
      id,
      noteId,
      parsed.data.content,
      session.doctorId
    );
    return Response.json(note);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);
  const { id } = await ctx.params;
  const noteId = req.nextUrl.searchParams.get("noteId");

  if (!noteId) {
    return Response.json({ error: "noteId requerido" }, { status: 400 });
  }

  try {
    await clinicalHistoryService.deleteNote(id, noteId, session.role, session.doctorId);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "CLINICAL_NOTE_DELETED",
      resource: "ClinicalNote",
      resourceId: noteId,
      organizationId: session.organizationId,
      ...requestMeta(req),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
