import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { rateLimit } from './ratelimit';
import { isToken } from './store/ids';

/** Public QR pages: reject malformed tokens and rate-limit per IP before touching the database. */
export async function guardPublicPage(token: string, bucket: string): Promise<boolean> {
  if (!isToken(token)) notFound();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
  return rateLimit(`${bucket}:${ip}`, 120, 60_000);
}
