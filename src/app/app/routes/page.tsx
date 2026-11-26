import { asc, eq } from 'drizzle-orm';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { customers } from '@/server/db/schema';
import { routeList } from '@/server/store/jobs';
import { isIsoDate, istDate } from '@/domain';
import { serverNow } from '@/server/clock';
import { RouteView } from './RouteView';

export default async function RoutesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const actor = await pageActor(['owner', 'staff', 'rider'], '/app/routes');
  const { date: d } = await searchParams;
  const today = istDate(serverNow());
  const date = d && isIsoDate(d) ? d : today;
  const db = await getDb();
  const jobs = await routeList(db, actor.orgId, date);
  const people =
    actor.role === 'rider'
      ? []
      : await db.select({ id: customers.id, name: customers.name, phone: customers.phone, area: customers.area, address: customers.address }).from(customers).where(eq(customers.orgId, actor.orgId)).orderBy(asc(customers.name));
  return <RouteView jobs={jobs} date={date} today={today} customers={people} canSchedule={actor.role !== 'rider'} />;
}
