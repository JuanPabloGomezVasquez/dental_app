import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { createDoctorSchema } from "@/lib/validations/doctor.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  await verifySession();

  const activeParam = request.nextUrl.searchParams.get("active");
  const filter =
    activeParam === "true"
      ? { active: true }
      : activeParam === "false"
        ? { active: false }
        : undefined;

  const doctors = await doctorsService.list(filter);
  return Response.json(doctors);
}

export async function POST(request: NextRequest): Promise<Response> {
  await verifySession();

  const body: unknown = await request.json();
  const parsed = createDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const doctor = await doctorsService.create(parsed.data);
    return Response.json(doctor, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
