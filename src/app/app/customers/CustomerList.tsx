'use client';

import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { formatINR, formatIstDate, formatPhone } from '@/domain';
import { PageFrame } from '@/components/PageFrame';

type Row = {
  id: string;
  name: string;
  phone: string;
  area: string;
  orders: number;
  dues: number;
  lastOrderAt: number | null;
  consent: { service_updates: boolean; marketing: boolean };
  subscription: { plan: string; balance: number; kind: string } | null;
};

export function CustomerList({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const rows = customers.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle.replace(/\D/g, '') || '§') || c.area.toLowerCase().includes(needle));
  const columns: TableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Customer',
      renderCell: (c) => (
        <VStack gap={0.5}>
          <Link href={`/app/customers/${c.id}`} weight="semibold">
            {c.name}
          </Link>
          <Text type="supporting" color="secondary">
            {formatPhone(c.phone)} · {c.area || 'no area'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'end',
      renderCell: (c) => (
        <HStack gap={1} hAlign="end">
          <Text hasTabularNumbers>{c.orders}</Text>
          {c.orders >= 2 ? <Token size="sm" color="blue" label="Repeat" /> : null}
        </HStack>
      ),
    },
    { key: 'lastOrderAt', header: 'Last order', renderCell: (c) => <Text>{c.lastOrderAt ? formatIstDate(c.lastOrderAt) : '—'}</Text> },
    { key: 'dues', header: 'Dues', align: 'end', renderCell: (c) => <Text hasTabularNumbers>{c.dues ? formatINR(c.dues) : '—'}</Text> },
    { key: 'subscription', header: 'Plan', renderCell: (c) => (c.subscription ? <Token size="sm" color="purple" label={c.subscription.plan} /> : <Text color="secondary">—</Text>) },
    {
      key: 'consent',
      header: 'Consent',
      renderCell: (c) => (
        <HStack gap={1} wrap="wrap">
          <Token size="sm" color={c.consent.service_updates ? 'green' : 'gray'} label={c.consent.service_updates ? 'Updates ✓' : 'Updates ✗'} />
          <Token size="sm" color={c.consent.marketing ? 'green' : 'gray'} label={c.consent.marketing ? 'Offers ✓' : 'Offers ✗'} />
        </HStack>
      ),
    },
  ];
  return (
    <PageFrame title="Customers" subtitle={`${customers.length} customers, keyed by phone. Consent is tracked per purpose.`}>
      <TextInput label="Search" isLabelHidden placeholder="Search name, phone or area" value={q} onChange={setQ} startIcon="search" hasClear />
      <Table<Row> data={rows} columns={columns} idKey="id" density="compact" hasHover />
    </PageFrame>
  );
}
