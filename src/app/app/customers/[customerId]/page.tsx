import { notFound } from 'next/navigation';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { customerProfile } from '@/server/store/customers';
import { StoreError } from '@/server/store/errors';
import { listPlans } from '@/server/store/plans';
import { plain } from '@/server/view';
import { CustomerProfile } from './CustomerProfile';

export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const actor = await pageActor(['owner', 'staff'], `/app/customers/${customerId}`);
  const db = await getDb();
  let profile;
  try {
    profile = await customerProfile(db, actor.orgId, customerId);
  } catch (err) {
    if (err instanceof StoreError && err.status === 404) notFound();
    throw err;
  }
  const plans = (await listPlans(db, actor.orgId)).filter((p) => p.active);
  return <CustomerProfile profile={plain(profile)} plans={plans} />;
}
