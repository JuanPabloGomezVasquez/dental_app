import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { cajaService } from "@/lib/services/caja.service";
import { createCajaRecordSchema } from "@/lib/validations/caja.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.CAJA);

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? undefined;
  const status = params.get("status") ?? undefined;
  const patientId = params.get("patientId") ?? undefined;
  const page = Math.max(1, parseInt(params.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, parseInt(params.get("pageSize") ?? "20") || 20);

  const data = await cajaService.list({
    organizationId: session.organizationId,
    search,
    status,
    patientId,
    page,
    pageSize,
  });
  return Response.json(data);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.CAJA);

  const body: unknown = await request.json();
  const parsed = createCajaRecordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const record = await cajaService.create(parsed.data, session.organizationId);
    return Response.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
