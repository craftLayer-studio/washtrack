'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { formatINR, formatPhone, SLOT_LABEL, SLOTS, type Slot } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { api, errorMessage } from '@/lib/api';
import { iso } from '@/lib/dates';

type Job = {
  id: string;
  seq: number;
  kind: 'pickup' | 'delivery';
  slot: Slot;
  area: string;
  address: string;
  note: string;
  status: 'scheduled' | 'done' | 'cancelled';
  source: string;
  customerName: string;
  customerPhone: string;
  orderId: string | null;
  orderCode: string | null;
  orderStage: string | null;
  collect: number;
};
type Person = { id: string; name: string; phone: string; area: string; address: string };

export function RouteView({ jobs, date, today, customers, canSchedule }: { jobs: Job[]; date: string; today: string; customers: Person[]; canSchedule: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [slot, setSlot] = useState<Slot>('morning');
  const [jobDate, setJobDate] = useState(date);
  const [note, setNote] = useState('');

  const act = async (id: string, action: 'start' | 'complete' | 'cancel') => {
    setError(null);
    try {
      const r = await api<{ message?: string }>(`/api/jobs/${id}`, { action });
      setNotice(action === 'start' ? `Out-for-delivery message ${r.message === 'sent' ? 'sent' : 'not sent (no consent)'}.` : action === 'complete' ? 'Marked done.' : 'Cancelled.');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const open = jobs.filter((j) => j.status === 'scheduled');
  const collectTotal = open.reduce((s, j) => s + j.collect, 0);

  const columns: TableColumn<Job>[] = [
    { key: 'seq', header: '#', align: 'end' },
    {
      key: 'kind',
      header: 'Stop',
      renderCell: (j) => (
        <VStack gap={0.5}>
          <HStack gap={1} wrap="wrap">
            <Token size="sm" color={j.kind === 'pickup' ? 'blue' : 'green'} label={j.kind === 'pickup' ? 'Pickup' : 'Delivery'} />
            {j.status !== 'scheduled' ? <Token size="sm" color="gray" label={j.status === 'done' ? 'Done' : 'Cancelled'} /> : null}
            {j.source === 'qr_page' ? <Token size="sm" color="purple" label="Booked via QR" /> : null}
          </HStack>
          <Text type="supporting" color="secondary">
            {SLOT_LABEL[j.slot]}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'area',
      header: 'Where',
      renderCell: (j) => (
        <VStack gap={0.5}>
          <Text weight="semibold">{j.area}</Text>
          <Text type="supporting">{j.address}</Text>
          {j.note ? <Text type="supporting" color="secondary">Note: {j.note}</Text> : null}
        </VStack>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      renderCell: (j) => (
        <VStack gap={0.5}>
          <Text>{j.customerName}</Text>
          <Link href={`tel:${j.customerPhone}`}>{formatPhone(j.customerPhone)}</Link>
        </VStack>
      ),
    },
    {
      key: 'orderCode',
      header: 'Order / collect',
      renderCell: (j) =>
        j.orderId ? (
          <VStack gap={0.5}>
            <Link href={`/app/orders/${j.orderId}`}>{j.orderCode}</Link>
            <Text weight="semibold">{j.collect > 0 ? `Collect ${formatINR(j.collect)}` : 'Paid'}</Text>
          </VStack>
        ) : (
          <Text color="secondary">Bring bags and tags</Text>
        ),
    },
    {
      key: 'id',
      header: '',
      align: 'end',
      renderCell: (j) =>
        j.status === 'scheduled' ? (
          <HStack gap={1} hAlign="end" wrap="wrap">
            {j.kind === 'delivery' ? <Button size="sm" label="Out for delivery" clickAction={() => act(j.id, 'start')} /> : null}
            <Button size="sm" variant="primary" label={j.kind === 'delivery' ? 'Delivered' : 'Picked up'} clickAction={() => act(j.id, 'complete')} />
            {canSchedule ? <Button size="sm" variant="ghost" label="Cancel" clickAction={() => act(j.id, 'cancel')} /> : null}
          </HStack>
        ) : null,
    },
  ];

  const chosen = customers.find((c) => c.id === customerId);

  return (
    <PageFrame
      title="Pickups & route"
      subtitle={`${open.length} open stops · collect ${formatINR(collectTotal)} on this route. Sorted by slot, then area.`}
      actions={<DateInput label="Route date" value={iso(date)} onChange={(v) => v && router.push(`/app/routes?date=${v}`)} />}>
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      <Table<Job> data={jobs} columns={columns} idKey="id" density="compact" verticalAlign="top" emptyState={<EmptyState title="No stops on this day" isCompact />} />

      {canSchedule ? (
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={2}>Schedule a pickup</Heading>
            <Text color="secondary">Deliveries are scheduled from the order page. Customers can also book pickups themselves from the shop QR.</Text>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <Selector label="Customer" hasSearch value={customerId} onChange={(v) => setCustomerId(v)} options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.area || 'no area'}` }))} />
              <DateInput label="Date" value={iso(jobDate)} onChange={(v) => v && setJobDate(v)} min={iso(today)} />
              <Selector label="Slot" value={slot} onChange={(v) => setSlot(v as Slot)} options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))} />
            </HStack>
            {chosen ? <Text type="supporting">Address: {chosen.address || 'none on file: add it on the customer profile'}</Text> : null}
            <TextInput label="Note for rider" value={note} onChange={setNote} isOptional />
            <HStack>
              <Button
                label="Add pickup"
                variant="primary"
                isDisabled={!customerId}
                clickAction={async () => {
                  setError(null);
                  try {
                    await api('/api/jobs', { customerId, kind: 'pickup', date: jobDate, slot, note });
                    setNotice('Pickup scheduled and confirmed on WhatsApp (if the customer opted in).');
                    setNote('');
                    if (jobDate !== date) router.push(`/app/routes?date=${jobDate}`);
                    else router.refresh();
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
