import type { AuditAction } from "@prisma/client";
import { auditRepository } from "@/lib/repositories/audit.repository";

interface AuditContext {
  userId: string;
  userEmail: string;
  organizationId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditParams extends AuditContext {
  action: AuditAction;
  resource?: string;
  resourceId?: string;
}

/** Fire-and-forget — never throws, never blocks the caller. */
export function writeAuditLog(params: AuditParams): void {
  auditRepository
    .create({
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      organizationId: params.organizationId ?? undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    .catch(() => {
      // Intentionally silent — audit failures must never break app flow
    });
}

/** Extract IP + UA from a Next.js Request/NextRequest object. */
export function requestMeta(req: Request): Pick<AuditContext, "ipAddress" | "userAgent"> {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

/** Extract IP + UA from Next.js `headers()` (server actions). */
export async function serverActionMeta(): Promise<Pick<AuditContext, "ipAddress" | "userAgent">> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return {
      ipAddress:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        undefined,
      userAgent: h.get("user-agent") ?? undefined,
    };
  } catch {
    return {};
  }
}
