import type { NextRequest } from "next/server";
import { verifySession, assertAdmin } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { updatePatientSchema } from "@/lib/validations/patient.schema";
import { handleApiError } from "@/lib/errors";
import { writeAuditLog, requestMeta } from "@/lib/audit";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);
  const { id } = await ctx.params;

  try {
    const patient = await patientsService.get(id, session.organizationId);
    return Response.json(patient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const patient = await patientsService.update(id, session.organizationId, parsed.data);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "PATIENT_UPDATED",
      resource: "Patient",
      resourceId: id,
      organizationId: session.organizationId,
      ...requestMeta(req),
    });
    return Response.json(patient);
  } catch (error) {
    return handleApiError(error);
  }
}
