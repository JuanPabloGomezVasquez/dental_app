import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppModule } from "@prisma/client";
import { verifySession, assertAdmin } from "@/lib/dal";
import { orgModulesService } from "@/lib/services/org-modules.service";
import { handleApiError } from "@/lib/errors";

const setModuleSchema = z.object({
  module: z.nativeEnum(AppModule),
  enabled: z.boolean(),
});

export async function GET(): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  try {
    const modules = await orgModulesService.getOrgModules(session.organizationId);
    return Response.json(modules);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);

  const body: unknown = await req.json();
  const parsed = setModuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    await orgModulesService.setOrgModule(
      session.organizationId,
      parsed.data.module,
      parsed.data.enabled
    );
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
