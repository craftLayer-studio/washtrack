import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { lapsedCustomers } from "@/domain";
import type { Db } from "../db/client";
import { campaigns, customers, orders } from "../db/schema";
import { StoreError } from "./errors";
import { newId } from "./ids";
import { notifyCustomer } from "./messaging";
import { getOrg } from "./orders";

export const AUDIENCES = ["lapsed_30", "all"] as const;
export type Audience = (typeof AUDIENCES)[number];

/**
 * Owner follow-up: a win-back or plan offer to customers who opted in to marketing.
 * Customers without marketing consent are skipped (logged as blocked, never sent).
 */
export async function sendCampaign(db: Db, orgId: string, input: { template: "winback_offer" | "plan_offer"; offer: string; audience: Audience }, now = Date.now()) {
  const offer = input.offer.trim();
  if (offer.length < 5 || offer.length > 200) throw new StoreError(400, "Offer text must be 5 to 200 characters");
  const org = await getOrg(db, orgId);
  const all = await db.select().from(customers).where(eq(customers.orgId, orgId));
  let targetIds = all.map((c) => c.id);
  if (input.audience === "lapsed_30") {
    const os = await db.select({ id: orders.id, customerId: orders.customerId, createdAt: orders.createdAt }).from(orders).where(eq(orders.orgId, orgId));
    targetIds = lapsedCustomers(
      os.map((o) => ({ id: o.id, customerId: o.customerId, createdAt: o.createdAt.getTime(), stage: "delivered", dueAt: 0, total: 0, paid: 0 })),
      now,
      30,
    );
  }
  const campaignId = newId("cmp");
  await db.insert(campaigns).values({ id: campaignId, orgId, template: input.template, offer, audience: input.audience });
  let sent = 0;
  let skipped = 0;
  for (const c of all.filter((x) => targetIds.includes(x.id))) {
    const r = await notifyCustomer(db, { orgId, customer: c, template: input.template, campaignId, ctx: { shopName: org.name, customerName: c.name, offer } });
    if (r === "sent") sent += 1;
    else skipped += 1;
  }
  await db.update(campaigns).set({ sent, skipped }).where(eq(campaigns.id, campaignId));
  return { id: campaignId, sent, skipped };
}

/** Campaign results: how many recipients placed an order after the send, and the value of those orders. */
export async function campaignResults(db: Db, orgId: string) {
  const list = await db.select().from(campaigns).where(eq(campaigns.orgId, orgId)).orderBy(desc(campaigns.createdAt)).limit(20);
  const results = [];
  for (const c of list) {
    const recipients = await db.execute<{ customer_id: string }>(
      sql`select distinct customer_id from outbox where org_id = ${orgId} and campaign_id = ${c.id} and status = 'simulated_sent'`,
    );
    const ids = recipients.rows.map((r) => r.customer_id);
    let converted = 0;
    let revenue = 0;
    if (ids.length) {
      const os = await db
        .select({ customerId: orders.customerId, total: orders.total })
        .from(orders)
        .where(and(eq(orders.orgId, orgId), inArray(orders.customerId, ids), gt(orders.createdAt, c.createdAt)));
      converted = new Set(os.map((o) => o.customerId)).size;
      revenue = os.reduce((s, o) => s + o.total, 0);
    }
    results.push({ ...c, converted, revenue });
  }
  return results;
}
