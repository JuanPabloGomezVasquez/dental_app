import { verifySession, assertAdmin } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { writeAuditLog, requestMeta } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, ctx: { params: Params }): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    await patientsService.anonymize(id, session.organizationId);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "PATIENT_ANONYMIZED",
      resource: "Patient",
      resourceId: id,
      organizationId: session.organizationId,
      ...requestMeta(req),
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
