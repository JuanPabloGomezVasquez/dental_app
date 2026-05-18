import { AppModule } from "@prisma/client";
import { orgModulesRepository } from "@/lib/repositories/org-modules.repository";

export type OrgModuleStatus = {
  module: AppModule;
  enabled: boolean;
};

export type DoctorModuleStatus = {
  module: AppModule;
  enabled: boolean;
  orgEnabled: boolean;
};

const ALL_MODULES = Object.values(AppModule);

const service = {
  async getOrgModules(organizationId: string): Promise<OrgModuleStatus[]> {
    const rows = await orgModulesRepository.findOrgModules(organizationId);
    const map = new Map(rows.map((r) => [r.module, r.enabled]));
    return ALL_MODULES.map((module) => ({
      module,
      enabled: map.get(module) ?? false,
    }));
  },

  async setOrgModule(organizationId: string, module: AppModule, enabled: boolean): Promise<void> {
    await orgModulesRepository.setOrgModule(organizationId, module, enabled);
    if (!enabled) {
      await orgModulesRepository.disableDoctorPermsForModule(organizationId, module);
    }
  },

  async getDoctorModulePerms(
    doctorId: string,
    organizationId: string
  ): Promise<DoctorModuleStatus[]> {
    const [orgModules, doctorPerms] = await Promise.all([
      orgModulesRepository.findOrgModules(organizationId),
      orgModulesRepository.findDoctorPerms(doctorId),
    ]);

    const orgMap = new Map(orgModules.map((r) => [r.module, r.enabled]));
    const doctorMap = new Map(doctorPerms.map((r) => [r.module, r.enabled]));

    return ALL_MODULES.map((module) => ({
      module,
      enabled: doctorMap.get(module) ?? false,
      orgEnabled: orgMap.get(module) ?? false,
    }));
  },

  async setDoctorModulePerm(
    doctorId: string,
    organizationId: string,
    module: AppModule,
    enabled: boolean
  ): Promise<void> {
    if (enabled) {
      const orgModules = await orgModulesRepository.findOrgModules(organizationId);
      const orgModule = orgModules.find((m) => m.module === module);
      if (!orgModule?.enabled) {
        throw new Error("No se puede habilitar un módulo que no está activo para la organización");
      }
    }
    await orgModulesRepository.setDoctorPerm(doctorId, module, enabled);
  },
};

export const orgModulesService = service;
