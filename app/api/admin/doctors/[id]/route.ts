import type { NextRequest } from "next/server";
import { verifySession, assertAdmin } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { updateDoctorSchema, toggleDoctorSchema } from "@/lib/validations/doctor.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    const doctor = await doctorsService.get(id, session.organizationId);
    return Response.json(doctor);
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
  const parsed = updateDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const doctor = await doctorsService.update(id, session.organizationId, parsed.data);
    return Response.json(doctor);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = toggleDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const doctor = await doctorsService.setActive(id, session.organizationId, parsed.data.active);
    return Response.json(doctor);
  } catch (error) {
    return handleApiError(error);
  }
}
