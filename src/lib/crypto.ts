import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { serverEnv } from "@/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16;

const decodeKey = (): Buffer => {
  const raw = serverEnv.CREDENTIAL_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is not configured");
  }

  const decoded = Buffer.from(raw, "base64");

  if (decoded.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 32 bytes when base64 decoded");
  }

  return decoded;
};

const key = decodeKey();

export const encryptSecret = (value: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), encrypted.toString("base64"), authTag.toString("base64")].join(".");
};

export const decryptSecret = (payload: string): string => {
  const parts = payload.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid secret payload");
  }

  const [ivRaw, ciphertextRaw, authTagRaw] = parts;
  const iv = Buffer.from(ivRaw, "base64");
  const ciphertext = Buffer.from(ciphertextRaw, "base64");
  const authTag = Buffer.from(authTagRaw, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
};
