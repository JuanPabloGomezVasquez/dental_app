import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock audit repository ────────────────────────────────────────────────────
// vi.hoisted ensures the variable is available when vi.mock factory runs
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@/lib/repositories/audit.repository", () => ({
  auditRepository: { create: mockCreate },
}));

import { writeAuditLog, requestMeta } from "@/lib/audit";

describe("writeAuditLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls auditRepository.create with the provided params", async () => {
    mockCreate.mockResolvedValue(undefined);

    writeAuditLog({
      userId: "user-1",
      userEmail: "admin@clinic.com",
      action: "LOGIN",
      organizationId: "org-1",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    // Fire-and-forget — flush microtask queue
    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        userEmail: "admin@clinic.com",
        action: "LOGIN",
        organizationId: "org-1",
      })
    );
  });

  it("never throws even when the repository rejects", async () => {
    mockCreate.mockRejectedValue(new Error("DB unavailable"));

    // Must not throw or return a rejected promise
    expect(() =>
      writeAuditLog({
        userId: "user-2",
        userEmail: "doc@clinic.com",
        action: "LOGIN_FAILED",
      })
    ).not.toThrow();

    // Confirm the rejection was swallowed gracefully
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("coerces null organizationId to undefined", async () => {
    mockCreate.mockResolvedValue(undefined);

    writeAuditLog({
      userId: "user-3",
      userEmail: "super@dentapp.com",
      action: "LOGOUT",
      organizationId: null,
    });

    await new Promise((r) => setTimeout(r, 0));

    const call = mockCreate.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.organizationId).toBeUndefined();
  });
});

// ── requestMeta ──────────────────────────────────────────────────────────────
describe("requestMeta", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/api/test", { headers });
  }

  it("extracts IP from x-forwarded-for (first address)", () => {
    const meta = requestMeta(makeRequest({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }));
    expect(meta.ipAddress).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const meta = requestMeta(makeRequest({ "x-real-ip": "192.168.1.5" }));
    expect(meta.ipAddress).toBe("192.168.1.5");
  });

  it("extracts user-agent header", () => {
    const meta = requestMeta(makeRequest({ "user-agent": "Playwright/1.0" }));
    expect(meta.userAgent).toBe("Playwright/1.0");
  });

  it("returns undefined fields when headers are absent", () => {
    const meta = requestMeta(makeRequest({}));
    expect(meta.ipAddress).toBeUndefined();
    expect(meta.userAgent).toBeUndefined();
  });
});
