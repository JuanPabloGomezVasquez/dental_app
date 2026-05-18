import { db } from "@/lib/db";
import type { AppModule, OrgModule, DoctorModulePermission } from "@prisma/client";

interface OrgModulesRepository {
  findOrgModules(organizationId: string): Promise<OrgModule[]>;
  setOrgModule(organizationId: string, module: AppModule, enabled: boolean): Promise<OrgModule>;
  findDoctorPerms(doctorId: string): Promise<DoctorModulePermission[]>;
  setDoctorPerm(doctorId: string, module: AppModule, enabled: boolean): Promise<DoctorModulePermission>;
  disableDoctorPermsForModule(organizationId: string, module: AppModule): Promise<void>;
}

const repo: OrgModulesRepository = {
  findOrgModules(organizationId) {
    return db.orgModule.findMany({ where: { organizationId } });
  },

  setOrgModule(organizationId, module, enabled) {
    return db.orgModule.upsert({
      where: { organizationId_module: { organizationId, module } },
      update: { enabled },
      create: { organizationId, module, enabled },
    });
  },

  findDoctorPerms(doctorId) {
    return db.doctorModulePermission.findMany({ where: { doctorId } });
  },

  setDoctorPerm(doctorId, module, enabled) {
    return db.doctorModulePermission.upsert({
      where: { doctorId_module: { doctorId, module } },
      update: { enabled },
      create: { doctorId, module, enabled },
    });
  },

  async disableDoctorPermsForModule(organizationId, module) {
    const doctors = await db.doctor.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const doctorIds = doctors.map((d) => d.id);
    if (doctorIds.length === 0) return;
    await db.doctorModulePermission.updateMany({
      where: { doctorId: { in: doctorIds }, module },
      data: { enabled: false },
    });
  },
};

export const orgModulesRepository = repo;
