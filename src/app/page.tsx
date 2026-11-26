import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { orders, orgs } from '@/server/db/schema';
import { Landing } from './Landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await getDb();
  const [demo] = await db.select().from(orgs).where(eq(orgs.isDemo, true)).limit(1);
  let trackToken: string | null = null;
  if (demo) {
    const [o] = await db.select({ t: orders.trackToken }).from(orders).where(and(eq(orders.orgId, demo.id), eq(orders.stage, 'ready'))).orderBy(desc(orders.createdAt)).limit(1);
    trackToken = o?.t ?? null;
  }
  return <Landing shopToken={demo?.shopToken ?? null} trackToken={trackToken} />;
}
