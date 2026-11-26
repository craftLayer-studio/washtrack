import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { normalizeIndianPhone } from "@/domain";
import type { Db } from "../db/client";
import { orgs, otpChallenges, outbox, staff } from "../db/schema";
import { StoreError } from "./errors";
import { newId, newOtp } from "./ids";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

/**
 * Start phone + OTP sign-in. The OTP goes through the simulated SMS outbox; in this demo build it
 * is also returned so the sign-in screen can show it (clearly labelled demo).
 */
export async function requestOtp(db: Db, phoneInput: string) {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) throw new StoreError(400, "Enter a valid 10-digit Indian mobile number");
  const [member] = await db.select().from(staff).where(and(eq(staff.phone, phone), eq(staff.active, true))).limit(1);
  // Same response whether or not the number is registered, so the endpoint can't be used to list staff.
  const code = newOtp();
  if (member) {
    await db.insert(otpChallenges).values({ id: newId("otp"), phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) });
    await db.insert(outbox).values({
      id: newId("msg"),
      orgId: member.orgId,
      customerId: null,
      channel: "sms",
      toAddress: phone,
      template: "staff_otp",
      purpose: "auth",
      body: `${code} is your WashTrack sign-in code. It expires in 5 minutes.`,
      status: "simulated_sent",
    });
  }
  return { phone, demoCode: member ? code : null };
}

export async function verifyOtp(db: Db, phoneInput: string, code: string) {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone || !/^\d{6}$/.test(code)) throw new StoreError(400, "Enter the 6-digit code");
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, phone), isNull(otpChallenges.usedAt), gt(otpChallenges.expiresAt, new Date())))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (!challenge || challenge.attempts >= MAX_ATTEMPTS) throw new StoreError(401, "Code expired. Request a new one.");
  const ok = timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(hash(phone, code)));
  if (!ok) {
    await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id));
    throw new StoreError(401, "Wrong code");
  }
  await db.update(otpChallenges).set({ usedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
  const [member] = await db.select().from(staff).where(and(eq(staff.phone, phone), eq(staff.active, true))).limit(1);
  if (!member) throw new StoreError(401, "No staff account for this number");
  return member;
}

export async function getStaff(db: Db, staffId: string) {
  const [row] = await db
    .select({ staff, orgName: orgs.name, isDemo: orgs.isDemo })
    .from(staff)
    .innerJoin(orgs, eq(orgs.id, staff.orgId))
    .where(and(eq(staff.id, staffId), eq(staff.active, true)));
  return row ? { ...row.staff, orgName: row.orgName, isDemo: row.isDemo } : null;
}
