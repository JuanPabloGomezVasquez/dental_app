import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "./session";
import { ForbiddenError } from "./errors";

// Session type for ADMIN and DOCTOR users (always have organizationId)
export type DashboardSessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "DOCTOR";
  organizationId: string;
  doctorId: string | null;
};

// Session type for the platform owner (no organizationId)
export type SuperAdminSessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN";
};

async function getDecryptedSession() {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get("session")?.value);
}

// Used by all (dashboard) routes. Blocks SUPER_ADMIN (no organizationId → /login).
export const verifySession = cache(async (): Promise<DashboardSessionUser> => {
  const session = await getDecryptedSession();

  if (
    !session?.userId ||
    !session?.organizationId ||
    !session?.role ||
    session.role === "SUPER_ADMIN"
  ) {
    redirect("/login");
  }

  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role as "ADMIN" | "DOCTOR",
    organizationId: session.organizationId,
    doctorId: session.doctorId ?? null,
  };
});

// Used by all (superadmin) routes. Blocks ADMIN and DOCTOR.
export const verifySuperAdmin = cache(async (): Promise<SuperAdminSessionUser> => {
  const session = await getDecryptedSession();

  if (!session?.userId || session?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: "SUPER_ADMIN",
  };
});

export function assertAdmin(role: "ADMIN" | "DOCTOR"): void {
  if (role !== "ADMIN") {
    throw new ForbiddenError("Solo los administradores pueden realizar esta acción");
  }
}

/** Read session without enforcing — returns null when not authenticated. */
export async function getSession() {
  return getDecryptedSession();
}

/**
 * Accepts any authenticated session (ADMIN, DOCTOR, or SUPER_ADMIN).
 * Use this for operations that are user-scoped but not role-restricted,
 * such as the user's own TOTP/security settings.
 */
export const verifyAuthenticated = cache(async (): Promise<{ userId: string }> => {
  const session = await getDecryptedSession();
  if (!session?.userId) redirect("/login");
  return { userId: session.userId };
});
