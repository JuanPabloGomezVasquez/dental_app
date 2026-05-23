import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock otplib ──────────────────────────────────────────────────────────────
vi.mock("otplib", () => ({
  generateSecret: vi.fn(() => "JBSWY3DPEHPK3PXP"),
  generate: vi.fn(async ({ secret: _s }: { secret: string; epoch?: number }) => "123456"),
  verify: vi.fn(async ({ token }: { token: string; secret: string; epoch?: number }) =>
    token === "123456" ? { valid: true, delta: 0 } : { valid: false }
  ),
  generateURI: vi.fn(
    ({ secret, issuer, label }: { secret: string; issuer: string; label: string }) =>
      `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`
  ),
}));

// ── Mock qrcode ──────────────────────────────────────────────────────────────
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,abc") },
}));

// ── Mock crypto (lib/crypto.ts) ──────────────────────────────────────────────
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((plain: string) => `enc:${plain}`),
  decrypt: vi.fn((cipher: string) => cipher.replace(/^enc:/, "")),
}));

import { totpService } from "@/lib/services/totp.service";
import { verify } from "otplib";

const mockVerify = vi.mocked(verify);

describe("totpService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── generateSecret ──────────────────────────────────────────────────────────
  describe("generateSecret", () => {
    it("returns a non-empty string", () => {
      expect(totpService.generateSecret()).toBeTruthy();
    });
  });

  // ── getOtpauthUrl ───────────────────────────────────────────────────────────
  describe("getOtpauthUrl", () => {
    it("returns an otpauth URI containing the secret and issuer", () => {
      const url = totpService.getOtpauthUrl("user@example.com", "MYSECRET");
      expect(url).toContain("otpauth://totp/");
      expect(url).toContain("MYSECRET");
      expect(url).toContain("DentApp");
    });

    it("includes the email in the label", () => {
      const url = totpService.getOtpauthUrl("doc@clinic.com", "SECRET");
      expect(url).toContain("doc@clinic.com");
    });
  });

  // ── getQrDataUrl ────────────────────────────────────────────────────────────
  describe("getQrDataUrl", () => {
    it("returns a data URL string", async () => {
      const result = await totpService.getQrDataUrl("otpauth://totp/DentApp:u?secret=X");
      expect(result).toMatch(/^data:image\//);
    });
  });

  // ── verifyToken ─────────────────────────────────────────────────────────────
  describe("verifyToken", () => {
    it("returns true when the correct token is provided", async () => {
      const result = await totpService.verifyToken("123456", "MYSECRET");
      expect(result).toBe(true);
    });

    it("returns false for an incorrect token", async () => {
      const result = await totpService.verifyToken("000000", "MYSECRET");
      expect(result).toBe(false);
    });

    it("checks three adjacent time steps (current, −30s, +30s) to tolerate clock drift", async () => {
      await totpService.verifyToken("000000", "MYSECRET");
      // Should call verify 3 times (stopping early on first valid — but since all fail, all 3 run)
      expect(mockVerify).toHaveBeenCalledTimes(3);
    });

    it("stops checking once a valid match is found (short-circuit)", async () => {
      // Override: first call (delta=0) succeeds
      mockVerify.mockResolvedValueOnce({ valid: true, delta: 0 });
      await totpService.verifyToken("123456", "MYSECRET");
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it("passes epoch in seconds (not milliseconds) to each verify call", async () => {
      const before = Math.floor(Date.now() / 1000);
      await totpService.verifyToken("000000", "MYSECRET");
      const after = Math.floor(Date.now() / 1000);

      const calls = mockVerify.mock.calls;
      expect(calls).toHaveLength(3);
      const epochs = calls.map((c) => (c[0] as { epoch?: number }).epoch ?? 0);
      // Deltas are [0, -30, +30] relative to current second-epoch
      const base = epochs[0]!;
      expect(base).toBeGreaterThanOrEqual(before - 1);
      expect(base).toBeLessThanOrEqual(after + 1);
      expect(epochs[1]).toBe(base - 30);
      expect(epochs[2]).toBe(base + 30);
    });

    it("returns false and does not throw when verify rejects", async () => {
      mockVerify.mockRejectedValue(new Error("crypto error"));
      await expect(totpService.verifyToken("123456", "MYSECRET")).resolves.toBe(false);
    });
  });

  // ── encryptSecret / decryptSecret ───────────────────────────────────────────
  describe("encryptSecret / decryptSecret round-trip", () => {
    it("decryptSecret recovers the original plain secret", () => {
      const plain = "JBSWY3DPEHPK3PXP";
      const encrypted = totpService.encryptSecret(plain);
      const decrypted = totpService.decryptSecret(encrypted);
      expect(decrypted).toBe(plain);
    });

    it("encrypted value differs from plain secret", () => {
      const plain = "JBSWY3DPEHPK3PXP";
      expect(totpService.encryptSecret(plain)).not.toBe(plain);
    });
  });
});
