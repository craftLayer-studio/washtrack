import type { Metadata } from 'next';
import { getDb } from '@/server/db/client';
import { guardPublicPage } from '@/server/public-guard';
import { orNotFound } from '@/server/pages';
import { serverNow } from '@/server/clock';
import { listPriceItems } from '@/server/store/settings';
import { shopByToken } from '@/server/store/public';
import { addDays, istDate } from '@/domain';
import { TooMany } from '@/components/TooMany';
import { BookPickup } from './BookPickup';

export const metadata: Metadata = { title: 'Book a laundry pickup', robots: { index: false, follow: false } };

export default async function ShopPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await guardPublicPage(token, 'shop'))) return <TooMany />;
  const db = await getDb();
  const org = await orNotFound(shopByToken(db, token));
  const prices = await listPriceItems(db, org.id);
  const today = istDate(serverNow());
  return (
      <BookPickup
        token={token}
        shop={{ name: org.name, address: org.address, phone: org.phone, isDemo: org.isDemo, turnaroundHours: org.turnaroundHours }}
        prices={prices.slice(0, 12).map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: p.price }))}
        today={today}
        maxDate={addDays(today, 14)}
      />
    );
}
