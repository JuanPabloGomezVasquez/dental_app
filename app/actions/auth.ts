"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { getAccessibleModules } from "@/lib/modules";
import { MODULE_ORDER, MODULE_METADATA } from "@/lib/module-metadata";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = {
  error?: string;
};

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

  const user = await db.user.findUnique({
    where: { email },
    include: { doctor: { select: { id: true } } },
  });

  if (!user || !user.active) {
    return { error: "Email o contraseña incorrectos" };
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatch) {
    return { error: "Email o contraseña incorrectos" };
  }

  if (!user.organizationId) {
    return { error: "Usuario sin organización asignada. Contacta al administrador." };
  }

  const role = user.role === "DOCTOR" ? "DOCTOR" : "ADMIN";
  const doctorId = user.doctor?.id ?? null;

  await createSession(
    user.id,
    user.email,
    user.name,
    role,
    user.organizationId,
    doctorId
  );

  if (role === "DOCTOR") {
    const accessible = await getAccessibleModules(user.organizationId, "DOCTOR", doctorId);
    const firstMod = MODULE_ORDER.find((m) => accessible.has(m));
    redirect(firstMod ? MODULE_METADATA[firstMod].href : "/no-access");
  } else {
    redirect("/dashboard");
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
