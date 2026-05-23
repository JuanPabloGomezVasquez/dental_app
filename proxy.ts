import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptEdge, encryptEdge } from "@/lib/session-edge";
import {
  SESSION_INACTIVITY_MS,
  SESSION_MAX_AGE_MS,
} from "@/lib/session";

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  const payload = await decryptEdge(sessionCookie);

  const path = request.nextUrl.pathname;
  const isPublicRoute = /^\/(?:login|forgot-password|reset-password)/.test(path);
  const isApiAuthRoute = path.startsWith("/api/auth");

  // No session on a protected route — redirect to login
  if (!payload && !isPublicRoute && !isApiAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Valid session on a public route — redirect to dashboard
  if (payload && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // No session on public/api routes — pass through unchanged
  if (!payload) return NextResponse.next();

  const now = Date.now();
  const issuedAt =
    typeof (payload as Record<string, unknown>).iat === "number"
      ? ((payload as Record<string, unknown>).iat as number) * 1000
      : now;

  const lastActivity = payload.lastActivity ?? issuedAt;
  const absoluteStart = issuedAt;

  const inactiveFor = now - lastActivity;
  const sessionAge = now - absoluteStart;

  // Force re-login on inactivity or absolute expiry
  if (inactiveFor > SESSION_INACTIVITY_MS || sessionAge > SESSION_MAX_AGE_MS) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  // Sliding window: refresh cookie with updated lastActivity
  const refreshed = await encryptEdge({ ...payload, lastActivity: now });
  const response = NextResponse.next();
  response.cookies.set("session", refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_INACTIVITY_MS / 1000),
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
