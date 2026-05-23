"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { getSession } from "@/lib/dal";
import { getAccessibleModules } from "@/lib/modules";
import { MODULE_ORDER, MODULE_METADATA } from "@/lib/module-metadata";
import { writeAuditLog, serverActionMeta } from "@/lib/audit";
import { totpService } from "@/lib/services/totp.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = {
  error?: string;
  requires2fa?: boolean;
};

function getPendingKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido");
  return new TextEncoder().encode(secret);
}

async function setPending2faCookie(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(getPendingKey());

  const cookieStore = await cookies();
  cookieStore.set("pending_2fa", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

async function consumePending2faCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pending_2fa")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getPendingKey(), { algorithms: ["HS256"] });
    cookieStore.delete("pending_2fa");
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: "Email o contraseña inválidos" };
  }

  const { email, password } = result.data;

  const meta = await serverActionMeta();

  const user = await db.user.findUnique({
    where: { email },
    include: { doctor: { select: { id: true } } },
  });

  if (!user || !user.active) {
    if (user) {
      writeAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: "LOGIN_FAILED",
        organizationId: user.organizationId,
        ...meta,
      });
    }
    return { error: "Email o contraseña incorrectos" };
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatch) {
    writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_FAILED",
      organizationId: user.organizationId,
      ...meta,
    });
    return { error: "Email o contraseña incorrectos" };
  }

  const role = user.role === "DOCTOR" ? "DOCTOR" : user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const doctorId = user.doctor?.id ?? null;

  // Non-super-admin users must belong to an active organization
  if (role !== "SUPER_ADMIN") {
    if (!user.organizationId) {
      return { error: "Usuario sin organización asignada. Contacta al administrador." };
    }
    const org = await db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org?.active) {
      return { error: "La cuenta de tu clínica está suspendida. Contacta al proveedor." };
    }
  }

  if (user.totpEnabled && user.totpSecret) {
    await setPending2faCookie(user.id);
    return { requires2fa: true };
  }

  await createSession(user.id, user.email, user.name, role, user.organizationId ?? null, doctorId);

  writeAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: "LOGIN",
    organizationId: user.organizationId,
    ...meta,
  });

  if (role === "SUPER_ADMIN") {
    redirect("/superadmin/organizations");
  } else if (role === "DOCTOR") {
    const accessible = await getAccessibleModules(user.organizationId!, "DOCTOR", doctorId);
    const firstMod = MODULE_ORDER.find((m) => accessible.has(m));
    redirect(firstMod ? MODULE_METADATA[firstMod].href : "/no-access");
  } else {
    redirect("/dashboard");
  }
}

export async function verify2fa(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !/^\d{6}$/.test(token)) {
    return { error: "Código inválido" };
  }

  const userId = await consumePending2faCookie();
  if (!userId) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { doctor: { select: { id: true } } },
  });

  if (!user || !user.active || !user.totpEnabled || !user.totpSecret) {
    return { error: "Error de autenticación. Vuelve a intentarlo." };
  }

  const secret = totpService.decryptSecret(user.totpSecret);
  if (!(await totpService.verifyToken(token, secret))) {
    const meta = await serverActionMeta();
    writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_FAILED",
      organizationId: user.organizationId,
      ...meta,
    });
    return { error: "Código incorrecto. Intenta de nuevo." };
  }

  const role = user.role === "DOCTOR" ? "DOCTOR" : user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const doctorId = user.doctor?.id ?? null;

  if (role !== "SUPER_ADMIN") {
    if (!user.organizationId) {
      return { error: "Usuario sin organización asignada." };
    }
    const org = await db.organization.findUnique({ where: { id: user.organizationId } });
    if (!org?.active) {
      return { error: "La cuenta de tu clínica está suspendida." };
    }
  }

  await createSession(user.id, user.email, user.name, role, user.organizationId ?? null, doctorId);

  const meta = await serverActionMeta();
  writeAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: "LOGIN",
    organizationId: user.organizationId,
    ...meta,
  });

  if (role === "SUPER_ADMIN") {
    redirect("/superadmin/organizations");
  } else if (role === "DOCTOR") {
    const accessible = await getAccessibleModules(user.organizationId!, "DOCTOR", doctorId);
    const firstMod = MODULE_ORDER.find((m) => accessible.has(m));
    redirect(firstMod ? MODULE_METADATA[firstMod].href : "/no-access");
  } else {
    redirect("/dashboard");
  }
}

export async function logout() {
  const [session, meta] = await Promise.all([getSession(), serverActionMeta()]);
  if (session?.userId) {
    writeAuditLog({
      userId: session.userId,
      userEmail: session.email,
      action: "LOGOUT",
      organizationId: session.organizationId ?? undefined,
      ...meta,
    });
  }
  await deleteSession();
  redirect("/login");
}
