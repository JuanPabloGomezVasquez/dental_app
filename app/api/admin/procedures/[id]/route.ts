import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";
import { updateProcedureSchema, toggleProcedureSchema } from "@/lib/validations/procedure.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  try {
    const procedure = await proceduresService.get(id);
    return Response.json(procedure);
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
  const parsed = updateProcedureSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const procedure = await proceduresService.update(id, parsed.data);
    return Response.json(procedure);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  await verifySession();
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = toggleProcedureSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const procedure = await proceduresService.setActive(id, parsed.data.active);
    return Response.json(procedure);
  } catch (error) {
    return handleApiError(error);
  }
}
