import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { patientsService } from "@/lib/services/patients.service";
import { updatePatientSchema } from "@/lib/validations/patient.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    const patient = await patientsService.get(id);
    return Response.json(patient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
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
    const patient = await patientsService.update(id, parsed.data);
    return Response.json(patient);
  } catch (error) {
    return handleApiError(error);
  }
}
