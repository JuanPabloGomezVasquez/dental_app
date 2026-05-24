import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock db ──────────────────────────────────────────────────────────────────
const { mockFindMany, mockCount, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
    },
  },
}));

import { auditRepository } from "@/lib/repositories/audit.repository";

// ── create ────────────────────────────────────────────────────────────────────
describe("auditRepository.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to db.auditLog.create with provided data", async () => {
    mockCreate.mockResolvedValue({ id: "log-1" });
    const data = {
      userId: "u1",
      userEmail: "a@b.com",
      action: "LOGIN" as const,
    };
    await auditRepository.create(data);
    expect(mockCreate).toHaveBeenCalledWith({ data });
  });
});

// ── findMany ──────────────────────────────────────────────────────────────────
describe("auditRepository.findMany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("returns empty results when no logs exist", async () => {
    const { logs, total } = await auditRepository.findMany({ page: 1, pageSize: 25 });
    expect(logs).toEqual([]);
    expect(total).toBe(0);
  });

  it("calls findMany and count in parallel with empty where on no filters", async () => {
    await auditRepository.findMany({ page: 1, pageSize: 25 });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 25,
    });
    expect(mockCount).toHaveBeenCalledWith({ where: {} });
  });

  it("applies action filter to where clause", async () => {
    await auditRepository.findMany({ page: 1, pageSize: 25, action: "LOGIN_FAILED" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { action: "LOGIN_FAILED" } })
    );
    expect(mockCount).toHaveBeenCalledWith({ where: { action: "LOGIN_FAILED" } });
  });

  it("applies organizationId filter to where clause", async () => {
    await auditRepository.findMany({ page: 1, pageSize: 25, organizationId: "org-abc" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-abc" } })
    );
  });

  it("applies from date as gte constraint", async () => {
    const from = new Date("2024-01-01T00:00:00");
    await auditRepository.findMany({ page: 1, pageSize: 25, from });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { gte: from } } })
    );
  });

  it("applies to date as lte constraint", async () => {
    const to = new Date("2024-01-31T23:59:59");
    await auditRepository.findMany({ page: 1, pageSize: 25, to });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { lte: to } } })
    );
  });

  it("applies both from and to when both are provided", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-31");
    await auditRepository.findMany({ page: 1, pageSize: 25, from, to });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { gte: from, lte: to } } })
    );
  });

  it("combines action and organizationId filters", async () => {
    await auditRepository.findMany({
      page: 1,
      pageSize: 25,
      action: "PATIENT_VIEWED",
      organizationId: "org-xyz",
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: "PATIENT_VIEWED", organizationId: "org-xyz" },
      })
    );
  });

  it("calculates skip=0 for page 1", async () => {
    await auditRepository.findMany({ page: 1, pageSize: 25 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 25 })
    );
  });

  it("calculates correct skip for page 2", async () => {
    await auditRepository.findMany({ page: 2, pageSize: 25 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 })
    );
  });

  it("calculates correct skip for page 3 with pageSize 10", async () => {
    await auditRepository.findMany({ page: 3, pageSize: 10 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("returns logs and total from parallel queries", async () => {
    const fakeLog = {
      id: "log-1",
      userId: "u1",
      userEmail: "admin@clinic.com",
      action: "LOGIN",
      resource: null,
      resourceId: null,
      organizationId: "org-1",
      ipAddress: "10.0.0.1",
      userAgent: null,
      createdAt: new Date(),
    };
    mockFindMany.mockResolvedValue([fakeLog]);
    mockCount.mockResolvedValue(42);

    const { logs, total } = await auditRepository.findMany({ page: 1, pageSize: 25 });

    expect(logs).toEqual([fakeLog]);
    expect(total).toBe(42);
  });

  it("always orders results by createdAt descending", async () => {
    await auditRepository.findMany({ page: 1, pageSize: 25 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    );
  });
});
