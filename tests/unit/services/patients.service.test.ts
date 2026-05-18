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
vi.mock("@/lib/repositories/appointments.repository", () => ({
  appointmentsRepository: {
    findPatientIdsByDoctor: vi.fn(),
    findByDateRange: vi.fn(),
    findById: vi.fn(),
    findByDoctorAndDate: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
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
import { appointmentsRepository } from "@/lib/repositories/appointments.repository";

const patientRepo = vi.mocked(patientsRepository);
const apptRepo = vi.mocked(appointmentsRepository);

const ORG_ID = "org-1";
const DOCTOR_ID = "doc-1";

const EMPTY_PAGE = { patients: [], total: 0 };

beforeEach(() => vi.clearAllMocks());

describe("patientsService.list — doctor scoping", () => {
  it("DOCTOR: fetches own patientIds from appointments before listing", async () => {
    apptRepo.findPatientIdsByDoctor.mockResolvedValue(["p1", "p2"]);
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({
      organizationId: ORG_ID,
      callerRole: "DOCTOR",
      callerDoctorId: DOCTOR_ID,
    });

    expect(apptRepo.findPatientIdsByDoctor).toHaveBeenCalledWith(DOCTOR_ID, ORG_ID);
    expect(patientRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ doctorPatientIds: ["p1", "p2"] })
    );
  });

  it("DOCTOR with no appointments: passes empty doctorPatientIds (returns no patients)", async () => {
    apptRepo.findPatientIdsByDoctor.mockResolvedValue([]);
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({
      organizationId: ORG_ID,
      callerRole: "DOCTOR",
      callerDoctorId: DOCTOR_ID,
    });

    expect(patientRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ doctorPatientIds: [] })
    );
  });

  it("ADMIN: does NOT fetch patientIds from appointments", async () => {
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({
      organizationId: ORG_ID,
      callerRole: "ADMIN",
      callerDoctorId: null,
    });

    expect(apptRepo.findPatientIdsByDoctor).not.toHaveBeenCalled();
    expect(patientRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ doctorPatientIds: undefined })
    );
  });

  it("passes organizationId to both repository calls", async () => {
    apptRepo.findPatientIdsByDoctor.mockResolvedValue([]);
    patientRepo.findAll.mockResolvedValue(EMPTY_PAGE);

    await patientsService.list({
      organizationId: ORG_ID,
      callerRole: "DOCTOR",
      callerDoctorId: DOCTOR_ID,
    });

    expect(apptRepo.findPatientIdsByDoctor).toHaveBeenCalledWith(DOCTOR_ID, ORG_ID);
    const findAllArg = patientRepo.findAll.mock.calls[0]![0];
    expect(findAllArg.organizationId).toBe(ORG_ID);
  });

  it("calculates correct pagination metadata", async () => {
    patientRepo.findAll.mockResolvedValue({ patients: [], total: 45 });

    const result = await patientsService.list({
      organizationId: ORG_ID,
      callerRole: "ADMIN",
      callerDoctorId: null,
      page: 2,
      pageSize: 20,
    });

    expect(result.total).toBe(45);
    expect(result.pages).toBe(3); // ceil(45/20) = 3
    expect(result.page).toBe(2);
  });
});
