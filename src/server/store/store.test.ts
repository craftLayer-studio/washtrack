import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { istDate } from "@/domain";
import { createMemoryDb, type Db } from "../db/client";
import { orders, orgs, outbox, priceItems, staff } from "../db/schema";
import { seedDemo, DEMO } from "../db/seed";
import { requestOtp, verifyOtp } from "./auth";
import { campaignResults, sendCampaign } from "./campaigns";
import { customerProfile, findCustomerByPhone } from "./customers";
import { ownerDashboard } from "./dashboard";
import { completeJob, routeList, scheduleJob } from "./jobs";
import { acknowledgeDamage, addPhoto, advanceOrder, createOrder, getOrderDetail, recordPayment, scanTag } from "./orders";
import { subscribe, listPlans } from "./plans";
import { bookPickup, publicOrder, raiseRequest, updateConsentByToken } from "./public";
import { StoreError } from "./errors";

let db: Db;
let orgId: string;
let staffId: string;

async function itemId(name: string) {
  const [row] = await db.select().from(priceItems).where(and(eq(priceItems.orgId, orgId), eq(priceItems.name, name)));
  return row.id;
}

async function newOrder(phone = "9812345678", consent = true) {
  return createOrder(db, orgId, staffId, {
    customer: { phone, name: "Test Customer", address: "Flat 1, Test Apartments", area: "Kondapur" },
    consent: { serviceUpdates: consent, marketing: false },
    lines: [
      { priceItemId: await itemId("Shirt"), quantity: 2 },
      { priceItemId: await itemId("Silk saree"), quantity: 1 },
    ],
    express: false,
    discount: 0,
    usePlan: false,
    deliveryMode: "collect",
  });
}

beforeEach(async () => {
  db = await createMemoryDb();
  ({ orgId } = await seedDemo(db));
  const [s] = await db.select().from(staff).where(eq(staff.phone, DEMO.staffPhone));
  staffId = s.id;
}, 60_000);

describe("intake", () => {
  it("prices on the server, tags every piece and sends the received message", async () => {
    const { order, items, message } = await newOrder();
    expect(order.total).toBe(4000 * 2 + 25000);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.tagCode)).size).toBe(3);
    expect(message).toBe("sent");
    const msgs = await db.select().from(outbox).where(eq(outbox.orderId, order.id));
    expect(msgs[0].template).toBe("order_received");
    expect(msgs[0].body).toContain("₹330");
  });

  it("does not message customers who have not consented", async () => {
    const { message } = await newOrder("9800000001", false);
    expect(message).toBe("blocked");
  });

  it("keeps photos and the customer's damage acknowledgement", async () => {
    const { order, items } = await newOrder();
    await addPhoto(db, orgId, staffId, items[0].id, "data:image/jpeg;base64,AAAA");
    await expect(addPhoto(db, orgId, staffId, items[0].id, "data:text/html;base64,AAAA")).rejects.toThrow(StoreError);
    await acknowledgeDamage(db, orgId, order.id, "Test Customer");
    const detail = await getOrderDetail(db, orgId, order.id);
    expect(detail.items[0].photos).toHaveLength(1);
    expect(detail.order.damageAckName).toBe("Test Customer");
  });

  it("deducts a pieces plan balance", async () => {
    const c = await findCustomerByPhone(db, orgId, "+919701234504");
    expect(c?.subscription?.balance).toBe(60 - 16 - 8);
  });
});

describe("scan to update", () => {
  it("moves items forward, rolls up and alerts when the whole order is ready", async () => {
    const { order, items } = await newOrder();
    for (const it of items) await scanTag(db, orgId, staffId, it.tagCode, "ready");
    const [o] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(o.stage).toBe("ready");
    const msgs = await db.select().from(outbox).where(and(eq(outbox.orderId, order.id), eq(outbox.template, "order_ready")));
    expect(msgs).toHaveLength(1);
  });

  it("refuses backward moves, early handover and wrong-order scans", async () => {
    const { order, items } = await newOrder();
    await scanTag(db, orgId, staffId, items[0].tagCode);
    await expect(scanTag(db, orgId, staffId, items[0].tagCode, "received")).rejects.toThrow(/forward/);
    await expect(scanTag(db, orgId, staffId, items[0].tagCode, "delivered")).rejects.toThrow(/ready/);
    const other = await newOrder("9812345679");
    await expect(scanTag(db, orgId, staffId, other.items[0].tagCode, undefined, order.id)).rejects.toThrow(/different order/);
  });

  it("isolates tenants: a tag from another org is not found", async () => {
    const { items } = await newOrder();
    await expect(scanTag(db, "org_other", staffId, items[0].tagCode)).rejects.toThrow(/not found/);
  });
});

describe("payments", () => {
  it("collects part payments and refuses overpayment", async () => {
    const { order } = await newOrder();
    await recordPayment(db, orgId, staffId, order.id, "cash", 10000);
    await expect(recordPayment(db, orgId, staffId, order.id, "upi", 30000)).rejects.toThrow(/balance/);
    const r = await recordPayment(db, orgId, staffId, order.id, "upi", 23000);
    expect(r.due).toBe(0);
  });
});

describe("public tracking page", () => {
  it("shows the order with a UPI link and lets the customer opt out", async () => {
    const { order } = await newOrder();
    const view = await publicOrder(db, order.trackToken);
    expect(view.order.due).toBe(33000);
    expect(view.upiLink).toContain("am=330.00");
    expect(view.customer.phone).not.toContain("12345");
    const consent = await updateConsentByToken(db, order.trackToken, "service_updates", false);
    expect(consent.service_updates).toBe(false);
    await raiseRequest(db, order.trackToken, "upi_paid", "");
    const again = await raiseRequest(db, order.trackToken, "upi_paid", "");
    expect(again.duplicate).toBe(true);
  });

  it("books a pickup from the shop QR with consent", async () => {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
    const today = istDate(Date.now());
    const r = await bookPickup(db, org.shopToken, { phone: "98111 22233", name: "Neha Singh", address: "Flat 9, Lake View Apts", area: "Madhapur", date: today, slot: "evening", serviceUpdates: true, marketing: false });
    expect(r.slot).toBe("evening");
    const c = await findCustomerByPhone(db, orgId, "9811122233");
    expect(c?.consent).toEqual({ service_updates: true, marketing: false });
    expect(c?.consentLog).toHaveLength(1);
    await expect(bookPickup(db, org.shopToken, { phone: "98111 22233", name: "N", address: "Flat 9, Lake View Apts", area: "M", date: "2020-01-01", slot: "evening", serviceUpdates: false, marketing: false })).rejects.toThrow(/date/);
  });
});

describe("routes, plans, campaigns, dashboard", () => {
  it("lists today's route in slot order and delivers on completion", async () => {
    const route = await routeList(db, orgId, istDate(Date.now()));
    expect(route.map((j) => j.slot)).toEqual(["morning", "afternoon", "afternoon", "evening"]);
    const delivery = route.find((j) => j.kind === "delivery")!;
    await completeJob(db, orgId, staffId, delivery.id);
    const [o] = await db.select().from(orders).where(eq(orders.id, delivery.orderId!));
    expect(o.stage).toBe("delivered");
  });

  it("refuses to deliver an order that is not ready", async () => {
    const { order } = await newOrder();
    const job = await scheduleJob(db, orgId, { customerId: order.customerId, kind: "delivery", date: istDate(Date.now()), slot: "evening", orderId: order.id });
    await expect(completeJob(db, orgId, staffId, job.id)).rejects.toThrow(/not ready/);
    await advanceOrder(db, orgId, staffId, order.id, "ready");
    await completeJob(db, orgId, staffId, job.id);
  });

  it("sells a plan once", async () => {
    const { order } = await newOrder();
    const [plan] = await listPlans(db, orgId);
    await subscribe(db, orgId, staffId, order.customerId, plan.id, "upi");
    await expect(subscribe(db, orgId, staffId, order.customerId, plan.id, "upi")).rejects.toThrow(/already/);
    const p = await customerProfile(db, orgId, order.customerId);
    expect(p.subscription?.planId).toBe(plan.id);
  });

  it("sends offers only to marketing opt-ins and tracks conversions", async () => {
    const r = await sendCampaign(db, orgId, { template: "winback_offer", offer: "15% off this week", audience: "all" });
    expect(r.sent).toBe(6);
    expect(r.skipped).toBe(6);
    await newOrder("+919701234501");
    const [res] = await campaignResults(db, orgId);
    expect(res.converted).toBe(1);
  });

  it("builds the owner dashboard", async () => {
    const d = await ownerDashboard(db, orgId);
    expect(d.stats.byStage.ready).toBe(2);
    expect(d.stats.repeatCustomers).toBeGreaterThanOrEqual(4);
    expect(d.stats.revenueMonth).toBeGreaterThan(0);
    expect(d.overdueOrders.length).toBeGreaterThanOrEqual(1);
  });
});

describe("staff sign-in", () => {
  it("verifies a phone OTP once", async () => {
    const { demoCode } = await requestOtp(db, "98480 11001");
    expect(demoCode).toMatch(/^\d{6}$/);
    await expect(verifyOtp(db, "9848011001", demoCode === "000000" ? "111111" : "000000")).rejects.toThrow();
    const member = await verifyOtp(db, "9848011001", demoCode!);
    expect(member.role).toBe("owner");
    await expect(verifyOtp(db, "9848011001", demoCode!)).rejects.toThrow();
  });

  it("does not reveal whether a number is registered", async () => {
    const r = await requestOtp(db, "9000000000");
    expect(r.demoCode).toBeNull();
  });
});
