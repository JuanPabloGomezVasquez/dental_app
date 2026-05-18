import { verifySession, assertAdmin } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { handleApiError, NotFoundError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, ctx: { params: Params }): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    await patientsService.anonymize(id, session.organizationId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
