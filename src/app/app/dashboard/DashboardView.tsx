'use client';

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { formatINR, formatIst, formatPhone, STAGES, STAGE_LABEL, type Dashboard, type Stage } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { StageToken } from '@/components/bits';

type Data = {
  stats: Dashboard;
  overdueOrders: { id: string; code: string; stage: Stage; dueAt: number; customerName: string; express: boolean }[];
  topCustomers: { id: string; name: string; phone: string; orders: number; spend: number }[];
  messages: { sent: number; blocked: number };
};
type Campaign = { id: string; offer: string; sent: number; converted: number; revenue: number; createdAt: number };

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <VStack gap={1}>
        <Text color="secondary">{label}</Text>
        <Heading level={2} accessibilityLevel={3}>
          {value}
        </Heading>
        {hint ? (
          <Text type="supporting" color="secondary">
            {hint}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}

export function DashboardView({ data, campaigns }: { data: Data; campaigns: Campaign[] }) {
  const s = data.stats;
  const open = STAGES.filter((x) => x !== 'delivered').reduce((n, x) => n + s.byStage[x], 0);
  const overdueCols: TableColumn<Data['overdueOrders'][number]>[] = [
    { key: 'code', header: 'Order', renderCell: (o) => <Link href={`/app/orders/${o.id}`}>{o.code}</Link> },
    { key: 'customerName', header: 'Customer' },
    { key: 'stage', header: 'Stage', renderCell: (o) => <StageToken stage={o.stage} /> },
    { key: 'dueAt', header: 'Was due', renderCell: (o) => <Text>{formatIst(o.dueAt)}</Text> },
  ];
  const topCols: TableColumn<Data['topCustomers'][number]>[] = [
    {
      key: 'name',
      header: 'Customer',
      renderCell: (c) => (
        <VStack gap={0.5}>
          <Link href={`/app/customers/${c.id}`}>{c.name}</Link>
          <Text type="supporting" color="secondary">
            {formatPhone(c.phone)}
          </Text>
        </VStack>
      ),
    },
    { key: 'orders', header: 'Orders', align: 'end' },
    { key: 'spend', header: 'Billed', align: 'end', renderCell: (c) => <Text hasTabularNumbers>{formatINR(c.spend)}</Text> },
  ];
  const campCols: TableColumn<Campaign>[] = [
    { key: 'offer', header: 'Follow-up', renderCell: (c) => <Text maxLines={2}>{c.offer}</Text> },
    { key: 'sent', header: 'Sent', align: 'end' },
    { key: 'converted', header: 'Came back', align: 'end' },
    { key: 'revenue', header: 'Orders', align: 'end', renderCell: (c) => <Text hasTabularNumbers>{formatINR(c.revenue)}</Text> },
  ];

  return (
    <PageFrame title="Dashboard" subtitle="Today and this month, in IST." actions={<Button label="Send a follow-up" href="/app/messages" />}>
      <Grid columns={{ minWidth: 200, max: 4, repeat: 'fit' }} gap={4}>
        <Tile label="Revenue today" value={formatINR(s.revenueToday)} hint={`${s.ordersToday} new orders today`} />
        <Tile label="Revenue this month" value={formatINR(s.revenueMonth)} hint="Payments collected, incl. plans" />
        <Tile label="Dues outstanding" value={formatINR(s.duesOutstanding)} />
        <Tile label="Overdue" value={String(s.overdue)} hint="Past due date, not ready" />
        <Tile label="Ready, not collected" value={String(s.readyNotCollected)} />
        <Tile label="Repeat customers" value={`${s.repeatCustomers} of ${s.customers}`} hint={`${s.repeatRate}% ordered twice or more`} />
        <Tile label="WhatsApp sent" value={String(data.messages.sent)} hint={`${data.messages.blocked} held back (no consent)`} />
        <Tile label="Open orders" value={String(open)} />
      </Grid>

      <Grid columns={{ minWidth: 320, max: 2, repeat: 'fit' }} gap={6}>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>Orders by stage</Heading>
            {STAGES.map((st) => (
              <VStack key={st} gap={1}>
                <HStack hAlign="between">
                  <Text>{STAGE_LABEL[st]}</Text>
                  <Text hasTabularNumbers weight="semibold">
                    {s.byStage[st]}
                  </Text>
                </HStack>
                <ProgressBar label={`${STAGE_LABEL[st]} orders`} isLabelHidden value={s.byStage[st]} max={Math.max(1, ...STAGES.map((x) => s.byStage[x]))} variant={st === 'ready' ? 'success' : 'accent'} />
              </VStack>
            ))}
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>Overdue items</Heading>
            <Table data={data.overdueOrders} columns={overdueCols} idKey="id" density="compact" emptyState={<EmptyState title="Nothing overdue" isCompact />} />
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>Top repeat customers</Heading>
            <Table data={data.topCustomers} columns={topCols} idKey="id" density="compact" emptyState={<EmptyState title="No repeat customers yet" isCompact />} />
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>Follow-up results</Heading>
            <Table data={campaigns} columns={campCols} idKey="id" density="compact" emptyState={<EmptyState title="No follow-ups sent yet" description="Send a win-back offer from the WhatsApp outbox." isCompact />} />
          </VStack>
        </Card>
      </Grid>
    </PageFrame>
  );
}
