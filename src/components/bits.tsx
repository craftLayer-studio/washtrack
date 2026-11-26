'use client';

import { Badge } from '@astryxdesign/core/Badge';
import { Token } from '@astryxdesign/core/Token';
import { STAGE_LABEL, type Stage } from '@/domain/stages';

const STAGE_COLOR: Record<Stage, 'gray' | 'blue' | 'purple' | 'green' | 'teal'> = {
  received: 'gray',
  washing: 'blue',
  ironing: 'purple',
  ready: 'green',
  delivered: 'teal',
};

export function StageToken({ stage }: { stage: Stage }) {
  return <Token size="sm" color={STAGE_COLOR[stage]} label={STAGE_LABEL[stage]} />;
}

export function PayToken({ total, paid }: { total: number; paid: number }) {
  if (paid >= total) return <Token size="sm" color="green" label="Paid" />;
  return <Token size="sm" color={paid > 0 ? 'orange' : 'red'} label={paid > 0 ? 'Part paid' : 'Due'} />;
}

export function CountBadge({ n, variant = 'neutral' }: { n: number; variant?: 'neutral' | 'warning' | 'error' | 'success' | 'info' }) {
  return <Badge variant={variant} label={String(n)} />;
}
