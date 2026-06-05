import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/caja.repository", () => ({
  cajaRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateBalance: vi.fn(),
    updateInvoice: vi.fn(),
    addPayment: vi.fn(),
    getPaymentsByRecord: vi.fn(),
    sumPaymentsInRange: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/patients.repository", () => ({
  patientsRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/services/patients.service", () => ({
  patientsService: { get: vi.fn() },
}));
vi.mock("@/lib/integrations/siigo/client", () => ({
  createInvoice: vi.fn(),
}));

import { cajaService } from "@/lib/services/caja.service";
import { cajaRepository } from "@/lib/repositories/caja.repository";

const repo = vi.mocked(cajaRepository);

const ORG_ID = "org-1";
const TODAY_START = new Date("2026-06-02T05:00:00.000Z"); // midnight Bogotá
const TODAY_END = new Date("2026-06-03T04:59:59.999Z");

beforeEach(() => vi.clearAllMocks());

describe("cajaService.getTodayIncome", () => {
  it("returns the summed amount from the repository", async () => {
    repo.sumPaymentsInRange.mockResolvedValue(150_000);

    const result = await cajaService.getTodayIncome(ORG_ID, TODAY_START, TODAY_END);

    expect(result).toBe(150_000);
    expect(repo.sumPaymentsInRange).toHaveBeenCalledWith(ORG_ID, TODAY_START, TODAY_END);
  });

  it("returns 0 when no payments exist for the period", async () => {
    repo.sumPaymentsInRange.mockResolvedValue(0);

    const result = await cajaService.getTodayIncome(ORG_ID, TODAY_START, TODAY_END);

    expect(result).toBe(0);
  });

  it("passes the exact date range to the repository without modification", async () => {
    repo.sumPaymentsInRange.mockResolvedValue(0);

    await cajaService.getTodayIncome(ORG_ID, TODAY_START, TODAY_END);

    const [calledOrg, calledStart, calledEnd] = repo.sumPaymentsInRange.mock.calls[0]!;
    expect(calledOrg).toBe(ORG_ID);
    expect(calledStart).toBe(TODAY_START);
    expect(calledEnd).toBe(TODAY_END);
  });
});
