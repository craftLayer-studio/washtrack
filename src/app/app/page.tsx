import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { listOpenRequests, listOrders } from '@/server/store/orders';
import { plain } from '@/server/view';
import { serverNow } from '@/server/clock';
import { OrdersBoard } from './OrdersBoard';

export default async function OrdersPage() {
  const actor = await pageActor(['owner', 'staff'], '/app');
  const db = await getDb();
  const [orders, requests] = await Promise.all([listOrders(db, actor.orgId, { limit: 300 }), listOpenRequests(db, actor.orgId)]);
  return <OrdersBoard orders={plain(orders)} requests={plain(requests)} now={serverNow()} />;
}
