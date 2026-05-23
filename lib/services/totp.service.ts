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
      const result = await verify({ token, secret });
      return typeof result === "object" ? result.valid : Boolean(result);
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
