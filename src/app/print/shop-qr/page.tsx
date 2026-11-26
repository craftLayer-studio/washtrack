import type { Metadata } from 'next';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { appUrl } from '@/server/store/messaging';
import { getOrg } from '@/server/store/orders';
import { qrDataUrl } from '@/server/qr';
import { ShopQrSheet } from './ShopQrSheet';

export const metadata: Metadata = { title: 'Shop QR sheet' };

export default async function ShopQrPage() {
  const actor = await pageActor(['owner'], '/print/shop-qr');
  const org = await getOrg(await getDb(), actor.orgId);
  const url = `${appUrl()}/s/${org.shopToken}`;
  return <ShopQrSheet name={org.name} address={org.address} url={url} qr={await qrDataUrl(url)} isDemo={org.isDemo} />;
}
