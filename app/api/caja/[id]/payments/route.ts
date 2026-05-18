import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getAccessibleModules, assertModuleAccess, AppModule } from "@/lib/modules";
import { cajaService } from "@/lib/services/caja.service";
import { createPaymentSchema } from "@/lib/validations/caja.schema";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.CAJA);
  const { id } = await ctx.params;

  try {
    const record = await cajaService.get(id, session.organizationId);
    return Response.json(record.payments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  const accessible = await getAccessibleModules(session.organizationId, session.role, session.doctorId);
  assertModuleAccess(accessible, AppModule.CAJA);
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const result = await cajaService.addPayment(id, session.organizationId, parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
