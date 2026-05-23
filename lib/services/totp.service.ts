import { generate, verify, generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { encrypt, decrypt } from "@/lib/crypto";

const APP_NAME = "DentApp";

export const totpService = {
  generateSecret(): string {
    return generateSecret();
  },

  getOtpauthUrl(email: string, secret: string): string {
    return generateURI({ secret, issuer: APP_NAME, label: `${APP_NAME}:${email}` });
  },

  async getQrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  },

  async verifyToken(token: string, secret: string): Promise<boolean> {
    try {
      // Check current step + adjacent steps to tolerate up to ±30s clock drift
      const nowSecs = Math.floor(Date.now() / 1000);
      for (const delta of [0, -30, 30]) {
        const result = await verify({ token, secret, epoch: nowSecs + delta });
        const valid = typeof result === "object" ? result.valid : Boolean(result);
        if (valid) return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  encryptSecret(secret: string): string {
    return encrypt(secret);
  },

  decryptSecret(encrypted: string): string {
    return decrypt(encrypted);
  },
};
