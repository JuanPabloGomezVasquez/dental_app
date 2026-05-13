"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

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
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return { error: "Email o contraseña incorrectos" };
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatch) {
    return { error: "Email o contraseña incorrectos" };
  }

  await createSession(user.id, user.email, user.name);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
