import { eq, sql } from "drizzle-orm";
import { addDays, istDate, rupees, type Service, type Unit } from "@/domain";
import type { Db } from "./client";
import { orgs, plans, priceItems, staff } from "./schema";
import { newId, newToken } from "../store/ids";
import { recordConsent, upsertCustomer } from "../store/customers";
import { acknowledgeDamage, advanceOrder, createOrder, recordPayment, scanTag, setDamageNote } from "../store/orders";
import { scheduleJob } from "../store/jobs";
import { subscribe } from "../store/plans";

/** Fictional demo business. Names, numbers and addresses are invented. */
export const DEMO = {
  orgName: "Fresh Fold Laundry & Dry Cleaners (Demo)",
  ownerPhone: "+919848011001",
  staffPhone: "+919848011002",
  riderPhone: "+919848011003",
};

const PRICE_LIST: [string, string, Service, Unit, number, number | null][] = [
  ["Shirt", "Daily wear", "wash_iron", "piece", 40, null],
  ["Trouser", "Daily wear", "wash_iron", "piece", 45, null],
  ["T-shirt", "Daily wear", "wash_iron", "piece", 35, null],
  ["Kurta", "Ethnic", "wash_iron", "piece", 60, null],
  ["Shirt (steam press)", "Press only", "press", "piece", 15, 25],
  ["Trouser (steam press)", "Press only", "press", "piece", 15, 25],
  ["Saree (steam press)", "Press only", "press", "piece", 60, 90],
  ["Wash & fold", "By weight", "wash_fold", "kg", 90, 140],
  ["Wash & iron", "By weight", "wash_iron", "kg", 130, 190],
  ["Suit 2-piece", "Dry clean", "dry_clean", "piece", 450, 650],
  ["Suit 3-piece", "Dry clean", "dry_clean", "piece", 600, 850],
  ["Blazer", "Dry clean", "dry_clean", "piece", 300, 450],
  ["Silk saree", "Dry clean", "dry_clean", "piece", 250, 380],
  ["Silk saree (heavy / bridal)", "Dry clean", "dry_clean", "piece", 550, 800],
  ["Lehenga", "Dry clean", "dry_clean", "piece", 900, 1300],
  ["Sherwani", "Dry clean", "dry_clean", "piece", 800, 1150],
  ["Salwar suit 3-piece", "Dry clean", "dry_clean", "piece", 220, 330],
  ["Jacket / sweater", "Dry clean", "dry_clean", "piece", 250, 380],
  ["Blanket (single)", "Household", "dry_clean", "piece", 300, null],
  ["Blanket (double)", "Household", "dry_clean", "piece", 450, null],
  ["Curtain (per panel)", "Household", "dry_clean", "piece", 180, null],
  ["Sneakers deep clean", "Shoe care", "shoe_care", "pair", 499, 699],
  ["Leather shoes polish & clean", "Shoe care", "shoe_care", "pair", 399, null],
  ["Handbag clean & condition", "Bag care", "bag_care", "piece", 799, null],
];

const CUSTOMERS = [
  { name: "Ananya Rao", phone: "+919701234501", area: "Kondapur", address: "Flat 402, Sri Sai Residency, Botanical Garden Rd, Kondapur" },
  { name: "Mohammed Faizan", phone: "+919701234502", area: "Madhapur", address: "Plot 18, Ayyappa Society, Madhapur" },
  { name: "Priya Venkatesh", phone: "+919701234503", area: "Gachibowli", address: "B-1104, Aparna Towers, Gachibowli" },
  { name: "Rahul Sharma", phone: "+919701234504", area: "Kondapur", address: "12-3-45, Raghavendra Colony, Kondapur" },
  { name: "Sneha Reddy", phone: "+919701234505", area: "Miyapur", address: "Villa 7, Green Meadows, Miyapur" },
  { name: "Arjun Nair", phone: "+919701234506", area: "Gachibowli", address: "C-302, My Home Avatar, Gachibowli" },
  { name: "Fatima Begum", phone: "+919701234507", area: "Tolichowki", address: "H.No 9-4-12, Salarjung Colony, Tolichowki" },
  { name: "Vikram Joshi", phone: "+919701234508", area: "Madhapur", address: "301, Cyber Heights, Image Gardens Rd, Madhapur" },
  { name: "Kavya Iyer", phone: "+919701234509", area: "Kukatpally", address: "Flat 210, Lodha Meridian, Kukatpally" },
  { name: "Suresh Babu", phone: "+919701234510", area: "Kondapur", address: "2-48, Kothaguda X Roads, Kondapur" },
  { name: "Meera Kulkarni", phone: "+919701234511", area: "Miyapur", address: "A-506, Prajay Megapolis, Miyapur" },
  { name: "Deepak Gupta", phone: "+919701234512", area: "Kukatpally", address: "Plot 66, KPHB Phase 3, Kukatpally" },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export async function seedIfEmpty(db: Db): Promise<boolean> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orgs);
  if (n > 0) return false;
  await seedDemo(db);
  console.log("[washtrack] Seeded demo business.");
  return true;
}

export async function seedDemo(db: Db, now = Date.now()) {
  const orgId = newId("org");
  await db.insert(orgs).values({
    id: orgId,
    name: DEMO.orgName,
    city: "Hyderabad",
    address: "Shop 4, Kothaguda Main Rd, Kondapur, Hyderabad 500084",
    phone: "+919848011000",
    upiVpa: "freshfold.demo@okaxis",
    shopToken: newToken(),
    orderPrefix: "FF",
    turnaroundHours: 48,
    isDemo: true,
  });
  const [owner, counter] = await db
    .insert(staff)
    .values([
      { id: newId("stf"), orgId, phone: DEMO.ownerPhone, name: "Imran Qureshi", role: "owner" as const },
      { id: newId("stf"), orgId, phone: DEMO.staffPhone, name: "Lakshmi Devi", role: "staff" as const },
      { id: newId("stf"), orgId, phone: DEMO.riderPhone, name: "Ravi Kumar", role: "rider" as const },
    ])
    .returning();
  await db.insert(priceItems).values(
    PRICE_LIST.map(([name, category, service, unit, price, express], i) => ({
      id: newId("pri"),
      orgId,
      name,
      category,
      service,
      unit,
      price: rupees(price),
      expressPrice: express === null ? null : rupees(express),
      sort: i,
    })),
  );
  const [pressPlan, kgPlan] = await db
    .insert(plans)
    .values([
      { id: newId("pln"), orgId, name: "Press 60", kind: "pieces" as const, quota: 60, price: rupees(799), periodDays: 30 },
      { id: newId("pln"), orgId, name: "Wash & Fold 30 kg", kind: "kg" as const, quota: 30_000, price: rupees(2299), periodDays: 30 },
      { id: newId("pln"), orgId, name: "Family Press 120", kind: "pieces" as const, quota: 120, price: rupees(1499), periodDays: 30 },
    ])
    .returning();

  const items = await db.select().from(priceItems).where(eq(priceItems.orgId, orgId));
  const pid = (name: string) => items.find((i) => i.name === name)!.id;

  const cust: Awaited<ReturnType<typeof upsertCustomer>>[] = [];
  for (const [i, c] of CUSTOMERS.entries()) {
    const row = await upsertCustomer(db, orgId, c);
    // Most customers opted in to updates at the counter; about half to offers.
    if (i !== 6) await recordConsent(db, orgId, row.id, "service_updates", true, "counter");
    if (i % 2 === 0) await recordConsent(db, orgId, row.id, "marketing", true, "counter");
    cust.push(row);
  }

  await subscribe(db, orgId, owner.id, cust[3].id, pressPlan.id, "upi", now - 12 * DAY);
  await subscribe(db, orgId, owner.id, cust[5].id, kgPlan.id, "cash", now - 5 * DAY);

  const order = async (
    ci: number,
    lines: [string, number][],
    daysAgo: number,
    opts: { express?: boolean; usePlan?: boolean; stage?: "washing" | "ironing" | "ready" | "delivered"; pay?: "full" | "part"; method?: "upi" | "cash"; dueInHours?: number } = {},
  ) => {
    const created = now - daysAgo * DAY;
    const c = cust[ci];
    const res = await createOrder(
      db,
      orgId,
      counter.id,
      {
        customer: c,
        consent: { serviceUpdates: false, marketing: false },
        lines: lines.map(([name, quantity]) => ({ priceItemId: pid(name), quantity })),
        express: opts.express ?? false,
        discount: 0,
        usePlan: opts.usePlan ?? false,
        deliveryMode: "collect",
        dueAt: opts.dueInHours !== undefined ? created + opts.dueInHours * HOUR : undefined,
      },
      created,
    );
    if (opts.stage) await advanceOrder(db, orgId, counter.id, res.order.id, opts.stage === "delivered" ? "ready" : opts.stage);
    if (opts.stage === "delivered") await advanceOrder(db, orgId, counter.id, res.order.id, "delivered");
    if (opts.pay && res.order.total > 0) {
      const amount = opts.pay === "full" ? res.order.total : Math.round(res.order.total / 2);
      await recordPayment(db, orgId, counter.id, res.order.id, opts.method ?? "upi", amount);
    }
    return res;
  };

  // History (delivered) so repeat customers and revenue show up.
  await order(0, [["Shirt", 4], ["Trouser", 2]], 45, { stage: "delivered", pay: "full" });
  await order(1, [["Suit 2-piece", 1]], 40, { stage: "delivered", pay: "full", method: "cash" });
  await order(4, [["Silk saree", 2]], 38, { stage: "delivered", pay: "full" });
  await order(6, [["Blanket (double)", 2]], 36, { stage: "delivered", pay: "full", method: "cash" });
  await order(10, [["Kurta", 3]], 34, { stage: "delivered", pay: "full" });
  await order(0, [["Wash & fold", 4500]], 20, { stage: "delivered", pay: "full" });
  await order(2, [["Lehenga", 1], ["Silk saree (heavy / bridal)", 1]], 15, { stage: "delivered", pay: "full" });
  await order(3, [["Shirt (steam press)", 10], ["Trouser (steam press)", 6]], 10, { usePlan: true, stage: "delivered" });
  await order(7, [["Sneakers deep clean", 2]], 8, { stage: "delivered", pay: "full" });
  await order(1, [["Shirt", 5], ["Trouser", 3]], 6, { stage: "delivered", pay: "full", method: "cash" });

  // Live work in progress.
  const overdue = await order(2, [["Blazer", 1], ["Shirt", 3]], 3, { stage: "washing", dueInHours: 48 });
  await setDamageNote(db, orgId, overdue.items[0].id, "Small ink mark on left pocket, noted at intake");
  await acknowledgeDamage(db, orgId, overdue.order.id, "Priya Venkatesh");
  await order(8, [["Salwar suit 3-piece", 2], ["Saree (steam press)", 2]], 2.2, { stage: "ironing", dueInHours: 36, pay: "part", method: "cash" });
  await order(5, [["Wash & fold", 6000]], 1, { usePlan: true, stage: "washing" });
  const ready = await order(0, [["Suit 3-piece", 1], ["Shirt", 2]], 2, { stage: "ready", dueInHours: 40 });
  const ready2 = await order(11, [["Jacket / sweater", 2], ["Trouser", 2]], 3, { stage: "ready", pay: "part" });
  await order(9, [["Curtain (per panel)", 4]], 1.5, { stage: "ironing" });
  await order(4, [["Leather shoes polish & clean", 1], ["Handbag clean & condition", 1]], 1, {});
  const fresh = await order(3, [["Shirt (steam press)", 8]], 0.1, { usePlan: true });
  await order(7, [["Sherwani", 1]], 0.2, { express: true, pay: "full" });

  // Move one item of the newest order along by scan, to show item-level progress.
  await scanTag(db, orgId, counter.id, fresh.items[0].tagCode);

  // Today's route: pickups and deliveries.
  const today = istDate(now);
  await scheduleJob(db, orgId, { customerId: cust[9].id, kind: "pickup", date: today, slot: "morning" });
  await scheduleJob(db, orgId, { customerId: cust[2].id, kind: "pickup", date: today, slot: "evening", note: "Gate code 4521" });
  await scheduleJob(db, orgId, { customerId: cust[0].id, kind: "delivery", date: today, slot: "afternoon", orderId: ready.order.id });
  await scheduleJob(db, orgId, { customerId: cust[11].id, kind: "delivery", date: today, slot: "afternoon", orderId: ready2.order.id });
  await scheduleJob(db, orgId, { customerId: cust[10].id, kind: "pickup", date: addDays(today, 1), slot: "morning" });

  return { orgId };
}
