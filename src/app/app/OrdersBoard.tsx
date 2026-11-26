'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { formatINR, formatIst, isOverdue, STAGES, STAGE_LABEL, formatPhone, type Stage } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { CountBadge, PayToken, StageToken } from '@/components/bits';
import { api, errorMessage } from '@/lib/api';

type Order = {
  id: string;
  code: string;
  stage: Stage;
  dueAt: number;
  total: number;
  paid: number;
  express: boolean;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  deliveryMode: string;
  createdAt: number;
};
type Req = { request: { id: string; kind: 'upi_paid' | 'delivery' | 'issue'; message: string; orderId: string; createdAt: number }; orderCode: string; customerName: string };

const REQUEST_LABEL = { upi_paid: 'Says paid by UPI: check and record payment', delivery: 'Wants home delivery', issue: 'Reported a problem' };

export function OrdersBoard({ orders, requests, now }: { orders: Order[]; requests: Req[]; now: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<'open' | Stage>('open');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s, orders.filter((o) => o.stage === s).length])) as Record<Stage, number>, [orders]);
  const rows = orders
    .filter((o) => (tab === 'open' ? o.stage !== 'delivered' : o.stage === tab))
    .sort((a, b) => (tab === 'delivered' ? b.createdAt - a.createdAt : a.dueAt - b.dueAt));

  const columns: TableColumn<Order>[] = [
    {
      key: 'code',
      header: 'Order',
      renderCell: (o) => (
        <VStack gap={0.5}>
          <Link href={`/app/orders/${o.id}`} weight="semibold">
            {o.code}
          </Link>
          {o.express ? <Token size="sm" color="orange" label="Express" /> : null}
        </VStack>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      renderCell: (o) => (
        <VStack gap={0.5}>
          <Text>{o.customerName}</Text>
          <Text type="supporting" color="secondary">
            {formatPhone(o.customerPhone)}
          </Text>
        </VStack>
      ),
    },
    { key: 'itemCount', header: 'Tags', align: 'end' },
    { key: 'stage', header: 'Stage', renderCell: (o) => <StageToken stage={o.stage} /> },
    {
      key: 'dueAt',
      header: 'Due',
      renderCell: (o) => (
        <VStack gap={0.5}>
          <Text>{formatIst(o.dueAt)}</Text>
          {isOverdue(o.stage, o.dueAt, now) ? <Token size="sm" color="red" label="Overdue" /> : null}
        </VStack>
      ),
    },
    {
      key: 'total',
      header: 'Bill',
      align: 'end',
      renderCell: (o) => (
        <VStack gap={0.5} hAlign="end">
          <Text hasTabularNumbers>{formatINR(o.total)}</Text>
          <PayToken total={o.total} paid={o.paid} />
        </VStack>
      ),
    },
  ];

  return (
    <PageFrame
      title="Orders"
      subtitle="Everything in the shop, by stage. Open an order to scan, photograph, collect payment or print tags."
      actions={
        <>
          <Button
            label="Remind ready > 24 h"
            clickAction={async () => {
              setError(null);
              try {
                const r = await api<{ sent: number; blocked: number }>('/api/reminders', {});
                setNotice(`Reminders: ${r.sent} sent, ${r.blocked} skipped (no consent). See WhatsApp outbox.`);
                router.refresh();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          />
          <Button label="New intake" variant="primary" href="/app/intake" />
        </>
      }>
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}

      {requests.length > 0 ? (
        <VStack gap={2}>
          <Heading level={2}>Customer requests</Heading>
          <List hasDividers>
            {requests.map((r) => (
              <ListItem
                key={r.request.id}
                label={`${r.orderCode} · ${r.customerName}: ${REQUEST_LABEL[r.request.kind]}`}
                description={r.request.message || formatIst(r.request.createdAt)}
                endContent={
                  <HStack gap={2}>
                    <Button size="sm" label="Open order" href={`/app/orders/${r.request.orderId}`} />
                    <Button
                      size="sm"
                      variant="ghost"
                      label="Resolve"
                      clickAction={async () => {
                        await api(`/api/requests/${r.request.id}/resolve`, {});
                        router.refresh();
                      }}
                    />
                  </HStack>
                }
              />
            ))}
          </List>
        </VStack>
      ) : null}

      <VStack gap={3}>
        <TabList value={tab} onChange={(v) => setTab(v as typeof tab)} hasDivider overflow="scroll">
          <Tab value="open" label="All open" endContent={<CountBadge n={orders.length - counts.delivered} />} />
          {STAGES.map((s) => (
            <Tab key={s} value={s} label={STAGE_LABEL[s]} endContent={<CountBadge n={counts[s]} variant={s === 'ready' && counts[s] > 0 ? 'success' : 'neutral'} />} />
          ))}
        </TabList>
        <Table<Order>
          data={rows}
          columns={columns}
          idKey="id"
          density="compact"
          hasHover
          emptyState={<EmptyState title="No orders here" description="New intakes show up in Received." isCompact />}
        />
      </VStack>
    </PageFrame>
  );
}
