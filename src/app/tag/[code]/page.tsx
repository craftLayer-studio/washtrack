import { notFound, redirect } from 'next/navigation';
import { currentActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { isTagCode } from '@/server/store/ids';
import { trackTokenForTag } from '@/server/store/public';

/** Target of the QR printed on every garment tag: staff go to the scanner, customers to their order page. */
export default async function TagPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  if (!isTagCode(code)) notFound();
  const actor = await currentActor();
  if (actor) redirect(`/app/scan?tag=${code}`);
  const token = await trackTokenForTag(await getDb(), code);
  if (!token) notFound();
  redirect(`/o/${token}`);
}
