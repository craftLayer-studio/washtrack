import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { StoreError } from '@/server/store/errors';
import { appUrl } from '@/server/store/messaging';
import { tagsForOrder } from '@/server/store/orders';
import { qrDataUrl } from '@/server/qr';
import { formatIstDate, formatQuantity } from '@/domain';
import { PrintSheet, TagGrid } from '@/components/PrintSheet';

export const metadata: Metadata = { title: 'Garment tags' };

export default async function TagsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const actor = await pageActor(['owner', 'staff'], `/print/tags/${orderId}`);
  let data;
  try {
    data = await tagsForOrder(await getDb(), actor.orgId, orderId);
  } catch (err) {
    if (err instanceof StoreError && err.status === 404) notFound();
    throw err;
  }
  const total = data.items.length;
  const tags = await Promise.all(
    data.items.map(async (i) => ({
      code: i.tagCode,
      qr: await qrDataUrl(`${appUrl()}/tag/${i.tagCode}`),
      title: `${data.order.code} · ${i.seq}/${total}`,
      lines: [`${i.name} (${formatQuantity(i.unit, i.quantity)})`, `${data.customer.name.split(' ')[0]} · due ${formatIstDate(data.order.dueAt.getTime())}${data.order.express ? ' · EXPRESS' : ''}`],
    })),
  );
  return (
    <PrintSheet heading={`Tags for ${data.order.code}`} note={`${total} tags. Print on a label printer or A4, cut and pin one to each item.`} isDemo={data.org.isDemo}>
      <TagGrid tags={tags} />
    </PrintSheet>
  );
}
