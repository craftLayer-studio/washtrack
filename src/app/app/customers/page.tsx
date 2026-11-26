import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { listCustomers } from '@/server/store/customers';
import { plain } from '@/server/view';
import { CustomerList } from './CustomerList';

export default async function CustomersPage() {
  const actor = await pageActor(['owner', 'staff'], '/app/customers');
  const list = await listCustomers(await getDb(), actor.orgId);
  return <CustomerList customers={plain(list)} />;
}
