import type { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Email inválido" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always return success to avoid email enumeration
  const user = await db.user.findUnique({ where: { email, active: true } });
  if (user) {
    // Delete any existing tokens for this user
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    try {
      await sendPasswordResetEmail(email, user.name, token);
    } catch (err) {
      console.error("[forgot-password] Failed to send reset email:", err);
    }
  }

  return Response.json({ ok: true });
}
