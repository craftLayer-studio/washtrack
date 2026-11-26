'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { Token } from '@astryxdesign/core/Token';
import { TrashIcon } from '@heroicons/react/24/outline';
import {
  buildBill,
  CONSENT_TEXT,
  formatINR,
  formatQuantity,
  normalizeIndianPhone,
  PRIVACY_NOTICE,
  SERVICE_LABEL,
  type PriceItem,
  type Bill,
} from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { api, errorMessage } from '@/lib/api';

type CatalogItem = PriceItem & { category: string };
type Found = {
  customer: { id: string; name: string; address: string; area: string; preferences: string };
  consent: { service_updates: boolean; marketing: boolean };
  dues: number;
  history: { id: string }[];
  subscription: null | { balance: number; plan: { name: string; kind: 'pieces' | 'kg' } };
};
type Line = { key: string; priceItemId: string; quantity: number };
type LineRow = { key: string; name: string; service: string; qty: string; amount: string };

export function IntakeForm({ priceList }: { priceList: CatalogItem[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [preferences, setPreferences] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const [serviceUpdates, setServiceUpdates] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [express, setExpress] = useState(false);
  const [usePlan, setUsePlan] = useState(true);
  const [discountRupees, setDiscountRupees] = useState<number>(0);
  const [deliveryMode, setDeliveryMode] = useState<'collect' | 'delivery'>('collect');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(priceList.map((p) => [p.id, p])), [priceList]);
  const picked = pick ? byId.get(pick) : undefined;

  const lookup = async () => {
    const e164 = normalizeIndianPhone(phone);
    if (!e164 || e164 === lookedUp) return;
    setLookedUp(e164);
    try {
      const r = await api<{ customer: Found | null }>(`/api/customers/lookup?phone=${encodeURIComponent(e164)}`);
      setFound(r.customer);
      if (r.customer) {
        setName(r.customer.customer.name);
        setAddress(r.customer.customer.address);
        setArea(r.customer.customer.area);
        setPreferences(r.customer.customer.preferences);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const addLine = () => {
    if (!picked) return;
    const quantity = picked.unit === 'kg' ? Math.round(qty * 1000) : Math.round(qty);
    if (quantity <= 0) return;
    setLines((ls) => [...ls, { key: `${picked.id}-${Date.now()}`, priceItemId: picked.id, quantity }]);
    setPick(null);
    setQty(1);
  };

  const plan = found?.subscription && usePlan ? { kind: found.subscription.plan.kind, balance: found.subscription.balance } : null;
  let bill: Bill | null = null;
  let billError: string | null = null;
  if (lines.length) {
    try {
      bill = buildBill(priceList, lines, { express, discount: Math.round(discountRupees * 100), plan });
    } catch (e) {
      billError = errorMessage(e);
    }
  }

  const rows: LineRow[] = lines.map((l, i) => {
    const item = byId.get(l.priceItemId)!;
    const priced = bill?.lines[i];
    return { key: l.key, name: item.name, service: SERVICE_LABEL[item.service], qty: formatQuantity(item.unit, l.quantity), amount: priced ? formatINR(priced.amount) : '' };
  });
  const columns: TableColumn<LineRow>[] = [
    { key: 'name', header: 'Item' },
    { key: 'service', header: 'Service' },
    { key: 'qty', header: 'Qty', align: 'end' },
    { key: 'amount', header: 'Amount', align: 'end' },
    {
      key: 'key',
      header: '',
      align: 'end',
      renderCell: (r) => <IconButton size="sm" variant="ghost" label={`Remove ${r.name}`} icon={<Icon icon={TrashIcon} />} onClick={() => setLines((ls) => ls.filter((l) => l.key !== r.key))} />,
    },
  ];
  const tagCount = bill?.lines.reduce((s, l) => s + l.tags, 0) ?? 0;

  const submit = async () => {
    setError(null);
    try {
      const r = await api<{ orderId: string }>('/api/orders', {
        customer: { phone, name, address, area, preferences },
        serviceUpdates: serviceUpdates || Boolean(found?.consent.service_updates),
        marketing,
        lines: lines.map((l) => ({ priceItemId: l.priceItemId, quantity: l.quantity })),
        express,
        discount: Math.round(discountRupees * 100),
        usePlan: Boolean(plan),
        deliveryMode,
        note,
      });
      router.push(`/app/orders/${r.orderId}?intake=1`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const options = [...new Set(priceList.map((p) => p.category))].map((cat) => ({
    type: 'section' as const,
    title: cat,
    options: priceList
      .filter((p) => p.category === cat)
      .map((p) => ({ value: p.id, label: `${p.name} · ${formatINR(express ? (p.expressPrice ?? Math.round(p.price * 1.5)) : p.price)}/${p.unit}` })),
  }));

  return (
    <PageFrame title="New intake" subtitle="Customer, items and bill. Tags, photos and the customer's acknowledgement come next." width={1100}>
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      <Grid columns={{ minWidth: 340, max: 2, repeat: 'fit' }} gap={6}>
        <VStack gap={4}>
          <Heading level={2}>1. Customer</Heading>
          <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} onEnter={lookup} onBlur={lookup} placeholder="98765 43210" isRequired />
          {found ? (
            <Banner
              status="info"
              title={`Returning customer: ${found.history.length} orders${found.dues > 0 ? `, ${formatINR(found.dues)} due` : ''}`}
              description={found.subscription ? `Plan ${found.subscription.plan.name}: ${found.subscription.plan.kind === 'kg' ? `${found.subscription.balance / 1000} kg` : `${found.subscription.balance} pieces`} left` : undefined}
            />
          ) : lookedUp ? (
            <Text color="secondary">New customer. Add their name.</Text>
          ) : null}
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="Address" value={address} onChange={setAddress} isOptional description="Needed for pickup and delivery" />
          <TextInput label="Area / locality" value={area} onChange={setArea} isOptional />
          <TextInput label="Preferences" value={preferences} onChange={setPreferences} isOptional placeholder="Light starch, shirts on hanger" />
          <Card variant="muted">
            <VStack gap={3}>
              <Text weight="semibold">Consent (ask the customer; leave unticked if they say no)</Text>
              <Text type="supporting" color="secondary">
                {PRIVACY_NOTICE}
              </Text>
              {found?.consent.service_updates ? (
                <Token color="green" label="Already opted in to WhatsApp order updates" />
              ) : (
                <CheckboxInput label="WhatsApp order updates" description={CONSENT_TEXT.service_updates} value={serviceUpdates} onChange={setServiceUpdates} />
              )}
              {found?.consent.marketing ? (
                <Token color="green" label="Already opted in to offers" />
              ) : (
                <CheckboxInput label="Offers and reminders" description={CONSENT_TEXT.marketing} value={marketing} onChange={setMarketing} />
              )}
            </VStack>
          </Card>
        </VStack>

        <VStack gap={4}>
          <Heading level={2}>2. Items</Heading>
          <Selector label="Item and service" options={options} value={pick ?? undefined} onChange={(v) => setPick(v)} hasSearch placeholder="Shirt, saree, suit, shoes…" />
          <HStack gap={2} vAlign="end">
            <NumberInput
              label={picked?.unit === 'kg' ? 'Weight' : 'Quantity'}
              units={picked?.unit === 'kg' ? 'kg' : picked?.unit === 'pair' ? 'pairs' : 'pcs'}
              value={qty}
              onChange={setQty}
              min={picked?.unit === 'kg' ? 0.1 : 1}
              max={picked?.unit === 'kg' ? 30 : 50}
              step={picked?.unit === 'kg' ? 0.1 : 1}
              isIntegerOnly={picked?.unit !== 'kg'}
              hasNumberSteppers
              onEnter={addLine}
            />
            <Button label="Add" variant="primary" isDisabled={!picked} onClick={addLine} />
          </HStack>
          <Table<LineRow> data={rows} columns={columns} idKey="key" density="compact" emptyState={<Text color="secondary">No items yet.</Text>} />
          <Switch label="Express (faster turnaround, express price)" value={express} onChange={setExpress} />
          {found?.subscription ? <Switch label={`Use plan balance (${found.subscription.plan.name})`} value={usePlan} onChange={setUsePlan} /> : null}
          <NumberInput label="Discount" units="₹" value={discountRupees} onChange={setDiscountRupees} min={0} isOptional />
          <RadioList label="Return" value={deliveryMode} onChange={(v) => setDeliveryMode(v as 'collect' | 'delivery')} orientation="horizontal">
            <RadioListItem value="collect" label="Customer collects" />
            <RadioListItem value="delivery" label="Home delivery" />
          </RadioList>
          <TextInput label="Order note" value={note} onChange={setNote} isOptional />

          <Card variant="muted">
            <VStack gap={2}>
              <HStack hAlign="between">
                <Text>Subtotal</Text>
                <Text hasTabularNumbers>{formatINR(bill?.subtotal ?? 0)}</Text>
              </HStack>
              {bill && bill.planCovered > 0 ? (
                <HStack hAlign="between">
                  <Text>Covered by plan</Text>
                  <Text hasTabularNumbers>−{formatINR(bill.planCovered)}</Text>
                </HStack>
              ) : null}
              {bill && bill.discount > 0 ? (
                <HStack hAlign="between">
                  <Text>Discount</Text>
                  <Text hasTabularNumbers>−{formatINR(bill.discount)}</Text>
                </HStack>
              ) : null}
              <HStack hAlign="between">
                <Text weight="bold">Total ({tagCount} tags)</Text>
                <Text weight="bold" hasTabularNumbers>
                  {formatINR(bill?.total ?? 0)}
                </Text>
              </HStack>
              {billError ? <Text color="secondary">{billError}</Text> : null}
              <Text type="supporting" color="secondary">
                Final prices are recalculated by the server from your price list.
              </Text>
            </VStack>
          </Card>
          <Button label="Create order and tags" variant="primary" size="lg" isDisabled={!bill || !name.trim() || !normalizeIndianPhone(phone)} clickAction={submit} />
        </VStack>
      </Grid>
    </PageFrame>
  );
}
