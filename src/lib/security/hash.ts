import "server-only";
import { createHash, createHmac } from "node:crypto";

function salt(): string {
  // A dedicated salt keeps plate/IP hashes unlinkable across deployments.
  return process.env.HASH_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "rak-privati-dev-salt";
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Salted HMAC for identifiers we must index but never expose (plates, IPs, user ids in analytics). */
export function hmacId(value: string): string {
  return createHmac("sha256", salt()).update(value).digest("hex");
}

export function hashPlate(plateDigits: string): string {
  return hmacId("plate:" + plateDigits);
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hmacId("ip:" + ip);
}

export function hashUserForAnalytics(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return hmacId("user:" + userId).slice(0, 32);
}
