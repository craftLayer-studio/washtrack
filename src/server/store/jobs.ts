import { and, asc, eq } from "drizzle-orm";
import { isIsoDate, SLOT_LABEL, sortRoute, type JobKind, type Slot } from "@/domain";
import type { Db } from "../db/client";
import { customers, jobs, orders } from "../db/schema";
import { advanceOrder, getOrg } from "./orders";
import { StoreError, notFound } from "./errors";
import { newId } from "./ids";
import { notifyCustomer, trackUrl } from "./messaging";
import type { Tx } from "./tx";

export interface JobInput {
  customerId: string;
  kind: JobKind;
  date: string;
  slot: Slot;
  orderId?: string | null;
  address?: string;
  area?: string;
  note?: string;
  source?: "staff" | "qr_page";
}

/** Schedule a pickup or delivery and confirm it to the customer on WhatsApp (if consented). */
export async function scheduleJob(tx: Tx, orgId: string, input: JobInput) {
  if (!isIsoDate(input.date)) throw new StoreError(400, "Pick a valid date");
  const [c] = await tx.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, input.customerId)));
  if (!c) throw notFound("Customer");
  let orderCode: string | undefined;
  if (input.orderId) {
    const [o] = await tx.select().from(orders).where(and(eq(orders.orgId, orgId), eq(orders.id, input.orderId)));
    if (!o) throw notFound("Order");
    orderCode = o.code;
    if (input.kind === "delivery") await tx.update(orders).set({ deliveryMode: "delivery" }).where(and(eq(orders.orgId, orgId), eq(orders.id, o.id)));
  }
  const address = (input.address?.trim() || c.address).slice(0, 300);
  const area = (input.area?.trim() || c.area || "Unassigned").slice(0, 80);
  if (!address) throw new StoreError(400, "Address is required for a pickup or delivery");
  const [job] = await tx
    .insert(jobs)
    .values({ id: newId("job"), orgId, customerId: c.id, orderId: input.orderId ?? null, kind: input.kind, date: input.date, slot: input.slot, address, area, note: input.note?.trim().slice(0, 200) ?? "", source: input.source ?? "staff" })
    .returning();
  const org = await getOrg(tx, orgId);
  await notifyCustomer(tx, {
    orgId,
    customer: c,
    template: "pickup_scheduled",
    orderId: input.orderId ?? undefined,
    ctx: { shopName: org.name, customerName: c.name, orderCode, slot: `${input.kind} on ${input.date}, ${SLOT_LABEL[input.slot]}` },
  });
  return job;
}

/** The rider's day: scheduled and done jobs for a date, in route order. */
export async function routeList(db: Db, orgId: string, date: string) {
  if (!isIsoDate(date)) throw new StoreError(400, "Invalid date");
  const rows = await db
    .select({ job: jobs, customerName: customers.name, customerPhone: customers.phone, orderCode: orders.code, orderTotal: orders.total, orderPaid: orders.paid, orderStage: orders.stage })
    .from(jobs)
    .innerJoin(customers, eq(customers.id, jobs.customerId))
    .leftJoin(orders, eq(orders.id, jobs.orderId))
    .where(and(eq(jobs.orgId, orgId), eq(jobs.date, date)))
    .orderBy(asc(jobs.createdAt));
  const flat = rows
    .filter((r) => r.job.status !== "cancelled")
    .map((r) => ({
      ...r.job,
      createdAt: r.job.createdAt.getTime(),
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      orderCode: r.orderCode,
      orderStage: r.orderStage,
      collect: r.orderTotal !== null && r.orderPaid !== null ? Math.max(0, r.orderTotal - r.orderPaid) : 0,
    }));
  return sortRoute(flat).map((j, i) => ({ ...j, seq: i + 1 }));
}

/** Rider leaves with a delivery: send "out for delivery". */
export async function startDelivery(db: Db, orgId: string, jobId: string) {
  const [row] = await db.select({ job: jobs, customer: customers }).from(jobs).innerJoin(customers, eq(customers.id, jobs.customerId)).where(and(eq(jobs.orgId, orgId), eq(jobs.id, jobId)));
  if (!row) throw notFound("Job");
  if (row.job.kind !== "delivery" || !row.job.orderId) throw new StoreError(400, "Only deliveries linked to an order can start");
  const [o] = await db.select().from(orders).where(and(eq(orders.orgId, orgId), eq(orders.id, row.job.orderId)));
  const org = await getOrg(db, orgId);
  return notifyCustomer(db, {
    orgId,
    customer: row.customer,
    template: "out_for_delivery",
    orderId: o.id,
    ctx: { shopName: org.name, customerName: row.customer.name, orderCode: o.code, due: Math.max(0, o.total - o.paid), slot: SLOT_LABEL[row.job.slot], trackUrl: trackUrl(o.trackToken), payUrl: `${trackUrl(o.trackToken)}#pay` },
  });
}

/** Mark a job done. A completed delivery hands over every ready item of the linked order. */
export async function completeJob(db: Db, orgId: string, staffId: string | null, jobId: string) {
  const [job] = await db.select().from(jobs).where(and(eq(jobs.orgId, orgId), eq(jobs.id, jobId)));
  if (!job) throw notFound("Job");
  if (job.status !== "scheduled") throw new StoreError(400, "Job is already closed");
  if (job.kind === "delivery" && job.orderId) {
    const [o] = await db.select().from(orders).where(and(eq(orders.orgId, orgId), eq(orders.id, job.orderId)));
    if (o.stage !== "ready") throw new StoreError(400, "Order is not ready yet, so it cannot be delivered");
    await advanceOrder(db, orgId, staffId, o.id, "delivered");
  }
  await db.update(jobs).set({ status: "done" }).where(and(eq(jobs.orgId, orgId), eq(jobs.id, jobId)));
}

export async function cancelJob(db: Db, orgId: string, jobId: string) {
  const res = await db.update(jobs).set({ status: "cancelled" }).where(and(eq(jobs.orgId, orgId), eq(jobs.id, jobId), eq(jobs.status, "scheduled"))).returning({ id: jobs.id });
  if (res.length === 0) throw notFound("Open job");
}
