import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { clinicalHistoryService } from "@/lib/services/clinical-history.service";
import { createOdontogramEntrySchema } from "@/lib/validations/clinical-history.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = createOdontogramEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const entry = await clinicalHistoryService.upsertOdontogramEntry(id, parsed.data);
    return Response.json(entry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;
  const entryId = req.nextUrl.searchParams.get("entryId");

  if (!entryId) {
    return Response.json({ error: "entryId requerido" }, { status: 400 });
  }

  try {
    await clinicalHistoryService.resetOdontogramEntry(id, entryId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
