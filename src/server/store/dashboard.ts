import { and, desc, eq, gte, sql } from "drizzle-orm";
import { buildDashboard, isOverdue, startOfIstDay, istDate } from "@/domain";
import type { Db } from "../db/client";
import { customers, orders, outbox, payments } from "../db/schema";

export async function ownerDashboard(db: Db, orgId: string, now = Date.now()) {
  const os = await db.select().from(orders).where(eq(orders.orgId, orgId));
  const dayStart = startOfIstDay(now);
  const monthStart = Date.parse(`${istDate(now).slice(0, 7)}-01T00:00:00+05:30`);
  const ps = await db.select({ amount: payments.amount, at: payments.createdAt }).from(payments).where(and(eq(payments.orgId, orgId), gte(payments.createdAt, new Date(Math.min(monthStart, dayStart)))));
  const stats = buildDashboard(
    os.map((o) => ({ id: o.id, customerId: o.customerId, stage: o.stage, dueAt: o.dueAt.getTime(), createdAt: o.createdAt.getTime(), total: o.total, paid: o.paid })),
    ps.map((p) => ({ amount: p.amount, at: p.at.getTime() })),
    now,
    dayStart,
    monthStart,
  );
  const overdueOrders = await db
    .select({ id: orders.id, code: orders.code, stage: orders.stage, dueAt: orders.dueAt, customerName: customers.name, express: orders.express })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.orgId, orgId), sql`${orders.stage} in ('received','washing','ironing')`, sql`${orders.dueAt} < ${new Date(now)}`))
    .orderBy(orders.dueAt)
    .limit(20);
  const topCustomers = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone, orders: sql<number>`count(${orders.id})::int`, spend: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(customers)
    .innerJoin(orders, eq(orders.customerId, customers.id))
    .where(eq(customers.orgId, orgId))
    .groupBy(customers.id)
    .having(sql`count(${orders.id}) >= 2`)
    .orderBy(desc(sql`count(${orders.id})`))
    .limit(8);
  const [msgs] = await db
    .select({ sent: sql<number>`count(*) filter (where ${outbox.status} = 'simulated_sent')::int`, blocked: sql<number>`count(*) filter (where ${outbox.status} = 'blocked_no_consent')::int` })
    .from(outbox)
    .where(and(eq(outbox.orgId, orgId), sql`${outbox.purpose} <> 'auth'`));
  return { stats, overdueOrders: overdueOrders.filter((o) => isOverdue(o.stage, o.dueAt.getTime(), now)), topCustomers, messages: msgs };
}
