import "server-only";
import { AppModule } from "@prisma/client";
import { db } from "@/lib/db";

export const superadminRepository = {
  async listOrganizations() {
    return db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, doctors: true, patients: true } },
        orgModules: { where: { enabled: true } },
      },
    });
  },

  async findById(orgId: string) {
    return db.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, doctors: true, patients: true } },
        orgModules: true,
      },
    });
  },

  async slugExists(slug: string) {
    return !!(await db.organization.findUnique({ where: { slug } }));
  },

  async create(data: { name: string; slug: string }) {
    return db.organization.create({ data: { ...data, active: true } });
  },

  async update(orgId: string, data: { name?: string; active?: boolean }) {
    return db.organization.update({ where: { id: orgId }, data });
  },

  async setModule(orgId: string, module: AppModule, enabled: boolean) {
    return db.orgModule.upsert({
      where: { organizationId_module: { organizationId: orgId, module } },
      update: { enabled },
      create: { organizationId: orgId, module, enabled },
    });
  },
};
