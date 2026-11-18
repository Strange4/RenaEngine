// AI contribution: No substantial AI-generated code
import { createHash } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, storedHash: string): boolean {
  return hashToken(token) === storedHash;
}
