import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { createPatientSchema } from "@/lib/validations/patient.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  await verifySession();

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? undefined;
  const page = Math.max(1, parseInt(params.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, parseInt(params.get("pageSize") ?? "20") || 20);

  const result = await patientsService.list({ search, page, pageSize });
  return Response.json(result);
}

export async function POST(request: NextRequest): Promise<Response> {
  await verifySession();

  const body: unknown = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const patient = await patientsService.create(parsed.data);
    return Response.json(patient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
