import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { ownerDashboard } from '@/server/store/dashboard';
import { campaignResults } from '@/server/store/campaigns';
import { plain } from '@/server/view';
import { DashboardView } from './DashboardView';

export default async function DashboardPage() {
  const actor = await pageActor(['owner'], '/app/dashboard');
  const db = await getDb();
  const [d, campaigns] = await Promise.all([ownerDashboard(db, actor.orgId), campaignResults(db, actor.orgId)]);
  return <DashboardView data={plain(d)} campaigns={plain(campaigns).slice(0, 5)} />;
}
