import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionSecret() {
  const secret = process.env.CAPSULE_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("CAPSULE_ENCRYPTION_SECRET is required");
  }

  if (secret.length < 32) {
    throw new Error("CAPSULE_ENCRYPTION_SECRET must be at least 32 characters");
  }

  return secret;
}

function deriveKey(capsuleId: string) {
  return scryptSync(getEncryptionSecret(), `capsule:${capsuleId}`, 32);
}

function deriveLegacyKey(capsuleId: string) {
  return createHash("sha256")
    .update(`${getEncryptionSecret()}:${capsuleId}`, "utf8")
    .digest();
}

function decodeBase64(name: string, value: string, expectedLength?: number) {
  let bytes: Buffer;

  try {
    bytes = Buffer.from(value, "base64");
  } catch {
    throw new Error(`Invalid ${name} encoding`);
  }

  if (expectedLength && bytes.length !== expectedLength) {
    throw new Error(`Invalid ${name} length`);
  }

  return bytes;
}

export function encryptForCapsule(capsuleId: string, plaintext: string) {
  const iv = randomBytes(12);
  const key = deriveKey(capsuleId);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptForCapsule(
  capsuleId: string,
  ciphertextBase64: string,
  ivBase64: string,
  authTagBase64: string,
) {
  const iv = decodeBase64("iv", ivBase64, 12);
  const authTag = decodeBase64("auth_tag", authTagBase64, 16);
  const ciphertext = decodeBase64("ciphertext", ciphertextBase64);

  const decryptWithKey = (key: Buffer) => {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  };

  try {
    return decryptWithKey(deriveKey(capsuleId));
  } catch {
    return decryptWithKey(deriveLegacyKey(capsuleId));
  }
}
