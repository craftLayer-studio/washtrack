'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { formatINR, formatPhone, SERVICE_LABEL, SERVICES, UNITS, type Service, type Unit } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { api, errorMessage } from '@/lib/api';

type Org = { name: string; address: string; city: string; phone: string; upiVpa: string; turnaroundHours: number };
type Item = { id: string; name: string; category: string; service: Service; unit: Unit; price: number; expressPrice: number | null; active: boolean };
type Member = { id: string; name: string; phone: string; role: string; active: boolean };

export function SettingsView({ org, shopUrl, items, team }: { org: Org; shopUrl: string; items: Item[]; team: Member[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...org, phone: formatPhone(org.phone) });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', category: '', service: 'dry_clean' as Service, unit: 'piece' as Unit, price: 100 });
  const [member, setMember] = useState({ name: '', phone: '', role: 'staff' });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(null);
    try {
      await fn();
      setNotice(ok);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const itemCols: TableColumn<Item>[] = [
    {
      key: 'name',
      header: 'Item',
      renderCell: (i) => (
        <VStack gap={0.5}>
          <Text weight="semibold">{i.name}</Text>
          <Text type="supporting" color="secondary">
            {i.category} · {SERVICE_LABEL[i.service]} · per {i.unit}
          </Text>
        </VStack>
      ),
    },
    { key: 'price', header: 'Price', align: 'end', renderCell: (i) => <PriceCell item={i} onSave={(price) => run(() => api(`/api/price-items/${i.id}`, { price, expressPrice: i.expressPrice, active: i.active }), `${i.name} price saved`)} /> },
    { key: 'expressPrice', header: 'Express', align: 'end', renderCell: (i) => <Text hasTabularNumbers>{i.expressPrice ? formatINR(i.expressPrice) : '+50%'}</Text> },
    {
      key: 'active',
      header: 'On list',
      renderCell: (i) => <Switch label={`${i.name} on price list`} isLabelHidden value={i.active} changeAction={(v) => run(() => api(`/api/price-items/${i.id}`, { price: i.price, expressPrice: i.expressPrice, active: v }), 'Saved')} />,
    },
  ];
  const teamCols: TableColumn<Member>[] = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone', renderCell: (m) => <Text>{formatPhone(m.phone)}</Text> },
    { key: 'role', header: 'Role' },
  ];

  return (
    <PageFrame title="Settings & QR" subtitle="Shop details, UPI ID, price list, team and printable QR codes.">
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      <Grid columns={{ minWidth: 320, max: 2, repeat: 'fit' }} gap={6}>
        <VStack gap={3}>
          <Heading level={2}>Shop</Heading>
          <TextInput label="Shop name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <TextInput label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <TextInput label="Shop phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextInput label="UPI ID (VPA)" value={form.upiVpa} onChange={(v) => setForm({ ...form, upiVpa: v })} description="Customers pay here through UPI intent links and QR codes." />
          <NumberInput label="Standard turnaround" units="hours" value={form.turnaroundHours} onChange={(v) => setForm({ ...form, turnaroundHours: v })} min={2} max={240} isIntegerOnly />
          <HStack>
            <Button label="Save shop details" variant="primary" clickAction={() => run(() => api('/api/settings', form), 'Shop details saved')} />
          </HStack>
        </VStack>
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={2}>Printable QR</Heading>
            <Text>Put the shop QR on the counter, flyers and society notice boards. Customers scan it to book a pickup, no app needed.</Text>
            <Link href={shopUrl}>{shopUrl}</Link>
            <HStack gap={2} wrap="wrap">
              <Button label="Print shop QR sheet" variant="primary" href="/print/shop-qr" target="_blank" />
              <Button label="Open booking page" href={shopUrl} target="_blank" />
            </HStack>
            <Text type="supporting" color="secondary">
              Garment tags are printed per order from the order page. Each tag QR opens the scanner for staff and the order page for customers.
            </Text>
          </VStack>
        </Card>
      </Grid>

      <VStack gap={3}>
        <Heading level={2}>Price list</Heading>
        <Table<Item> data={items} columns={itemCols} idKey="id" density="compact" />
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={3}>Add item</Heading>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput label="Item" value={newItem.name} onChange={(v) => setNewItem({ ...newItem, name: v })} placeholder="Pathani suit" />
              <TextInput label="Category" value={newItem.category} onChange={(v) => setNewItem({ ...newItem, category: v })} placeholder="Ethnic" />
              <Selector label="Service" value={newItem.service} onChange={(v) => setNewItem({ ...newItem, service: v as Service })} options={SERVICES.map((s) => ({ value: s, label: SERVICE_LABEL[s] }))} />
              <Selector label="Unit" value={newItem.unit} onChange={(v) => setNewItem({ ...newItem, unit: v as Unit })} options={UNITS.map((u) => ({ value: u, label: u }))} />
              <NumberInput label="Price" units="₹" value={newItem.price} onChange={(v) => setNewItem({ ...newItem, price: v })} min={1} />
            </HStack>
            <HStack>
              <Button label="Add to price list" isDisabled={!newItem.name.trim()} clickAction={() => run(() => api('/api/price-items', { ...newItem, price: Math.round(newItem.price * 100), expressPrice: null }), 'Item added')} />
            </HStack>
          </VStack>
        </Card>
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Team</Heading>
        <Table<Member> data={team} columns={teamCols} idKey="id" density="compact" />
        <HStack gap={2} vAlign="end" wrap="wrap">
          <TextInput label="Name" value={member.name} onChange={(v) => setMember({ ...member, name: v })} />
          <TextInput label="Mobile" type="tel" value={member.phone} onChange={(v) => setMember({ ...member, phone: v })} />
          <Selector
            label="Role"
            value={member.role}
            onChange={(v) => setMember({ ...member, role: v })}
            options={[
              { value: 'staff', label: 'Counter / workshop' },
              { value: 'rider', label: 'Rider' },
              { value: 'owner', label: 'Owner' },
            ]}
          />
          <Button label="Add team member" clickAction={() => run(() => api('/api/staff', member), 'Team member added. They sign in with their phone.')} />
        </HStack>
      </VStack>
    </PageFrame>
  );
}

function PriceCell({ item, onSave }: { item: Item; onSave: (price: number) => Promise<void> }) {
  const [value, setValue] = useState(item.price / 100);
  return (
    <HStack gap={1} hAlign="end" vAlign="center">
      <NumberInput label={`${item.name} price`} isLabelHidden units="₹" value={value} onChange={setValue} min={1} width={120} />
      {Math.round(value * 100) !== item.price ? <Button size="sm" label="Save" clickAction={() => onSave(Math.round(value * 100))} /> : null}
    </HStack>
  );
}
