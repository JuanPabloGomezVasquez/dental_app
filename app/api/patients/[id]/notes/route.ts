import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { createNoteSchema } from "@/lib/validations/clinical-history.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

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

  try {
    const note = await clinicalHistoryService.addNote(id, parsed.data);
    return Response.json(note, { status: 201 });
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
    await clinicalHistoryService.deleteNote(id, noteId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
