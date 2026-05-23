import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "DOCTOR" | "SUPER_ADMIN";
  organizationId: string | null;
  doctorId: string | null;
  expiresAt: Date;
  lastActivity?: number; // unix ms — set/refreshed by middleware
};

// Absolute session lifetime: 8 hours
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
// Inactivity window: 30 minutes
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

function getEncodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getEncodedKey());
}

export async function decrypt(session?: string): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  email: string,
  name: string,
  role: "ADMIN" | "DOCTOR" | "SUPER_ADMIN",
  organizationId: string | null,
  doctorId: string | null
) {
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_MAX_AGE_MS);
  const session = await encrypt({
    userId,
    email,
    name,
    role,
    organizationId,
    doctorId,
    expiresAt,
    lastActivity: now,
  });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
