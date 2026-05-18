import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppModule } from "@prisma/client";

vi.mock("@/lib/repositories/org-modules.repository", () => ({
  orgModulesRepository: {
    findOrgModules: vi.fn(),
    setOrgModule: vi.fn(),
    findDoctorPerms: vi.fn(),
    setDoctorPerm: vi.fn(),
    disableDoctorPermsForModule: vi.fn(),
  },
}));

import { orgModulesService } from "@/lib/services/org-modules.service";
import { orgModulesRepository } from "@/lib/repositories/org-modules.repository";

const repo = vi.mocked(orgModulesRepository);

const ORG_ID = "org-1";
const DOCTOR_ID = "doc-1";

function makeOrgRow(module: AppModule, enabled: boolean) {
  return { id: "r", organizationId: ORG_ID, module, enabled, createdAt: new Date(), updatedAt: new Date() };
}

function makeDoctorRow(module: AppModule, enabled: boolean) {
  return { id: "r", doctorId: DOCTOR_ID, module, enabled, createdAt: new Date(), updatedAt: new Date() };
}

beforeEach(() => vi.clearAllMocks());

describe("orgModulesService.getOrgModules", () => {
  it("returns all 5 modules filling missing ones with enabled=false", async () => {
    repo.findOrgModules.mockResolvedValue([
      makeOrgRow(AppModule.APPOINTMENTS, true),
      makeOrgRow(AppModule.INVENTORY, false),
    ]);

    const result = await orgModulesService.getOrgModules(ORG_ID);

    expect(result).toHaveLength(Object.values(AppModule).length);
    expect(result.find((r) => r.module === AppModule.APPOINTMENTS)?.enabled).toBe(true);
    expect(result.find((r) => r.module === AppModule.INVENTORY)?.enabled).toBe(false);
    expect(result.find((r) => r.module === AppModule.CAJA)?.enabled).toBe(false); // not in DB → false
  });
});

describe("orgModulesService.setOrgModule", () => {
  it("calls setOrgModule on the repository", async () => {
    repo.setOrgModule.mockResolvedValue(makeOrgRow(AppModule.APPOINTMENTS, true));

    await orgModulesService.setOrgModule(ORG_ID, AppModule.APPOINTMENTS, true);

    expect(repo.setOrgModule).toHaveBeenCalledWith(ORG_ID, AppModule.APPOINTMENTS, true);
  });

  it("cascades disable to doctor permissions when disabling a module", async () => {
    repo.setOrgModule.mockResolvedValue(makeOrgRow(AppModule.CAJA, false));
    repo.disableDoctorPermsForModule.mockResolvedValue(undefined);

    await orgModulesService.setOrgModule(ORG_ID, AppModule.CAJA, false);

    expect(repo.disableDoctorPermsForModule).toHaveBeenCalledWith(ORG_ID, AppModule.CAJA);
  });

  it("does NOT cascade disable when enabling a module", async () => {
    repo.setOrgModule.mockResolvedValue(makeOrgRow(AppModule.CAJA, true));

    await orgModulesService.setOrgModule(ORG_ID, AppModule.CAJA, true);

    expect(repo.disableDoctorPermsForModule).not.toHaveBeenCalled();
  });
});

describe("orgModulesService.getDoctorModulePerms", () => {
  it("combines org and doctor states for all modules", async () => {
    repo.findOrgModules.mockResolvedValue([
      makeOrgRow(AppModule.APPOINTMENTS, true),
      makeOrgRow(AppModule.CAJA, false),
    ]);
    repo.findDoctorPerms.mockResolvedValue([
      makeDoctorRow(AppModule.APPOINTMENTS, true),
    ]);

    const result = await orgModulesService.getDoctorModulePerms(DOCTOR_ID, ORG_ID);

    const appointments = result.find((r) => r.module === AppModule.APPOINTMENTS)!;
    expect(appointments.orgEnabled).toBe(true);
    expect(appointments.enabled).toBe(true);

    const caja = result.find((r) => r.module === AppModule.CAJA)!;
    expect(caja.orgEnabled).toBe(false);
    expect(caja.enabled).toBe(false);

    const patients = result.find((r) => r.module === AppModule.PATIENTS)!;
    expect(patients.orgEnabled).toBe(false); // not in org rows
    expect(patients.enabled).toBe(false);    // not in doctor rows
  });
});

describe("orgModulesService.setDoctorModulePerm", () => {
  it("grants doctor permission when org has the module enabled", async () => {
    repo.findOrgModules.mockResolvedValue([makeOrgRow(AppModule.PATIENTS, true)]);
    repo.setDoctorPerm.mockResolvedValue(makeDoctorRow(AppModule.PATIENTS, true));

    await orgModulesService.setDoctorModulePerm(DOCTOR_ID, ORG_ID, AppModule.PATIENTS, true);

    expect(repo.setDoctorPerm).toHaveBeenCalledWith(DOCTOR_ID, AppModule.PATIENTS, true);
  });

  it("throws when enabling a module that is disabled at org level", async () => {
    repo.findOrgModules.mockResolvedValue([makeOrgRow(AppModule.PATIENTS, false)]);

    await expect(
      orgModulesService.setDoctorModulePerm(DOCTOR_ID, ORG_ID, AppModule.PATIENTS, true)
    ).rejects.toThrow("No se puede habilitar un módulo");
  });

  it("allows disabling without checking org module state", async () => {
    repo.setDoctorPerm.mockResolvedValue(makeDoctorRow(AppModule.PATIENTS, false));

    await orgModulesService.setDoctorModulePerm(DOCTOR_ID, ORG_ID, AppModule.PATIENTS, false);

    expect(repo.findOrgModules).not.toHaveBeenCalled();
    expect(repo.setDoctorPerm).toHaveBeenCalledWith(DOCTOR_ID, AppModule.PATIENTS, false);
  });
});
