import { and, asc, eq, inArray } from "drizzle-orm";
import { addDays, balanceDue, istDate, maskPhone, type ConsentPurpose, type Slot } from "@/domain";
import type { Db } from "../db/client";
import { customers, orderItems, orders, orgs, photos, requests } from "../db/schema";
import { recordConsent, upsertCustomer } from "./customers";
import { StoreError, notFound } from "./errors";
import { newId } from "./ids";
import { consentFor } from "./messaging";
import { scheduleJob } from "./jobs";
import { upiLinkFor } from "./orders";

/** What a customer sees on the tracking page. No internal ids beyond what the page needs; phone masked. */
export async function publicOrder(db: Db, token: string) {
  const [row] = await db
    .select({ order: orders, customer: customers, org: orgs })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(orgs, eq(orgs.id, orders.orgId))
    .where(eq(orders.trackToken, token));
  if (!row) throw notFound("Order");
  const { order, customer, org } = row;
  const items = await db.select().from(orderItems).where(and(eq(orderItems.orgId, org.id), eq(orderItems.orderId, order.id))).orderBy(asc(orderItems.seq));
  const pics = items.length
    ? await db.select({ id: photos.id, itemId: photos.orderItemId, dataUrl: photos.dataUrl, at: photos.createdAt }).from(photos).where(and(eq(photos.orgId, org.id), inArray(photos.orderItemId, items.map((i) => i.id))))
    : [];
  const consent = await consentFor(db, org.id, customer.id);
  const openRequests = await db.select({ kind: requests.kind }).from(requests).where(and(eq(requests.orgId, org.id), eq(requests.orderId, order.id), eq(requests.status, "open")));
  return {
    shop: { name: org.name, address: org.address, city: org.city, phone: org.phone, upiVpa: org.upiVpa, isDemo: org.isDemo },
    order: {
      code: order.code,
      stage: order.stage,
      express: order.express,
      dueAt: order.dueAt.getTime(),
      createdAt: order.createdAt.getTime(),
      subtotal: order.subtotal,
      planCovered: order.planCovered,
      discount: order.discount,
      total: order.total,
      paid: order.paid,
      due: balanceDue(order.total, order.paid),
      deliveryMode: order.deliveryMode,
      damageAckAt: order.damageAckAt?.getTime() ?? null,
      damageAckName: order.damageAckName,
    },
    customer: { firstName: customer.name.split(" ")[0], phone: maskPhone(customer.phone) },
    items: items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity, amount: i.amount, stage: i.stage, damageNote: i.damageNote, photos: pics.filter((p) => p.itemId === i.id).map((p) => ({ id: p.id, dataUrl: p.dataUrl, at: p.at.getTime() })) })),
    consent,
    openRequests: openRequests.map((r) => r.kind),
    upiLink: upiLinkFor(org, order),
  };
}

async function orderByToken(db: Db, token: string) {
  const [o] = await db.select().from(orders).where(eq(orders.trackToken, token));
  if (!o) throw notFound("Order");
  return o;
}

export async function raiseRequest(db: Db, token: string, kind: "upi_paid" | "delivery" | "issue", message: string) {
  const o = await orderByToken(db, token);
  const clean = message.trim().slice(0, 500);
  if (kind === "issue" && clean.length < 5) throw new StoreError(400, "Tell us briefly what's wrong");
  if (kind === "upi_paid" && balanceDue(o.total, o.paid) === 0) throw new StoreError(400, "This order is already paid");
  const [open] = await db.select().from(requests).where(and(eq(requests.orgId, o.orgId), eq(requests.orderId, o.id), eq(requests.kind, kind), eq(requests.status, "open")));
  if (open && kind !== "issue") return { ok: true, duplicate: true };
  await db.insert(requests).values({ id: newId("req"), orgId: o.orgId, orderId: o.id, kind, message: clean });
  return { ok: true, duplicate: false };
}

/** Customer changes their own consent from the tracking page (easy opt-out). */
export async function updateConsentByToken(db: Db, token: string, purpose: ConsentPurpose, granted: boolean) {
  const o = await orderByToken(db, token);
  await recordConsent(db, o.orgId, o.customerId, purpose, granted, "qr_page");
  return consentFor(db, o.orgId, o.customerId);
}

export async function shopByToken(db: Db, token: string) {
  const [org] = await db.select().from(orgs).where(eq(orgs.shopToken, token));
  if (!org) throw notFound("Shop");
  return org;
}

/** Self-serve pickup booking from the shop QR (flyer, counter, society notice board). */
export async function bookPickup(
  db: Db,
  shopToken: string,
  input: { phone: string; name: string; address: string; area: string; date: string; slot: Slot; note?: string; serviceUpdates: boolean; marketing: boolean },
  now = Date.now(),
) {
  const org = await shopByToken(db, shopToken);
  const today = istDate(now);
  if (input.date < today || input.date > addDays(today, 14)) throw new StoreError(400, "Pick a date in the next two weeks");
  if (input.address.trim().length < 8) throw new StoreError(400, "Enter your full address");
  if (!input.area.trim()) throw new StoreError(400, "Enter your area or locality");
  return db.transaction(async (tx) => {
    const customer = await upsertCustomer(tx, org.id, { phone: input.phone, name: input.name, address: input.address, area: input.area });
    await recordConsent(tx, org.id, customer.id, "service_updates", input.serviceUpdates, "qr_page");
    await recordConsent(tx, org.id, customer.id, "marketing", input.marketing, "qr_page");
    const job = await scheduleJob(tx, org.id, { customerId: customer.id, kind: "pickup", date: input.date, slot: input.slot, address: input.address, area: input.area, note: input.note, source: "qr_page" });
    return { jobId: job.id, date: job.date, slot: job.slot, shop: org.name };
  });
}

/** A garment tag QR opened by a customer leads to that order's tracking page. */
export async function trackTokenForTag(db: Db, tagCode: string): Promise<string | null> {
  const [row] = await db
    .select({ token: orders.trackToken })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orderItems.tagCode, tagCode));
  return row?.token ?? null;
}
