import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { NOTICE_VERSION, normalizeIndianPhone, type ConsentChannel, type ConsentPurpose } from "@/domain";
import type { Db } from "../db/client";
import { consentRecords, customers, orders, plans, subscriptions } from "../db/schema";
import { StoreError, notFound } from "./errors";
import { newId } from "./ids";
import { consentFor } from "./messaging";
import type { Tx } from "./tx";

export interface CustomerInput {
  phone: string;
  name: string;
  address?: string;
  area?: string;
  preferences?: string;
}

export function parsePhone(input: string): string {
  const phone = normalizeIndianPhone(input);
  if (!phone) throw new StoreError(400, "Enter a valid 10-digit Indian mobile number");
  return phone;
}

/** Find by phone within the org, or create. Updates name/address when given. */
export async function upsertCustomer(tx: Tx, orgId: string, input: CustomerInput) {
  const phone = parsePhone(input.phone);
  const name = input.name.trim();
  if (!name) throw new StoreError(400, "Customer name is required");
  const [existing] = await tx.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.phone, phone)));
  if (existing) {
    const patch = {
      name,
      address: input.address?.trim() || existing.address,
      area: input.area?.trim() || existing.area,
      preferences: input.preferences?.trim() ?? existing.preferences,
    };
    await tx.update(customers).set(patch).where(and(eq(customers.orgId, orgId), eq(customers.id, existing.id)));
    return { ...existing, ...patch };
  }
  const [row] = await tx
    .insert(customers)
    .values({ id: newId("cus"), orgId, phone, name, address: input.address?.trim() ?? "", area: input.area?.trim() ?? "", preferences: input.preferences?.trim() ?? "" })
    .returning();
  return row;
}

/** Record a consent decision (one row per purpose, append-only). Only writes when it changes. */
export async function recordConsent(tx: Tx, orgId: string, customerId: string, purpose: ConsentPurpose, granted: boolean, channel: ConsentChannel) {
  const current = await consentFor(tx, orgId, customerId);
  const [{ n }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), eq(consentRecords.customerId, customerId), eq(consentRecords.purpose, purpose)));
  if (n > 0 && current[purpose] === granted) return;
  if (n === 0 && !granted) return;
  await tx.insert(consentRecords).values({ id: newId("con"), orgId, customerId, purpose, granted, noticeVersion: NOTICE_VERSION, channel });
}

export async function findCustomerByPhone(db: Db, orgId: string, phoneInput: string) {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) return null;
  const [c] = await db.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.phone, phone)));
  if (!c) return null;
  return customerProfile(db, orgId, c.id);
}

export async function customerProfile(db: Db, orgId: string, customerId: string) {
  const [c] = await db.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)));
  if (!c) throw notFound("Customer");
  const consent = await consentFor(db, orgId, c.id);
  const history = await db
    .select({ id: orders.id, code: orders.code, stage: orders.stage, total: orders.total, paid: orders.paid, createdAt: orders.createdAt })
    .from(orders)
    .where(and(eq(orders.orgId, orgId), eq(orders.customerId, c.id)))
    .orderBy(desc(orders.createdAt))
    .limit(20);
  const consentLog = await db
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), eq(consentRecords.customerId, c.id)))
    .orderBy(desc(consentRecords.createdAt));
  const subscription = await activeSubscription(db, orgId, c.id);
  const dues = history.reduce((s, o) => s + Math.max(0, o.total - o.paid), 0);
  return { customer: c, consent, consentLog, history, dues, subscription };
}

export async function activeSubscription(db: Tx, orgId: string, customerId: string) {
  const [row] = await db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.orgId, orgId), eq(subscriptions.customerId, customerId), sql`${subscriptions.renewsAt} > now()`))
    .orderBy(desc(subscriptions.renewsAt))
    .limit(1);
  return row ? { ...row.sub, plan: row.plan } : null;
}

export async function listCustomers(db: Db, orgId: string) {
  const rows = await db.select().from(customers).where(eq(customers.orgId, orgId)).orderBy(asc(customers.name));
  const stats = await db
    .select({
      customerId: orders.customerId,
      count: sql<number>`count(*)::int`,
      dues: sql<number>`coalesce(sum(greatest(${orders.total} - ${orders.paid}, 0)), 0)::int`,
      last: sql<Date>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(eq(orders.orgId, orgId))
    .groupBy(orders.customerId);
  const byId = new Map(stats.map((s) => [s.customerId, s]));
  const ids = rows.map((r) => r.id);
  const consentRows = ids.length
    ? await db.select().from(consentRecords).where(and(eq(consentRecords.orgId, orgId), inArray(consentRecords.customerId, ids)))
    : [];
  const subs = ids.length
    ? await db
        .select({ customerId: subscriptions.customerId, plan: plans.name, balance: subscriptions.balance, kind: plans.kind })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(and(eq(subscriptions.orgId, orgId), sql`${subscriptions.renewsAt} > now()`))
    : [];
  return rows.map((c) => {
    const mine = consentRows.filter((r) => r.customerId === c.id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const consent = { service_updates: false, marketing: false };
    for (const r of mine) consent[r.purpose] = r.granted;
    const s = byId.get(c.id);
    const sub = subs.find((x) => x.customerId === c.id) ?? null;
    return { ...c, orders: s?.count ?? 0, dues: s?.dues ?? 0, lastOrderAt: s?.last ? new Date(s.last) : null, consent, subscription: sub };
  });
}

export async function setConsentByStaff(db: Db, orgId: string, customerId: string, purpose: ConsentPurpose, granted: boolean) {
  const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)));
  if (!c) throw notFound("Customer");
  await recordConsent(db, orgId, customerId, purpose, granted, "staff_app");
  return consentFor(db, orgId, customerId);
}

export async function updateCustomer(db: Db, orgId: string, customerId: string, input: { name: string; address: string; area: string; preferences: string }) {
  if (!input.name.trim()) throw new StoreError(400, "Name is required");
  const res = await db
    .update(customers)
    .set({ name: input.name.trim().slice(0, 80), address: input.address.trim().slice(0, 300), area: input.area.trim().slice(0, 80), preferences: input.preferences.trim().slice(0, 200) })
    .where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)))
    .returning({ id: customers.id });
  if (res.length === 0) throw notFound("Customer");
}
