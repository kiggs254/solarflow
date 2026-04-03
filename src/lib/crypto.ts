import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.SOLAR_ENCRYPTION_KEY;
  if (!hex || hex.trim().length !== 64) {
    throw new Error(
      "SOLAR_ENCRYPTION_KEY is not set or invalid. Set a 64-character hex string (32 bytes) in your environment to store NREL API keys securely."
    );
  }
  return Buffer.from(hex.trim(), "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string in the format "iv:authTag:ciphertext".
 */
export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/**
 * Decrypts a value produced by encryptApiKey.
 * Throws if the key is missing, the format is wrong, or the ciphertext has been tampered with.
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted key format");
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
