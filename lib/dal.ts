import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "./session";
import { ForbiddenError } from "./errors";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "DOCTOR";
  organizationId: string;
  doctorId: string | null;
};

export const verifySession = cache(async (): Promise<SessionUser> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const session = await decrypt(sessionCookie);

  if (!session?.userId || !session?.organizationId || !session?.role) {
    redirect("/login");
  }

  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    organizationId: session.organizationId,
    doctorId: session.doctorId ?? null,
  };
});

export function assertAdmin(role: "ADMIN" | "DOCTOR"): void {
  if (role !== "ADMIN") {
    throw new ForbiddenError("Solo los administradores pueden realizar esta acción");
  }
}
