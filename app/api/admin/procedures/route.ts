import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { proceduresService } from "@/lib/services/procedures.service";
import { createProcedureSchema } from "@/lib/validations/procedure.schema";
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

  const procedures = await proceduresService.list(filter);
  return Response.json(procedures);
}

export async function POST(request: NextRequest): Promise<Response> {
  await verifySession();

  const body: unknown = await request.json();
  const parsed = createProcedureSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const procedure = await proceduresService.create(parsed.data);
    return Response.json(procedure, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
