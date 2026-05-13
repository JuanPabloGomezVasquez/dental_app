import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { updateBackgroundSchema } from "@/lib/validations/clinical-history.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    const history = await clinicalHistoryService.getByPatientId(id);
    return Response.json(history);
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
  const parsed = updateBackgroundSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    await clinicalHistoryService.updateBackground(id, parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
