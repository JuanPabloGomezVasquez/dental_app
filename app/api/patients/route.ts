import type { NextRequest } from "next/server";
import { verifySession, assertAdmin } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { patientsService } from "@/lib/services/patients.service";
import { createPatientSchema } from "@/lib/validations/patient.schema";
import { handleApiError } from "@/lib/errors";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.PATIENTS);

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? undefined;
  const page = Math.max(1, parseInt(params.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, parseInt(params.get("pageSize") ?? "20") || 20);

  const result = await patientsService.list({
    organizationId: session.organizationId,
    callerRole: session.role,
    callerDoctorId: session.doctorId,
    search,
    page,
    pageSize,
  });
  return Response.json(result);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const body: unknown = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const patient = await patientsService.create(parsed.data, session.organizationId);
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "PATIENT_CREATED",
      resource: "Patient",
      resourceId: patient.id,
      organizationId: session.organizationId,
      ...requestMeta(request),
    });
    return Response.json(patient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
