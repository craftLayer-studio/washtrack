import { and, desc, eq } from 'drizzle-orm';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { outbox } from '@/server/db/schema';
import { orNotFound } from '@/server/pages';
import { serverNow } from '@/server/clock';
import { getOrderDetail, getOrg, upiLinkFor } from '@/server/store/orders';
import { trackUrl } from '@/server/store/messaging';
import { qrDataUrl } from '@/server/qr';
import { plain } from '@/server/view';
import { istDate } from '@/domain';
import { OrderView } from './OrderView';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ intake?: string }> }) {
  const { orderId } = await params;
  const { intake } = await searchParams;
  const actor = await pageActor(['owner', 'staff', 'rider'], `/app/orders/${orderId}`);
  const db = await getDb();
  const detail = await orNotFound(getOrderDetail(db, actor.orgId, orderId));
  const org = await getOrg(db, actor.orgId);
  const messages = await db.select().from(outbox).where(and(eq(outbox.orgId, actor.orgId), eq(outbox.orderId, orderId))).orderBy(desc(outbox.createdAt));
  const upi = upiLinkFor(org, detail.order);
  const track = trackUrl(detail.order.trackToken);
  return (
    <OrderView
      detail={plain(detail)}
      messages={plain(messages)}
      role={actor.role}
      isNew={intake === '1'}
      upiLink={upi}
      upiQr={upi ? await qrDataUrl(upi) : null}
      trackUrl={track}
      today={istDate(serverNow())}
    />
  );
}
