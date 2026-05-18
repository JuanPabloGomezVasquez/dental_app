import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppModule } from "@prisma/client";
import { verifySession, assertAdmin } from "@/lib/dal";
import { orgModulesService } from "@/lib/services/org-modules.service";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

const setPermSchema = z.object({
  module: z.nativeEnum(AppModule),
  enabled: z.boolean(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    const perms = await orgModulesService.getDoctorModulePerms(id, session.organizationId);
    return Response.json(perms);
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
  const parsed = setPermSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    await orgModulesService.setDoctorModulePerm(
      id,
      session.organizationId,
      parsed.data.module,
      parsed.data.enabled
    );
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
