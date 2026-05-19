import "server-only";
import bcrypt from "bcryptjs";
import { AppModule } from "@prisma/client";
import { db } from "@/lib/db";
import { superadminRepository } from "@/lib/repositories/superadmin.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";

const ALL_MODULES = Object.values(AppModule);

export const superadminService = {
  async listOrganizations() {
    const orgs = await superadminRepository.listOrganizations();
    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      active: org.active,
      createdAt: org.createdAt,
      userCount: org._count.users,
      doctorCount: org._count.doctors,
      patientCount: org._count.patients,
      enabledModules: org.orgModules.map((m) => m.module),
    }));
  },

  async getOrgDetail(orgId: string) {
    const org = await superadminRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organización no encontrada");

    const moduleMap = new Map(org.orgModules.map((m) => [m.module, m.enabled]));
    const modules = ALL_MODULES.map((module) => ({
      module,
      enabled: moduleMap.get(module) ?? false,
    }));

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      active: org.active,
      createdAt: org.createdAt,
      userCount: org._count.users,
      doctorCount: org._count.doctors,
      patientCount: org._count.patients,
      modules,
    };
  },

  async createOrganization(data: {
    name: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    modules: AppModule[];
  }) {
    if (await superadminRepository.slugExists(data.slug)) {
      throw new ConflictError("El slug ya está en uso por otra organización");
    }
    const existingUser = await db.user.findUnique({ where: { email: data.adminEmail } });
    if (existingUser) {
      throw new ConflictError("El email ya está registrado en el sistema");
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);

    return db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.name, slug: data.slug, active: true },
      });

      await tx.user.create({
        data: {
          email: data.adminEmail,
          hashedPassword,
          name: data.adminName,
          role: "ADMIN",
          active: true,
          organizationId: org.id,
        },
      });

      await tx.orgModule.createMany({
        data: ALL_MODULES.map((module) => ({
          organizationId: org.id,
          module,
          enabled: data.modules.includes(module),
        })),
      });

      return org;
    });
  },

  async updateOrganization(orgId: string, data: { name?: string; active?: boolean }) {
    const org = await superadminRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organización no encontrada");
    return superadminRepository.update(orgId, data);
  },

  async setOrgModule(orgId: string, module: AppModule, enabled: boolean) {
    const org = await superadminRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organización no encontrada");

    await db.$transaction(async (tx) => {
      await tx.orgModule.upsert({
        where: { organizationId_module: { organizationId: orgId, module } },
        update: { enabled },
        create: { organizationId: orgId, module, enabled },
      });
      // Cascade: disabling an org module also revokes all doctor grants for that module
      if (!enabled) {
        await tx.doctorModulePermission.updateMany({
          where: { module, doctor: { organizationId: orgId } },
          data: { enabled: false },
        });
      }
    });
  },
};
