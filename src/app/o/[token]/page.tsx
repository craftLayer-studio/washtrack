import type { Metadata } from 'next';
import { getDb } from '@/server/db/client';
import { guardPublicPage } from '@/server/public-guard';
import { orNotFound } from '@/server/pages';
import { publicOrder } from '@/server/store/public';
import { TrackView } from './TrackView';
import { TooMany } from '@/components/TooMany';

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } };

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await guardPublicPage(token, 'track'))) return <TooMany />;
  const view = await orNotFound(publicOrder(await getDb(), token));
  return <TrackView token={token} view={view} />;
}
