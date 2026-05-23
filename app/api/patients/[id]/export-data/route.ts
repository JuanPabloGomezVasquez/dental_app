import { verifySession, assertAdmin } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { writeAuditLog, requestMeta } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function GET(req: Request, ctx: { params: Params }): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    const exportData = await patientsService.exportData(id, session.organizationId);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "PATIENT_EXPORTED",
      resource: "Patient",
      resourceId: id,
      organizationId: session.organizationId,
      ...requestMeta(req),
    });
    const filename = `datos-paciente-${exportData.patient.idNumber}.json`;
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
