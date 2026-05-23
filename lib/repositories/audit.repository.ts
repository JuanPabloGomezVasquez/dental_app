import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

interface CreateAuditLogInput {
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const auditRepository = {
  create(data: CreateAuditLogInput) {
    return db.auditLog.create({ data });
  },
};
