'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { describeQuota, formatINR, formatIstDate, pricePerUnit } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { api, errorMessage } from '@/lib/api';

type Plan = { id: string; name: string; kind: 'pieces' | 'kg'; quota: number; price: number; periodDays: number; active: boolean };
type Sub = { id: string; customerId: string; customerName: string; plan: string; kind: 'pieces' | 'kg'; quota: number; balance: number; renewsAt: number };

export function PlansView({ plans, subs, isOwner }: { plans: Plan[]; subs: Sub[]; isOwner: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'pieces' | 'kg'>('pieces');
  const [quota, setQuota] = useState<number>(60);
  const [price, setPrice] = useState<number>(999);
  const [period, setPeriod] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const planCols: TableColumn<Plan>[] = [
    { key: 'name', header: 'Plan', renderCell: (p) => <Text weight="semibold">{p.name}</Text> },
    { key: 'quota', header: 'Includes', renderCell: (p) => <Text>{describeQuota(p.kind, p.quota)} / {p.periodDays} days</Text> },
    { key: 'price', header: 'Price', align: 'end', renderCell: (p) => <Text hasTabularNumbers>{formatINR(p.price)}</Text> },
    { key: 'periodDays', header: 'Per unit', align: 'end', renderCell: (p) => <Text hasTabularNumbers>{formatINR(pricePerUnit(p))}/{p.kind === 'kg' ? 'kg' : 'pc'}</Text> },
    { key: 'id', header: 'Subscribers', align: 'end', renderCell: (p) => <Text hasTabularNumbers>{subs.filter((s) => s.plan === p.name).length}</Text> },
  ];
  const subCols: TableColumn<Sub>[] = [
    { key: 'customerName', header: 'Customer', renderCell: (s) => <Link href={`/app/customers/${s.customerId}`}>{s.customerName}</Link> },
    { key: 'plan', header: 'Plan' },
    {
      key: 'balance',
      header: 'Left',
      renderCell: (s) => (
        <VStack gap={1}>
          <Text>{describeQuota(s.kind, s.balance)} of {describeQuota(s.kind, s.quota)}</Text>
          <ProgressBar label={`${s.customerName} plan balance`} isLabelHidden value={s.balance} max={s.quota} variant={s.balance / s.quota < 0.2 ? 'warning' : 'accent'} />
        </VStack>
      ),
    },
    { key: 'renewsAt', header: 'Renews', renderCell: (s) => <Text>{formatIstDate(s.renewsAt)}</Text> },
  ];

  return (
    <PageFrame title="Monthly plans" subtitle="Prepaid kg or piece bundles. Balance is used automatically at intake. Sell a plan from the customer's profile.">
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      <Table<Plan> data={plans} columns={planCols} idKey="id" density="compact" />
      <VStack gap={2}>
        <Heading level={2}>Active subscribers ({subs.length})</Heading>
        <Table<Sub> data={subs} columns={subCols} idKey="id" density="compact" />
      </VStack>
      {isOwner ? (
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={2}>New plan</Heading>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput label="Name" value={name} onChange={setName} placeholder="Office Press 40" />
              <Selector
                label="Type"
                value={kind}
                onChange={(v) => setKind(v as 'pieces' | 'kg')}
                options={[
                  { value: 'pieces', label: 'Pieces (wash & iron / press)' },
                  { value: 'kg', label: 'Kilograms (per-kg loads)' },
                ]}
              />
              <NumberInput label={kind === 'kg' ? 'Kg included' : 'Pieces included'} value={quota} onChange={setQuota} min={1} isIntegerOnly />
              <NumberInput label="Price" units="₹" value={price} onChange={setPrice} min={1} />
              <NumberInput label="Period" units="days" value={period} onChange={setPeriod} min={7} max={92} isIntegerOnly />
            </HStack>
            <HStack>
              <Button
                label="Create plan"
                variant="primary"
                isDisabled={!name.trim()}
                clickAction={async () => {
                  setError(null);
                  try {
                    await api('/api/plans', { name, kind, quota: kind === 'kg' ? Math.round(quota * 1000) : quota, price: Math.round(price * 100), periodDays: period });
                    setName('');
                    router.refresh();
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              />
            </HStack>
          </VStack>
        </Card>
      ) : null}
    </PageFrame>
  );
}
