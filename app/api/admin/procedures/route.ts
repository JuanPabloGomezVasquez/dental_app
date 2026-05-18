import type { NextRequest } from "next/server";
import { verifySession, assertAdmin } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";
import { createProcedureSchema } from "@/lib/validations/procedure.schema";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const activeParam = request.nextUrl.searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const procedures = await proceduresService.list({ organizationId: session.organizationId, active });
  return Response.json(procedures);
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const body: unknown = await request.json();
  const parsed = createProcedureSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const procedure = await proceduresService.create(parsed.data, session.organizationId);
    return Response.json(procedure, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
