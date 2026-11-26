import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "wt_session";
export const SESSION_TTL_S = 7 * 24 * 3600;

export type Role = "owner" | "staff" | "rider";
export interface SessionData {
  staffId: string;
  orgId: string;
  role: Role;
  exp: number;
}

let warned = false;
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !process.env.WASHTRACK_DEMO) {
    throw new Error("SESSION_SECRET (32+ chars) must be set in production");
  }
  if (!warned) {
    warned = true;
    console.warn("[washtrack] SESSION_SECRET is not set; using an insecure development fallback.");
  }
  return "washtrack-dev-only-insecure-session-secret-change-me";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(data: Omit<SessionData, "exp">, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(now / 1000) + SESSION_TTL_S })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): SessionData | null {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
    if (typeof data.staffId !== "string" || typeof data.orgId !== "string" || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}
