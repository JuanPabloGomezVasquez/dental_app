import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY debe ser de 64 caracteres hex (32 bytes). " +
        "Genera una con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  _key = Buffer.from(keyHex, "hex");
  return _key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedHex = parts[2];
  if (!ivHex || !authTagHex || !encryptedHex || parts.length !== 3) {
    // Valor sin cifrar (dato legacy anterior al cifrado) — devolver tal cual
    return ciphertext;
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedData = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString("utf8");
}

export function encryptOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

export function decryptOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  return decrypt(value);
}
