import { pageActor } from '@/server/auth';
import { Scanner } from './Scanner';

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const actor = await pageActor(['owner', 'staff', 'rider'], '/app/scan');
  const { tag } = await searchParams;
  return <Scanner initialTag={tag?.slice(0, 20).toUpperCase() ?? ''} canUpdate={actor.role !== 'rider'} />;
}
