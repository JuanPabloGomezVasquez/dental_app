import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppModule } from "@prisma/client";

vi.mock("@/lib/repositories/superadmin.repository", () => ({
  superadminRepository: {
    listOrganizations: vi.fn(),
    findById: vi.fn(),
    slugExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setModule: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    organization: { create: vi.fn() },
    orgModule: { createMany: vi.fn(), upsert: vi.fn() },
    doctorModulePermission: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-pw") } }));

import { superadminService } from "@/lib/services/superadmin.service";
import { superadminRepository } from "@/lib/repositories/superadmin.repository";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";

const repo = vi.mocked(superadminRepository);
const mockDb = vi.mocked(db);

const ORG_ID = "org-abc";
const NOW = new Date("2026-01-01T00:00:00Z");

function makeOrg(overrides: Partial<{
  id: string; name: string; slug: string; active: boolean;
  _count: { users: number; doctors: number; patients: number };
  orgModules: { module: AppModule; enabled: boolean }[];
}> = {}) {
  return {
    id: ORG_ID,
    name: "Clínica Test",
    slug: "clinica-test",
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    _count: { users: 2, doctors: 1, patients: 10 },
    orgModules: [],
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

// ─── listOrganizations ───────────────────────────────────────────────────────

describe("superadminService.listOrganizations", () => {
  it("maps raw DB rows to summary DTOs", async () => {
    repo.listOrganizations.mockResolvedValue([
      makeOrg({ orgModules: [{ module: AppModule.APPOINTMENTS, enabled: true }] }),
    ]);

    const result = await superadminService.listOrganizations();

    expect(result).toHaveLength(1);
    const org = result[0];
    expect(org.id).toBe(ORG_ID);
    expect(org.userCount).toBe(2);
    expect(org.doctorCount).toBe(1);
    expect(org.patientCount).toBe(10);
    expect(org.enabledModules).toEqual([AppModule.APPOINTMENTS]);
  });

  it("returns empty array when no organizations exist", async () => {
    repo.listOrganizations.mockResolvedValue([]);
    const result = await superadminService.listOrganizations();
    expect(result).toHaveLength(0);
  });
});

// ─── getOrgDetail ────────────────────────────────────────────────────────────

describe("superadminService.getOrgDetail", () => {
  it("returns detail with all modules including missing ones as disabled", async () => {
    repo.findById.mockResolvedValue(
      makeOrg({ orgModules: [{ module: AppModule.APPOINTMENTS, enabled: true }] })
    );

    const result = await superadminService.getOrgDetail(ORG_ID);

    expect(result.modules).toHaveLength(Object.values(AppModule).length);
    expect(result.modules.find((m) => m.module === AppModule.APPOINTMENTS)?.enabled).toBe(true);
    expect(result.modules.find((m) => m.module === AppModule.CAJA)?.enabled).toBe(false);
    expect(result.modules.find((m) => m.module === AppModule.INVENTORY)?.enabled).toBe(false);
  });

  it("throws NotFoundError when org does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(superadminService.getOrgDetail("nonexistent")).rejects.toThrow(NotFoundError);
  });

  it("includes counts in the returned detail", async () => {
    repo.findById.mockResolvedValue(makeOrg({ _count: { users: 5, doctors: 3, patients: 42 } }));

    const result = await superadminService.getOrgDetail(ORG_ID);

    expect(result.userCount).toBe(5);
    expect(result.doctorCount).toBe(3);
    expect(result.patientCount).toBe(42);
  });
});

// ─── createOrganization ──────────────────────────────────────────────────────

describe("superadminService.createOrganization", () => {
  const validData = {
    name: "Nueva Clínica",
    slug: "nueva-clinica",
    adminName: "Dr. Admin",
    adminEmail: "admin@nueva.com",
    adminPassword: "secret123",
    modules: [AppModule.APPOINTMENTS, AppModule.PATIENTS],
  };

  it("throws ConflictError if slug is already taken", async () => {
    repo.slugExists.mockResolvedValue(true);

    await expect(superadminService.createOrganization(validData)).rejects.toThrow(ConflictError);
    expect(repo.slugExists).toHaveBeenCalledWith("nueva-clinica");
  });

  it("throws ConflictError if admin email is already registered", async () => {
    repo.slugExists.mockResolvedValue(false);
    mockDb.user.findUnique.mockResolvedValue({
      id: "existing-user",
      email: "admin@nueva.com",
    } as never);

    await expect(superadminService.createOrganization(validData)).rejects.toThrow(ConflictError);
  });

  it("runs creation in a transaction when slug and email are unique", async () => {
    repo.slugExists.mockResolvedValue(false);
    mockDb.user.findUnique.mockResolvedValue(null);
    const createdOrg = makeOrg({ name: "Nueva Clínica", slug: "nueva-clinica" });
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        organization: { create: vi.fn().mockResolvedValue(createdOrg) },
        user: { create: vi.fn().mockResolvedValue({}) },
        orgModule: { createMany: vi.fn().mockResolvedValue({ count: 5 }) },
      })
    );

    const result = await superadminService.createOrganization(validData);

    expect(mockDb.$transaction).toHaveBeenCalledOnce();
    expect(result.slug).toBe("nueva-clinica");
  });

  it("creates OrgModule rows for ALL modules, marking only selected ones enabled", async () => {
    repo.slugExists.mockResolvedValue(false);
    mockDb.user.findUnique.mockResolvedValue(null);
    const createdOrg = makeOrg();
    const createMany = vi.fn().mockResolvedValue({ count: 5 });

    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        organization: { create: vi.fn().mockResolvedValue(createdOrg) },
        user: { create: vi.fn().mockResolvedValue({}) },
        orgModule: { createMany },
      })
    );

    await superadminService.createOrganization(validData);

    const [callArg] = createMany.mock.calls[0] as [{ data: { module: AppModule; enabled: boolean }[] }][];
    const rows = callArg.data;
    expect(rows).toHaveLength(Object.values(AppModule).length);
    expect(rows.find((r) => r.module === AppModule.APPOINTMENTS)?.enabled).toBe(true);
    expect(rows.find((r) => r.module === AppModule.PATIENTS)?.enabled).toBe(true);
    expect(rows.find((r) => r.module === AppModule.CAJA)?.enabled).toBe(false);
  });
});

// ─── updateOrganization ──────────────────────────────────────────────────────

describe("superadminService.updateOrganization", () => {
  it("throws NotFoundError if org does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      superadminService.updateOrganization("bad-id", { active: false })
    ).rejects.toThrow(NotFoundError);
  });

  it("calls repository update with correct data", async () => {
    repo.findById.mockResolvedValue(makeOrg());
    repo.update.mockResolvedValue(makeOrg({ active: false }));

    await superadminService.updateOrganization(ORG_ID, { active: false });

    expect(repo.update).toHaveBeenCalledWith(ORG_ID, { active: false });
  });
});

// ─── setOrgModule ────────────────────────────────────────────────────────────

describe("superadminService.setOrgModule", () => {
  it("throws NotFoundError if org does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      superadminService.setOrgModule("bad-id", AppModule.CAJA, true)
    ).rejects.toThrow(NotFoundError);
  });

  it("upserts the OrgModule row within a transaction", async () => {
    repo.findById.mockResolvedValue(makeOrg());
    const txUpsert = vi.fn().mockResolvedValue({});
    const txUpdateMany = vi.fn().mockResolvedValue({});
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({ orgModule: { upsert: txUpsert }, doctorModulePermission: { updateMany: txUpdateMany } })
    );

    await superadminService.setOrgModule(ORG_ID, AppModule.APPOINTMENTS, true);

    expect(txUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { enabled: true }, create: expect.objectContaining({ enabled: true }) })
    );
  });

  it("cascades disable to DoctorModulePermissions when disabling a module", async () => {
    repo.findById.mockResolvedValue(makeOrg());
    const txUpsert = vi.fn().mockResolvedValue({});
    const txUpdateMany = vi.fn().mockResolvedValue({});
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({ orgModule: { upsert: txUpsert }, doctorModulePermission: { updateMany: txUpdateMany } })
    );

    await superadminService.setOrgModule(ORG_ID, AppModule.CAJA, false);

    expect(txUpdateMany).toHaveBeenCalledWith({
      where: { module: AppModule.CAJA, doctor: { organizationId: ORG_ID } },
      data: { enabled: false },
    });
  });

  it("does NOT cascade when enabling a module", async () => {
    repo.findById.mockResolvedValue(makeOrg());
    const txUpsert = vi.fn().mockResolvedValue({});
    const txUpdateMany = vi.fn().mockResolvedValue({});
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({ orgModule: { upsert: txUpsert }, doctorModulePermission: { updateMany: txUpdateMany } })
    );

    await superadminService.setOrgModule(ORG_ID, AppModule.CAJA, true);

    expect(txUpdateMany).not.toHaveBeenCalled();
  });
});
