import type { ReactNode } from 'react';
import { StaffShell } from '@/components/StaffShell';
import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { listOpenRequests } from '@/server/store/orders';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const actor = await pageActor();
  const open = actor.role === 'rider' ? [] : await listOpenRequests(await getDb(), actor.orgId);
  return (
    <StaffShell role={actor.role} name={actor.name} orgName={actor.orgName} isDemo={actor.isDemo} openRequests={open.length}>
      {children}
    </StaffShell>
  );
}
