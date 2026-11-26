import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { listPriceItems } from '@/server/store/settings';
import { IntakeForm } from './IntakeForm';

export default async function IntakePage() {
  const actor = await pageActor(['owner', 'staff'], '/app/intake');
  const items = await listPriceItems(await getDb(), actor.orgId);
  return <IntakeForm priceList={items.map((i) => ({ id: i.id, name: i.name, category: i.category, service: i.service, unit: i.unit, price: i.price, expressPrice: i.expressPrice }))} />;
}
