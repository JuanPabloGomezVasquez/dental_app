import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifySession, assertAdmin } from "@/lib/dal";
import { doctorsService } from "@/lib/services/doctors.service";
import { handleApiError } from "@/lib/errors";

type Params = Promise<{ id: string }>;

const enableLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  initialPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  const body: unknown = await req.json();
  const parsed = enableLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    await doctorsService.enableLogin(
      id,
      session.organizationId,
      parsed.data.email,
      parsed.data.initialPassword
    );
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Params }
): Promise<Response> {
  const session = await verifySession();
  assertAdmin(session.role);
  const { id } = await ctx.params;

  try {
    await doctorsService.disableLogin(id, session.organizationId);
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
