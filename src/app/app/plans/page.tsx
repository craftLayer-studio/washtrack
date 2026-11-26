import { and, eq, sql } from 'drizzle-orm';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { customers, plans, subscriptions } from '@/server/db/schema';
import { listPlans } from '@/server/store/plans';
import { plain } from '@/server/view';
import { PlansView } from './PlansView';

export default async function PlansPage() {
  const actor = await pageActor(['owner', 'staff'], '/app/plans');
  const db = await getDb();
  const list = await listPlans(db, actor.orgId);
  const subs = await db
    .select({ id: subscriptions.id, customerId: customers.id, customerName: customers.name, plan: plans.name, kind: plans.kind, quota: plans.quota, balance: subscriptions.balance, renewsAt: subscriptions.renewsAt })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .where(and(eq(subscriptions.orgId, actor.orgId), sql`${subscriptions.renewsAt} > now()`));
  return <PlansView plans={list} subs={plain(subs)} isOwner={actor.role === 'owner'} />;
}
