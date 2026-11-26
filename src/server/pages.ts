import { notFound } from 'next/navigation';
import { StoreError } from './store/errors';

/** Await a store call from a page; a 404 StoreError becomes Next's not-found page. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof StoreError && err.status === 404) notFound();
    throw err;
  }
}
