import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { getOrg } from '@/server/store/orders';
import { listPriceItems, listStaff } from '@/server/store/settings';
import { appUrl } from '@/server/store/messaging';
import { plain } from '@/server/view';
import { SettingsView } from './SettingsView';

export default async function SettingsPage() {
  const actor = await pageActor(['owner'], '/app/settings');
  const db = await getDb();
  const [org, items, team] = await Promise.all([getOrg(db, actor.orgId), listPriceItems(db, actor.orgId, true), listStaff(db, actor.orgId)]);
  return (
    <SettingsView
      org={{ name: org.name, address: org.address, city: org.city, phone: org.phone, upiVpa: org.upiVpa, turnaroundHours: org.turnaroundHours }}
      shopUrl={`${appUrl()}/s/${org.shopToken}`}
      items={plain(items)}
      team={plain(team)}
    />
  );
}
