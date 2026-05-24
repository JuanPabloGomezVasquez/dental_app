import { verifyAuthenticated } from "@/lib/dal";
import { db } from "@/lib/db";
import { totpService } from "@/lib/services/totp.service";

export async function GET(): Promise<Response> {
  const session = await verifyAuthenticated();

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (user.totpEnabled) {
    return Response.json({ error: "2FA ya está habilitado" }, { status: 400 });
  }

  const secret = totpService.generateSecret();
  const otpauthUrl = totpService.getOtpauthUrl(user.email, secret);
  const qrDataUrl = await totpService.getQrDataUrl(otpauthUrl);

  // Store plain secret temporarily — will be encrypted on /enable
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  });

  return Response.json({ qrDataUrl, secret });
}
