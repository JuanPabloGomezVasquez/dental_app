import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { totpService } from "@/lib/services/totp.service";

export async function POST(req: Request): Promise<Response> {
  const session = await verifySession();

  const body = await req.json() as { token?: unknown };
  const token = body?.token;
  if (typeof token !== "string" || !/^\d{6}$/.test(token)) {
    return Response.json({ error: "Código inválido" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.totpSecret) {
    return Response.json({ error: "Primero inicia el proceso de configuración" }, { status: 400 });
  }

  if (user.totpEnabled) {
    return Response.json({ error: "2FA ya está habilitado" }, { status: 400 });
  }

  if (!(await totpService.verifyToken(token, user.totpSecret))) {
    return Response.json({ error: "Código incorrecto" }, { status: 400 });
  }

  const encryptedSecret = totpService.encryptSecret(user.totpSecret);
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: encryptedSecret, totpEnabled: true },
  });

  return Response.json({ ok: true });
}
