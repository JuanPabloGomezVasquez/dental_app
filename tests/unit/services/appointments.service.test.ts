import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppointmentWithRelations } from "@/lib/validations/appointment.schema";

vi.mock("@/lib/repositories/appointments.repository", () => ({
  appointmentsRepository: {
    findByDateRange: vi.fn(),
    findById: vi.fn(),
    findByDoctorAndDate: vi.fn(),
    findPatientIdsByDoctor: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/doctors.repository", () => ({
  doctorsRepository: { findById: vi.fn(), hasFutureAppointments: vi.fn(), findAll: vi.fn(), findByUserId: vi.fn(), setUserId: vi.fn(), create: vi.fn(), update: vi.fn(), setActive: vi.fn() },
}));
vi.mock("@/lib/repositories/patients.repository", () => ({
  patientsRepository: { findById: vi.fn(), findAll: vi.fn(), findByIdNumber: vi.fn(), create: vi.fn(), update: vi.fn(), createClinicalHistory: vi.fn() },
}));
vi.mock("@/lib/repositories/procedures.repository", () => ({
  proceduresRepository: { findById: vi.fn(), findAll: vi.fn(), findByName: vi.fn(), create: vi.fn(), update: vi.fn(), setActive: vi.fn(), findActive: vi.fn() },
}));
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

import { appointmentsService } from "@/lib/services/appointments.service";
import { appointmentsRepository } from "@/lib/repositories/appointments.repository";

const apptRepo = vi.mocked(appointmentsRepository);

const ORG_ID = "org-1";
const DOCTOR_ID = "doc-1";
const OTHER_DOCTOR_ID = "doc-2";
const START = new Date("2026-05-01T00:00:00Z");
const END = new Date("2026-05-07T23:59:59Z");
const EMPTY: AppointmentWithRelations[] = [];

beforeEach(() => vi.clearAllMocks());

describe("appointmentsService.listByDateRange — doctor scoping", () => {
  it("DOCTOR: always uses own doctorId, ignores filterDoctorId param", async () => {
    apptRepo.findByDateRange.mockResolvedValue(EMPTY);

    await appointmentsService.listByDateRange(
      START,
      END,
      ORG_ID,
      "DOCTOR",
      DOCTOR_ID,
      OTHER_DOCTOR_ID // should be ignored
    );

    expect(apptRepo.findByDateRange).toHaveBeenCalledWith(
      START,
      END,
      ORG_ID,
      DOCTOR_ID // own doctorId, not OTHER_DOCTOR_ID
    );
  });

  it("DOCTOR with null doctorId: passes undefined (no filter)", async () => {
    apptRepo.findByDateRange.mockResolvedValue(EMPTY);

    await appointmentsService.listByDateRange(START, END, ORG_ID, "DOCTOR", null);

    expect(apptRepo.findByDateRange).toHaveBeenCalledWith(START, END, ORG_ID, undefined);
  });

  it("ADMIN without filter: passes undefined to repository", async () => {
    apptRepo.findByDateRange.mockResolvedValue(EMPTY);

    await appointmentsService.listByDateRange(START, END, ORG_ID, "ADMIN", null);

    expect(apptRepo.findByDateRange).toHaveBeenCalledWith(START, END, ORG_ID, undefined);
  });

  it("ADMIN with filterDoctorId: passes that doctorId to repository", async () => {
    apptRepo.findByDateRange.mockResolvedValue(EMPTY);

    await appointmentsService.listByDateRange(
      START,
      END,
      ORG_ID,
      "ADMIN",
      null,
      OTHER_DOCTOR_ID
    );

    expect(apptRepo.findByDateRange).toHaveBeenCalledWith(START, END, ORG_ID, OTHER_DOCTOR_ID);
  });

  it("passes organizationId to repository", async () => {
    apptRepo.findByDateRange.mockResolvedValue(EMPTY);

    await appointmentsService.listByDateRange(START, END, ORG_ID, "ADMIN", null);

    const [, , calledOrgId] = apptRepo.findByDateRange.mock.calls[0]!;
    expect(calledOrgId).toBe(ORG_ID);
  });
});
