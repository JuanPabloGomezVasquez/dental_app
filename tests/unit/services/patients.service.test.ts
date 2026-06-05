import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/patients.repository", () => ({
  patientsRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIdNumber: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createClinicalHistory: vi.fn(),
  },
}));
// Crypto: pass-through so decryption doesn't break on plain strings in test data
vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
  encryptOptional: (v: string | null | undefined) => v ?? null,
  decryptOptional: (v: string | null | undefined) => v ?? null,
}));

import { patientsService } from "@/lib/services/patients.service";
import { patientsRepository } from "@/lib/repositories/patients.repository";

const patientRepo = vi.mocked(patientsRepository);

const ORG_ID = "org-1";

const EMPTY_PAGE = { patients: [], total: 0 };

beforeEach(() => vi.clearAllMocks());

describe("patientsService.list — org-wide access", () => {
  it("returns all org patients for an admin", async () => {
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({ organizationId: ORG_ID });

    expect(patientRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID })
    );
  });

  it("returns all org patients for a doctor (no role-based filtering)", async () => {
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({ organizationId: ORG_ID });

    expect(patientRepo.findAll).toHaveBeenCalledTimes(1);
    const arg = patientRepo.findAll.mock.calls[0]![0]!;
    expect(arg.organizationId).toBe(ORG_ID);
    expect(arg).not.toHaveProperty("doctorPatientIds");
  });

  it("calculates correct pagination metadata", async () => {
    patientRepo.findAll.mockResolvedValue({ patients: [], total: 45 });

    const result = await patientsService.list({
      organizationId: ORG_ID,
      page: 2,
      pageSize: 20,
    });

    expect(result.total).toBe(45);
    expect(result.pages).toBe(3); // ceil(45/20) = 3
    expect(result.page).toBe(2);
  });
});
