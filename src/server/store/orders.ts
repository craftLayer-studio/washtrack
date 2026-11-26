import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  assertPayment,
  assertTransition,
  balanceDue,
  becameReady,
  buildBill,
  buildUpiUri,
  deduct,
  formatIst,
  nextStage,
  PricingError,
  rollUpStage,
  StageError,
  type LineRequest,
  type Paise,
  type PaymentMethod,
  type Stage,
} from "@/domain";
import type { Db } from "../db/client";
import { customers, orderItems, orders, orgs, payments, photos, priceItems, requests, stageEvents, subscriptions } from "../db/schema";
import { activeSubscription, recordConsent, upsertCustomer, type CustomerInput } from "./customers";
import { StoreError, notFound } from "./errors";
import { newId, newTagCode, newToken } from "./ids";
import { notifyCustomer, trackUrl } from "./messaging";
import type { Tx } from "./tx";

export async function getOrg(db: Tx, orgId: string) {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
  if (!org) throw notFound("Business");
  return org;
}

export interface CreateOrderInput {
  customer: CustomerInput;
  consent: { serviceUpdates: boolean; marketing: boolean };
  lines: LineRequest[];
  express: boolean;
  discount: Paise;
  usePlan: boolean;
  deliveryMode: "collect" | "delivery";
  note?: string;
  /** Optional due date-time (epoch ms). Defaults to now + the shop's turnaround (half for express). */
  dueAt?: number;
  channel?: "counter" | "pickup";
}

function wrapDomain<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof PricingError || err instanceof StageError) throw new StoreError(400, err.message);
    if (err instanceof Error && /balance|Amount|must be/.test(err.message)) throw new StoreError(400, err.message);
    throw err;
  }
}

/**
 * Counter intake. Prices come from the org's price list (never from the client). Creates one
 * tag per piece/pair (one per kg load), records consent, deducts plan balance and sends the
 * "received" WhatsApp (if consented) in one transaction.
 */
export async function createOrder(db: Db, orgId: string, staffId: string | null, input: CreateOrderInput, now = Date.now()) {
  return db.transaction(async (tx) => {
    const org = await getOrg(tx, orgId);
    const customer = await upsertCustomer(tx, orgId, input.customer);
    if (input.consent.serviceUpdates) await recordConsent(tx, orgId, customer.id, "service_updates", true, "counter");
    if (input.consent.marketing) await recordConsent(tx, orgId, customer.id, "marketing", true, "counter");

    const catalog = await tx.select().from(priceItems).where(and(eq(priceItems.orgId, orgId), eq(priceItems.active, true)));
    const sub = input.usePlan ? await activeSubscription(tx, orgId, customer.id) : null;
    const bill = wrapDomain(() =>
      buildBill(catalog, input.lines, {
        express: input.express,
        discount: input.discount,
        plan: sub ? { kind: sub.plan.kind, balance: sub.balance } : null,
      }),
    );
    const tagCount = bill.lines.reduce((s, l) => s + l.tags, 0);
    if (tagCount > 100) throw new StoreError(400, "At most 100 tagged items per order");

    const [{ no }] = await tx
      .update(orgs)
      .set({ nextOrderNo: sql`${orgs.nextOrderNo} + 1` })
      .where(eq(orgs.id, orgId))
      .returning({ no: sql<number>`${orgs.nextOrderNo} - 1` });
    const hours = input.express ? Math.ceil(org.turnaroundHours / 2) : org.turnaroundHours;
    const dueAt = input.dueAt && input.dueAt > now ? input.dueAt : now + hours * 3_600_000;
    const orderId = newId("ord");
    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        orgId,
        code: `${org.orderPrefix}-${no}`,
        trackToken: newToken(),
        customerId: customer.id,
        channel: input.channel ?? "counter",
        deliveryMode: input.deliveryMode,
        express: input.express,
        dueAt: new Date(dueAt),
        subtotal: bill.subtotal,
        planCovered: bill.planCovered,
        subscriptionId: sub && bill.planUnitsUsed > 0 ? sub.id : null,
        discount: bill.discount,
        total: bill.total,
        note: input.note?.trim() ?? "",
        createdBy: staffId,
        createdAt: new Date(now),
      })
      .returning();

    if (sub && bill.planUnitsUsed > 0) {
      const balance = wrapDomain(() => deduct(sub.balance, bill.planUnitsUsed));
      await tx.update(subscriptions).set({ balance }).where(and(eq(subscriptions.orgId, orgId), eq(subscriptions.id, sub.id)));
    }

    let seq = 0;
    const itemRows = [];
    for (const line of bill.lines) {
      const perTag = line.unit === "kg" ? [line.quantity] : Array.from({ length: line.quantity }, () => 1);
      for (const qty of perTag) {
        seq += 1;
        const amount = line.unit === "kg" ? line.amount : line.unitPrice;
        itemRows.push({
          id: newId("itm"),
          orgId,
          orderId,
          priceItemId: line.priceItemId,
          name: line.name,
          service: line.service,
          unit: line.unit,
          quantity: qty,
          unitPrice: line.unitPrice,
          amount,
          tagCode: newTagCode(),
          seq,
        });
      }
    }
    await tx.insert(orderItems).values(itemRows);
    await tx.insert(stageEvents).values(itemRows.map((i) => ({ id: newId("evt"), orgId, orderItemId: i.id, fromStage: null, toStage: "received", staffId })));

    const delivery = await notifyCustomer(tx, {
      orgId,
      customer,
      template: "order_received",
      orderId,
      ctx: {
        shopName: org.name,
        customerName: customer.name,
        orderCode: order.code,
        itemCount: itemRows.length,
        total: order.total,
        due: order.total,
        readyBy: formatIst(dueAt),
        trackUrl: trackUrl(order.trackToken),
        payUrl: `${trackUrl(order.trackToken)}#pay`,
      },
    });
    return { order, items: itemRows, message: delivery };
  });
}

export async function listOrders(db: Db, orgId: string, opts: { stage?: Stage; open?: boolean; limit?: number } = {}) {
  const where = [eq(orders.orgId, orgId)];
  if (opts.stage) where.push(eq(orders.stage, opts.stage));
  if (opts.open) where.push(sql`${orders.stage} <> 'delivered'`);
  const rows = await db
    .select({
      order: orders,
      customerName: customers.name,
      customerPhone: customers.phone,
      items: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(...where))
    .orderBy(opts.open ? asc(orders.dueAt) : desc(orders.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r.order, customerName: r.customerName, customerPhone: r.customerPhone, itemCount: r.items }));
}

export async function getOrderDetail(db: Tx, orgId: string, orderId: string) {
  const [row] = await db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.orgId, orgId), eq(orders.id, orderId)));
  if (!row) throw notFound("Order");
  const items = await db.select().from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.orderId, orderId))).orderBy(asc(orderItems.seq));
  const itemIds = items.map((i) => i.id);
  const photoRows = itemIds.length
    ? await db.select().from(photos).where(and(eq(photos.orgId, orgId), inArray(photos.orderItemId, itemIds))).orderBy(asc(photos.createdAt))
    : [];
  const pay = await db.select().from(payments).where(and(eq(payments.orgId, orgId), eq(payments.orderId, orderId))).orderBy(asc(payments.createdAt));
  const reqs = await db.select().from(requests).where(and(eq(requests.orgId, orgId), eq(requests.orderId, orderId))).orderBy(desc(requests.createdAt));
  const events = itemIds.length
    ? await db.select().from(stageEvents).where(and(eq(stageEvents.orgId, orgId), inArray(stageEvents.orderItemId, itemIds))).orderBy(asc(stageEvents.createdAt))
    : [];
  return {
    order: row.order,
    customer: row.customer,
    items: items.map((i) => ({ ...i, photos: photoRows.filter((p) => p.orderItemId === i.id), events: events.filter((e) => e.orderItemId === i.id) })),
    payments: pay,
    requests: reqs,
    due: balanceDue(row.order.total, row.order.paid),
  };
}

const MAX_PHOTO_CHARS = 600_000;
const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Intake (or after) photo for one tagged item, with an optional damage note. */
export async function addPhoto(db: Db, orgId: string, staffId: string, itemId: string, dataUrl: string, kind: "intake" | "after" = "intake") {
  if (dataUrl.length > MAX_PHOTO_CHARS || !DATA_URL_RE.test(dataUrl)) throw new StoreError(400, "Photo must be a JPEG/PNG/WebP image under about 400 KB");
  const [item] = await db.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.id, itemId)));
  if (!item) throw notFound("Item");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(photos).where(and(eq(photos.orgId, orgId), eq(photos.orderItemId, itemId)));
  if (n >= 6) throw new StoreError(400, "At most 6 photos per item");
  const [row] = await db.insert(photos).values({ id: newId("pho"), orgId, orderItemId: itemId, dataUrl, kind, takenBy: staffId }).returning({ id: photos.id, createdAt: photos.createdAt });
  return row;
}

export async function setDamageNote(db: Db, orgId: string, itemId: string, note: string) {
  const res = await db.update(orderItems).set({ damageNote: note.trim().slice(0, 300) }).where(and(eq(orderItems.orgId, orgId), eq(orderItems.id, itemId))).returning({ id: orderItems.id });
  if (res.length === 0) throw notFound("Item");
}

/** Customer acknowledges the recorded condition (stains, tears) at the counter. */
export async function acknowledgeDamage(db: Db, orgId: string, orderId: string, name: string) {
  const clean = name.trim();
  if (clean.length < 2) throw new StoreError(400, "Type the customer's name to acknowledge");
  const res = await db
    .update(orders)
    .set({ damageAckAt: new Date(), damageAckName: clean.slice(0, 80) })
    .where(and(eq(orders.orgId, orgId), eq(orders.id, orderId)))
    .returning({ id: orders.id });
  if (res.length === 0) throw notFound("Order");
}

async function messageCtx(tx: Tx, orgId: string, orderId: string) {
  const org = await getOrg(tx, orgId);
  const [row] = await tx.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(customers.id, orders.customerId)).where(and(eq(orders.orgId, orgId), eq(orders.id, orderId)));
  const due = balanceDue(row.order.total, row.order.paid);
  return {
    org,
    order: row.order,
    customer: row.customer,
    ctx: {
      shopName: org.name,
      customerName: row.customer.name,
      orderCode: row.order.code,
      total: row.order.total,
      due,
      trackUrl: trackUrl(row.order.trackToken),
      payUrl: `${trackUrl(row.order.trackToken)}#pay`,
    },
  };
}

/** Move items and roll the order up; sends "ready" when the whole order becomes ready, "delivered" when handed over. */
async function moveItems(tx: Tx, orgId: string, staffId: string | null, orderId: string, moves: { itemId: string; from: Stage; to: Stage }[]) {
  const all = await tx.select({ id: orderItems.id, stage: orderItems.stage }).from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.orderId, orderId)));
  const before = all.map((i) => i.stage);
  const moved = new Map(moves.map((m) => [m.itemId, m.to]));
  const after = all.map((i) => moved.get(i.id) ?? i.stage);
  for (const m of moves) {
    await tx.update(orderItems).set({ stage: m.to, updatedAt: new Date() }).where(and(eq(orderItems.orgId, orgId), eq(orderItems.id, m.itemId)));
    await tx.insert(stageEvents).values({ id: newId("evt"), orgId, orderItemId: m.itemId, fromStage: m.from, toStage: m.to, staffId });
  }
  const stage = rollUpStage(after);
  const patch: Partial<typeof orders.$inferInsert> = { stage };
  if (becameReady(before, after)) patch.readyAt = new Date();
  const delivered = rollUpStage(before) !== "delivered" && stage === "delivered";
  if (delivered) patch.deliveredAt = new Date();
  await tx.update(orders).set(patch).where(and(eq(orders.orgId, orgId), eq(orders.id, orderId)));
  let message: "sent" | "blocked" | null = null;
  if (patch.readyAt || delivered) {
    const m = await messageCtx(tx, orgId, orderId);
    message = await notifyCustomer(tx, { orgId, customer: m.customer, template: delivered ? "order_delivered" : "order_ready", ctx: m.ctx, orderId });
  }
  return { stage, becameReady: Boolean(patch.readyAt), delivered, message };
}

export async function getTag(db: Db, orgId: string, tagCode: string) {
  const [row] = await db
    .select({ item: orderItems, order: orders, customerName: customers.name })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orderItems.orgId, orgId), eq(orderItems.tagCode, tagCode)));
  if (!row) throw notFound("Tag");
  const siblings = await db.select({ id: orderItems.id, name: orderItems.name, stage: orderItems.stage, tagCode: orderItems.tagCode, seq: orderItems.seq }).from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.orderId, row.order.id))).orderBy(asc(orderItems.seq));
  return { ...row, siblings };
}

/**
 * Scan-to-update. With no `to`, moves the tagged item to its next stage.
 * `expectOrderId` guards against a tag scanned into the wrong order (mix-up alert).
 */
export async function scanTag(db: Db, orgId: string, staffId: string | null, tagCode: string, to?: Stage, expectOrderId?: string) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.tagCode, tagCode.toUpperCase())));
    if (!item) throw notFound("Tag");
    if (expectOrderId && item.orderId !== expectOrderId) throw new StoreError(409, "This tag belongs to a different order. Keep it aside and check the label.");
    const target = to ?? nextStage(item.stage);
    if (!target) throw new StoreError(400, "Item is already delivered");
    wrapDomain(() => assertTransition(item.stage, target));
    const result = await moveItems(tx, orgId, staffId, item.orderId, [{ itemId: item.id, from: item.stage, to: target }]);
    return { item: { ...item, stage: target }, ...result };
  });
}

/** Move every item of an order that is behind `to` (e.g. a whole wash-and-fold load). */
export async function advanceOrder(db: Db, orgId: string, staffId: string | null, orderId: string, to: Stage) {
  return db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orgId, orgId), eq(orderItems.orderId, orderId)));
    if (items.length === 0) throw notFound("Order");
    const moves = items.filter((i) => {
      try {
        assertTransition(i.stage, to);
        return true;
      } catch {
        return false;
      }
    });
    if (moves.length === 0) throw new StoreError(400, to === "delivered" ? "Only ready items can be handed over" : "No items can move to that stage");
    return moveItems(tx, orgId, staffId, orderId, moves.map((i) => ({ itemId: i.id, from: i.stage, to })));
  });
}

/** Collect a payment against an order (cash, card, or UPI confirmed by staff). Never more than the balance. */
export async function recordPayment(db: Db, orgId: string, staffId: string | null, orderId: string, method: PaymentMethod, amount: Paise, reference = "") {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(and(eq(orders.orgId, orgId), eq(orders.id, orderId))).for("update");
    if (!order) throw notFound("Order");
    wrapDomain(() => assertPayment(order.total, order.paid, amount));
    await tx.insert(payments).values({ id: newId("pay"), orgId, orderId, method, amount, reference: reference.slice(0, 60), staffId });
    const paid = order.paid + amount;
    await tx.update(orders).set({ paid }).where(and(eq(orders.orgId, orgId), eq(orders.id, orderId)));
    await tx.update(requests).set({ status: "resolved", resolvedAt: new Date() }).where(and(eq(requests.orgId, orgId), eq(requests.orderId, orderId), eq(requests.kind, "upi_paid"), eq(requests.status, "open")));
    const m = await messageCtx(tx, orgId, orderId);
    await notifyCustomer(tx, { orgId, customer: m.customer, template: "payment_received", ctx: { ...m.ctx, total: amount }, orderId });
    return { paid, due: balanceDue(order.total, paid) };
  });
}

export function upiLinkFor(org: { upiVpa: string; name: string }, order: { code: string; total: number; paid: number }) {
  const due = balanceDue(order.total, order.paid);
  if (due === 0) return null;
  return buildUpiUri({ vpa: org.upiVpa, payeeName: org.name, amount: due, note: `Order ${order.code}`, reference: order.code });
}

/** Send a "still waiting" reminder for orders ready for more than `hours`. */
export async function sendReadyReminders(db: Db, orgId: string, hours = 24, now = Date.now()) {
  const cutoff = new Date(now - hours * 3_600_000);
  const ready = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.orgId, orgId), eq(orders.stage, "ready"), sql`${orders.readyAt} < ${cutoff}`));
  let sent = 0;
  let blocked = 0;
  for (const o of ready) {
    const m = await messageCtx(db, orgId, o.id);
    const r = await notifyCustomer(db, { orgId, customer: m.customer, template: "ready_reminder", ctx: m.ctx, orderId: o.id });
    if (r === "sent") sent += 1;
    else blocked += 1;
  }
  return { sent, blocked };
}

export async function listOpenRequests(db: Db, orgId: string) {
  return db
    .select({ request: requests, orderCode: orders.code, customerName: customers.name })
    .from(requests)
    .innerJoin(orders, eq(orders.id, requests.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(requests.orgId, orgId), eq(requests.status, "open")))
    .orderBy(desc(requests.createdAt));
}

export async function resolveRequest(db: Db, orgId: string, requestId: string) {
  const res = await db.update(requests).set({ status: "resolved", resolvedAt: new Date() }).where(and(eq(requests.orgId, orgId), eq(requests.id, requestId))).returning({ id: requests.id });
  if (res.length === 0) throw notFound("Request");
}

export async function tagsForOrder(db: Db, orgId: string, orderId: string) {
  const detail = await getOrderDetail(db, orgId, orderId);
  const org = await getOrg(db, orgId);
  return { org, ...detail };
}
