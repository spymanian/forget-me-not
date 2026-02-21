import { decryptForCapsule, encryptForCapsule } from "@/lib/crypto";
import type { CapsulePayload } from "@/lib/types";

type EncryptedCapsuleBlob = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

function isEncryptedCapsuleBlob(value: unknown): value is EncryptedCapsuleBlob {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EncryptedCapsuleBlob>;

  return (
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

export function packEncryptedCapsulePayload(capsuleId: string, payload: CapsulePayload) {
  const encrypted = encryptForCapsule(capsuleId, JSON.stringify(payload));
  return JSON.stringify(encrypted);
}

export function unpackDecryptedCapsulePayload(capsuleId: string, noteFieldValue: string | null) {
  if (!noteFieldValue) {
    return {
      payload: {
        note: "",
        files: [],
      } as CapsulePayload,
      encrypted: false,
    };
  }

  try {
    const parsed = JSON.parse(noteFieldValue) as unknown;

    if (!isEncryptedCapsuleBlob(parsed)) {
      return {
        payload: {
          note: noteFieldValue,
          files: [],
        } as CapsulePayload,
        encrypted: false,
      };
    }

    const plaintext = decryptForCapsule(capsuleId, parsed.ciphertext, parsed.iv, parsed.authTag);
    const payload = JSON.parse(plaintext) as CapsulePayload;

    return {
      payload,
      encrypted: true,
    };
  } catch {
    return {
      payload: {
        note: "",
        files: [],
      } as CapsulePayload,
      encrypted: false,
    };
  }
}
