import { and, asc, eq } from "drizzle-orm";
import { renewsAt, type Paise, type PaymentMethod, type PlanKind } from "@/domain";
import type { Db } from "../db/client";
import { customers, payments, plans, subscriptions } from "../db/schema";
import { activeSubscription } from "./customers";
import { StoreError, notFound } from "./errors";
import { newId } from "./ids";

export async function listPlans(db: Db, orgId: string) {
  return db.select().from(plans).where(eq(plans.orgId, orgId)).orderBy(asc(plans.price));
}

export async function createPlan(db: Db, orgId: string, input: { name: string; kind: PlanKind; quota: number; price: Paise; periodDays: number }) {
  if (!input.name.trim()) throw new StoreError(400, "Plan name is required");
  if (!Number.isInteger(input.quota) || input.quota <= 0) throw new StoreError(400, "Quota must be a whole number above 0");
  if (!Number.isInteger(input.price) || input.price <= 0) throw new StoreError(400, "Price must be above ₹0");
  if (!Number.isInteger(input.periodDays) || input.periodDays < 7 || input.periodDays > 92) throw new StoreError(400, "Period must be 7 to 92 days");
  const [row] = await db.insert(plans).values({ id: newId("pln"), orgId, name: input.name.trim().slice(0, 60), kind: input.kind, quota: input.quota, price: input.price, periodDays: input.periodDays }).returning();
  return row;
}

export async function setPlanActive(db: Db, orgId: string, planId: string, active: boolean) {
  const res = await db.update(plans).set({ active }).where(and(eq(plans.orgId, orgId), eq(plans.id, planId))).returning({ id: plans.id });
  if (res.length === 0) throw notFound("Plan");
}

/** Sell a monthly plan: payment is collected up front and the full quota is loaded. */
export async function subscribe(db: Db, orgId: string, staffId: string | null, customerId: string, planId: string, method: PaymentMethod, now = Date.now()) {
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(plans).where(and(eq(plans.orgId, orgId), eq(plans.id, planId), eq(plans.active, true)));
    if (!plan) throw notFound("Plan");
    const [c] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, customerId)));
    if (!c) throw notFound("Customer");
    if (await activeSubscription(tx, orgId, customerId)) throw new StoreError(409, "Customer already has an active plan");
    const [sub] = await tx
      .insert(subscriptions)
      .values({ id: newId("sub"), orgId, customerId, planId, balance: plan.quota, startsAt: new Date(now), renewsAt: new Date(renewsAt(now, plan.periodDays)), paymentMethod: method })
      .returning();
    await tx.insert(payments).values({ id: newId("pay"), orgId, subscriptionId: sub.id, method, amount: plan.price, reference: `Plan ${plan.name}`, staffId });
    return sub;
  });
}
