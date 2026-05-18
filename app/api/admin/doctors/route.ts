import type { NextRequest } from "next/server";
import { verifySession, assertAdmin } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { createDoctorSchema } from "@/lib/validations/doctor.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const activeParam = request.nextUrl.searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const doctors = await doctorsService.list({ organizationId: session.organizationId, active });
  return Response.json(doctors);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const body: unknown = await request.json();
  const parsed = createDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const doctor = await doctorsService.create(parsed.data, session.organizationId);
    return Response.json(doctor, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
