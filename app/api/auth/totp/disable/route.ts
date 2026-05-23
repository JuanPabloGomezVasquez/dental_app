import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { totpService } from "@/lib/services/totp.service";

export async function DELETE(req: Request): Promise<Response> {
  const session = await verifySession();

  const body = await req.json() as { token?: unknown; password?: unknown };
  const token = body?.token;
  const password = body?.password;

  if (typeof token !== "string" || !/^\d{6}$/.test(token)) {
    return Response.json({ error: "Código TOTP requerido" }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return Response.json({ error: "Contraseña requerida" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return Response.json({ error: "2FA no está habilitado" }, { status: 400 });
  }

  const passwordOk = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordOk) {
    return Response.json({ error: "Contraseña incorrecta" }, { status: 403 });
  }

  const secret = totpService.decryptSecret(user.totpSecret);
  if (!(await totpService.verifyToken(token, secret))) {
    return Response.json({ error: "Código incorrecto" }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabled: false },
  });

  return Response.json({ ok: true });
}
