import { pageActor } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { campaignResults } from '@/server/store/campaigns';
import { listOutbox } from '@/server/store/settings';
import { plain } from '@/server/view';
import { MessagesView } from './MessagesView';

export default async function MessagesPage() {
  const actor = await pageActor(['owner', 'staff'], '/app/messages');
  const db = await getDb();
  const [messages, campaigns] = await Promise.all([listOutbox(db, actor.orgId, 200), actor.role === 'owner' ? campaignResults(db, actor.orgId) : Promise.resolve([])]);
  return <MessagesView messages={plain(messages.filter((m) => m.purpose !== 'auth'))} campaigns={plain(campaigns)} isOwner={actor.role === 'owner'} />;
}
