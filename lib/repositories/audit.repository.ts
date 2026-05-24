import { db } from "@/lib/db";
import type { AuditAction, AuditLog, Prisma } from "@prisma/client";

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

interface FindManyParams {
  action?: AuditAction;
  organizationId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export const auditRepository = {
  create(data: CreateAuditLogInput) {
    return db.auditLog.create({ data });
  },

  async findMany(params: FindManyParams): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) where.action = params.action;
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.from ?? params.to) {
      where.createdAt = {
        ...(params.from && { gte: params.from }),
        ...(params.to && { lte: params.to }),
      };
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total };
  },
};
