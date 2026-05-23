/**
 * Edge-safe session helpers used exclusively by middleware.ts.
 * No "server-only" import — middleware runs on Edge Runtime.
 */
import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload } from "./session";

export type { SessionPayload };

function getEncodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido");
  return new TextEncoder().encode(secret);
}

export async function encryptEdge(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getEncodedKey());
}

export async function decryptEdge(
  session?: string
): Promise<SessionPayload | null> {
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
