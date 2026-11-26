'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { formatINR, formatIst, formatPhone } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { api, errorMessage } from '@/lib/api';

type Msg = { id: string; toAddress: string; template: string; purpose: string; body: string; status: string; createdAt: number };
type Campaign = { id: string; template: string; offer: string; audience: string; sent: number; skipped: number; converted: number; revenue: number; createdAt: number };

export function MessagesView({ messages, campaigns, isOwner }: { messages: Msg[]; campaigns: Campaign[]; isOwner: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [template, setTemplate] = useState<'winback_offer' | 'plan_offer'>('winback_offer');
  const [audience, setAudience] = useState<'lapsed_30' | 'all'>('lapsed_30');
  const [offer, setOffer] = useState('Get 15% off your next order this week. Show this message at the counter.');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = messages.filter((m) => filter === 'all' || (filter === 'blocked' ? m.status !== 'simulated_sent' : m.purpose === filter));
  const columns: TableColumn<Msg>[] = [
    {
      key: 'createdAt',
      header: 'When / to',
      renderCell: (m) => (
        <VStack gap={0.5}>
          <Text>{formatIst(m.createdAt)}</Text>
          <Text type="supporting" color="secondary">
            {formatPhone(m.toAddress)}
          </Text>
        </VStack>
      ),
    },
    { key: 'body', header: 'Message', renderCell: (m) => <Text>{m.body}</Text> },
    {
      key: 'status',
      header: 'Status',
      renderCell: (m) => (
        <VStack gap={0.5}>
          <Token size="sm" color={m.status === 'simulated_sent' ? 'green' : 'gray'} label={m.status === 'simulated_sent' ? 'Sent (simulated)' : 'Blocked: no consent'} />
          <Text type="supporting" color="secondary">
            {m.template} · {m.purpose === 'marketing' ? 'marketing' : 'utility'}
          </Text>
        </VStack>
      ),
    },
  ];
  const campCols: TableColumn<Campaign>[] = [
    { key: 'createdAt', header: 'Sent', renderCell: (c) => <Text>{formatIst(c.createdAt)}</Text> },
    { key: 'offer', header: 'Offer', renderCell: (c) => <Text>{c.offer}</Text> },
    { key: 'audience', header: 'Audience', renderCell: (c) => <Text>{c.audience === 'lapsed_30' ? 'No order in 30 days' : 'All customers'}</Text> },
    { key: 'sent', header: 'Sent / skipped', align: 'end', renderCell: (c) => <Text hasTabularNumbers>{c.sent} / {c.skipped}</Text> },
    { key: 'converted', header: 'Came back', align: 'end', renderCell: (c) => <Text hasTabularNumbers weight="semibold">{c.converted}</Text> },
    { key: 'revenue', header: 'Their orders', align: 'end', renderCell: (c) => <Text hasTabularNumbers>{formatINR(c.revenue)}</Text> },
  ];

  return (
    <PageFrame title="WhatsApp outbox" subtitle="Simulated adapter: messages are written here instead of being sent. A WhatsApp Business provider plugs in behind the same interface.">
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      {isOwner ? (
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={2}>Send a follow-up</Heading>
            <Text color="secondary">Goes only to customers who opted in to offers. Others are skipped and logged.</Text>
            <HStack gap={6} wrap="wrap">
              <RadioList label="Message" value={template} onChange={(v) => setTemplate(v as typeof template)}>
                <RadioListItem value="winback_offer" label="Win-back offer" />
                <RadioListItem value="plan_offer" label="Monthly plan offer" />
              </RadioList>
              <RadioList label="Audience" value={audience} onChange={(v) => setAudience(v as typeof audience)}>
                <RadioListItem value="lapsed_30" label="No order in 30 days" />
                <RadioListItem value="all" label="All customers" />
              </RadioList>
            </HStack>
            <TextInput label="Offer text" value={offer} onChange={setOffer} />
            <HStack>
              <Button
                label="Send"
                variant="primary"
                clickAction={async () => {
                  setError(null);
                  try {
                    const r = await api<{ sent: number; skipped: number }>('/api/campaigns', { template, audience, offer });
                    setNotice(`Sent to ${r.sent}; skipped ${r.skipped} without marketing consent.`);
                    router.refresh();
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              />
            </HStack>
            {campaigns.length ? (
              <VStack gap={2}>
                <Heading level={3}>Results</Heading>
                <Table<Campaign> data={campaigns} columns={campCols} idKey="id" density="compact" />
              </VStack>
            ) : null}
          </VStack>
        </Card>
      ) : null}
      <SegmentedControl label="Filter messages" value={filter} onChange={setFilter}>
        <SegmentedControlItem value="all" label="All" />
        <SegmentedControlItem value="service_updates" label="Order updates" />
        <SegmentedControlItem value="marketing" label="Offers" />
        <SegmentedControlItem value="blocked" label="Blocked" />
      </SegmentedControl>
      <Table<Msg> data={rows} columns={columns} idKey="id" density="compact" verticalAlign="top" />
    </PageFrame>
  );
}
