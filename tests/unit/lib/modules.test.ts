import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppModule } from "@prisma/client";

// Mock db BEFORE importing modules.ts (which calls db at the top level via cache)
vi.mock("@/lib/db", () => ({
  db: {
    orgModule: { findMany: vi.fn() },
    doctorModulePermission: { findMany: vi.fn() },
  },
}));

import { getAccessibleModules, assertModuleAccess } from "@/lib/modules";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

const orgFindMany = vi.mocked(db.orgModule.findMany);
const doctorFindMany = vi.mocked(db.doctorModulePermission.findMany);

const ORG_ID = "org-1";
const DOCTOR_ID = "doc-1";

function makeOrgModule(module: AppModule, enabled: boolean) {
  return { id: "id", organizationId: ORG_ID, module, enabled, createdAt: new Date(), updatedAt: new Date() };
}

function makeDoctorPerm(module: AppModule, enabled: boolean) {
  return { id: "id", doctorId: DOCTOR_ID, module, enabled, createdAt: new Date(), updatedAt: new Date() };
}

// Note: Prisma queries use `where: { enabled: true }`, so mocks should only
// return rows that match that filter — the same rows a real DB would return.

describe("getAccessibleModules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ADMIN role", () => {
    it("returns the modules that are enabled in the org", async () => {
      // DB returns only enabled=true rows
      orgFindMany.mockResolvedValue([
        makeOrgModule(AppModule.APPOINTMENTS, true),
        makeOrgModule(AppModule.PATIENTS, true),
        // INVENTORY is disabled → DB doesn't return it with where:{enabled:true}
      ]);

      const result = await getAccessibleModules(ORG_ID, "ADMIN", null);

      expect(result.has(AppModule.APPOINTMENTS)).toBe(true);
      expect(result.has(AppModule.PATIENTS)).toBe(true);
      expect(result.has(AppModule.INVENTORY)).toBe(false);
      expect(result.has(AppModule.CAJA)).toBe(false);
      // Doctor perms are never consulted for ADMIN
      expect(doctorFindMany).not.toHaveBeenCalled();
    });

    it("returns empty set when no modules are enabled", async () => {
      orgFindMany.mockResolvedValue([]);

      const result = await getAccessibleModules(ORG_ID, "ADMIN", null);

      expect(result.size).toBe(0);
    });
  });

  describe("DOCTOR role", () => {
    it("returns empty set when doctorId is null", async () => {
      const result = await getAccessibleModules(ORG_ID, "DOCTOR", null);

      expect(result.size).toBe(0);
      expect(orgFindMany).not.toHaveBeenCalled();
      expect(doctorFindMany).not.toHaveBeenCalled();
    });

    it("returns intersection: only modules enabled in org AND granted to doctor", async () => {
      // DB returns only enabled=true org modules
      orgFindMany.mockResolvedValue([
        makeOrgModule(AppModule.APPOINTMENTS, true),
        makeOrgModule(AppModule.PATIENTS, true),
        // CAJA disabled in org → not returned
      ]);
      // DB returns only enabled=true doctor perms
      doctorFindMany.mockResolvedValue([
        makeDoctorPerm(AppModule.APPOINTMENTS, true),
        // PATIENTS not granted to doctor → not returned
        makeDoctorPerm(AppModule.CAJA, true), // org doesn't have it → excluded by intersection
      ]);

      const result = await getAccessibleModules(ORG_ID, "DOCTOR", DOCTOR_ID);

      expect(result.has(AppModule.APPOINTMENTS)).toBe(true);  // both org and doctor enabled
      expect(result.has(AppModule.PATIENTS)).toBe(false);     // org yes, doctor no
      expect(result.has(AppModule.CAJA)).toBe(false);         // doctor yes, org no
    });

    it("returns empty set when doctor has no enabled permissions", async () => {
      orgFindMany.mockResolvedValue([makeOrgModule(AppModule.APPOINTMENTS, true)]);
      // Doctor has no enabled perms → DB returns empty
      doctorFindMany.mockResolvedValue([]);

      const result = await getAccessibleModules(ORG_ID, "DOCTOR", DOCTOR_ID);

      expect(result.size).toBe(0);
    });

    it("doctor perm disabled=false is not returned by DB (enabled:true filter)", async () => {
      orgFindMany.mockResolvedValue([makeOrgModule(AppModule.APPOINTMENTS, true)]);
      // disabled perm is not returned (filtered at DB level with enabled:true)
      doctorFindMany.mockResolvedValue([]);

      const result = await getAccessibleModules(ORG_ID, "DOCTOR", DOCTOR_ID);

      expect(result.has(AppModule.APPOINTMENTS)).toBe(false);
    });
  });
});

describe("assertModuleAccess", () => {
  it("does not throw when module is accessible", () => {
    const accessible = new Set([AppModule.APPOINTMENTS, AppModule.PATIENTS]);

    expect(() => assertModuleAccess(accessible, AppModule.APPOINTMENTS)).not.toThrow();
  });

  it("throws ForbiddenError when module is not in the accessible set", () => {
    const accessible = new Set([AppModule.APPOINTMENTS]);

    expect(() => assertModuleAccess(accessible, AppModule.CAJA)).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError with an empty accessible set", () => {
    const accessible = new Set<AppModule>();

    expect(() => assertModuleAccess(accessible, AppModule.PATIENTS)).toThrow(ForbiddenError);
  });
});
