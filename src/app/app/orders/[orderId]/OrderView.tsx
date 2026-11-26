'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import {
  formatINR,
  formatIst,
  formatPhone,
  formatQuantity,
  nextStage,
  stageIndex,
  SLOT_LABEL,
  SLOTS,
  STAGE_LABEL,
  waMeLink,
  type Slot,
  type Stage,
  type Unit,
} from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { PayToken, StageToken } from '@/components/bits';
import { api, compressImage, errorMessage } from '@/lib/api';
import { iso } from '@/lib/dates';

type Photo = { id: string; dataUrl: string; createdAt: number };
type Item = { id: string; seq: number; tagCode: string; name: string; service: string; unit: Unit; quantity: number; amount: number; stage: Stage; damageNote: string; photos: Photo[] };
type Detail = {
  order: { id: string; code: string; stage: Stage; dueAt: number; express: boolean; subtotal: number; planCovered: number; discount: number; total: number; paid: number; note: string; damageAckAt: number | null; damageAckName: string | null; deliveryMode: string; createdAt: number; trackToken: string };
  customer: { id: string; name: string; phone: string; address: string; area: string; preferences: string };
  items: Item[];
  payments: { id: string; method: string; amount: number; reference: string; createdAt: number }[];
  requests: { id: string; kind: string; message: string; status: string; createdAt: number }[];
  due: number;
};
type Msg = { id: string; template: string; body: string; status: string; createdAt: number };
type ItemRow = Item & Record<string, unknown>;

export function OrderView({ detail, messages, role, isNew, upiLink, upiQr, trackUrl, today }: { detail: Detail; messages: Msg[]; role: string; isNew: boolean; upiLink: string | null; upiQr: string | null; trackUrl: string; today: string }) {
  const router = useRouter();
  const { order, customer, items } = detail;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoItem, setPhotoItem] = useState<Item | null>(null);
  const [ackName, setAckName] = useState(customer.name);
  const [method, setMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [amount, setAmount] = useState<number>(detail.due / 100);
  const [reference, setReference] = useState('');
  const [jobDate, setJobDate] = useState<string>(today);
  const [jobSlot, setJobSlot] = useState<Slot>('evening');

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setError(null);
    try {
      await fn();
      if (ok) setNotice(ok);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const damaged = items.filter((i) => i.damageNote || i.photos.length);
  const canStaff = role !== 'rider';

  const columns: TableColumn<ItemRow>[] = [
    { key: 'seq', header: '#', align: 'end' },
    {
      key: 'name',
      header: 'Item',
      renderCell: (i) => (
        <VStack gap={0.5}>
          <Text weight="semibold">{i.name}</Text>
          <Text type="supporting" color="secondary">
            Tag {i.tagCode} · {formatQuantity(i.unit, i.quantity)} · {formatINR(i.amount)}
          </Text>
          {i.damageNote ? <Text type="supporting">Condition: {i.damageNote}</Text> : null}
        </VStack>
      ),
    },
    { key: 'stage', header: 'Stage', renderCell: (i) => <StageToken stage={i.stage} /> },
    {
      key: 'photos',
      header: 'Photos',
      renderCell: (i) => (
        <Button size="sm" label={i.photos.length ? `${i.photos.length} photo${i.photos.length > 1 ? 's' : ''}` : 'Add photo / note'} onClick={() => setPhotoItem(i)} />
      ),
    },
    {
      key: 'tagCode',
      header: 'Scan',
      align: 'end',
      renderCell: (i) => {
        const next = nextStage(i.stage);
        if (!next || !canStaff) return null;
        if (next === 'delivered') return null;
        return <Button size="sm" variant="secondary" label={`→ ${STAGE_LABEL[next]}`} clickAction={() => run(() => api('/api/scan', { tag: i.tagCode, stage: next, expectOrderId: order.id }))} />;
      },
    },
  ];

  const waText = `Hi ${customer.name.split(' ')[0]}, track order ${order.code} here: ${trackUrl}`;

  return (
    <PageFrame
      title={`Order ${order.code}`}
      subtitle={`${customer.name} · ${formatPhone(customer.phone)} · received ${formatIst(order.createdAt)}`}
      actions={
        <>
          <Button label="Print tags" variant="primary" href={`/print/tags/${order.id}`} target="_blank" />
          <Button label="Customer page" href={`/o/${order.trackToken}`} target="_blank" />
          <Button label="Send link on WhatsApp" href={waMeLink(customer.phone, waText)} target="_blank" rel="noopener noreferrer" />
        </>
      }>
      {isNew ? (
        <Banner status="success" title="Order created and the received message is in the outbox." description="Next: photograph any stains or damage per tag, get the customer's acknowledgement, then print and attach the tags." />
      ) : null}
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}

      <MetadataList columns="multi">
        <MetadataListItem label="Stage">
          <StageToken stage={order.stage} />
        </MetadataListItem>
        <MetadataListItem label="Due">
          <Text>
            {formatIst(order.dueAt)}
            {order.express ? ' · Express' : ''}
          </Text>
        </MetadataListItem>
        <MetadataListItem label="Bill">
          <HStack gap={2} vAlign="center">
            <Text hasTabularNumbers>{formatINR(order.total)}</Text>
            <PayToken total={order.total} paid={order.paid} />
          </HStack>
        </MetadataListItem>
        <MetadataListItem label="Return">
          <Text>{order.deliveryMode === 'delivery' ? 'Home delivery' : 'Customer collects'}</Text>
        </MetadataListItem>
        <MetadataListItem label="Customer">
          <Link href={`/app/customers/${customer.id}`}>{customer.name}</Link>
        </MetadataListItem>
        {customer.preferences ? (
          <MetadataListItem label="Preferences">
            <Text>{customer.preferences}</Text>
          </MetadataListItem>
        ) : null}
      </MetadataList>

      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
          <Heading level={2}>Tagged items</Heading>
          {canStaff && stageIndex(order.stage) < stageIndex('ready') ? (
            <HStack gap={2} wrap="wrap">
              {(['washing', 'ironing', 'ready'] as const).filter((s) => stageIndex(s) > stageIndex(order.stage)).map((s) => (
                <Button key={s} size="sm" label={`All → ${STAGE_LABEL[s]}`} clickAction={() => run(() => api(`/api/orders/${order.id}/advance`, { stage: s }), `Moved items to ${STAGE_LABEL[s]}`)} />
              ))}
            </HStack>
          ) : null}
          {order.stage === 'ready' ? (
            <Button size="sm" variant="primary" label="Hand over all (delivered)" clickAction={() => run(() => api(`/api/orders/${order.id}/advance`, { stage: 'delivered' }), 'Handed over. Delivered message sent.')} />
          ) : null}
        </HStack>
        <Table<ItemRow> data={items as ItemRow[]} columns={columns} idKey="id" density="compact" verticalAlign="top" />
      </VStack>

      <Grid columns={{ minWidth: 320, max: 2, repeat: 'fit' }} gap={6}>
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={3}>Condition at intake</Heading>
            {damaged.length === 0 ? (
              <Text color="secondary">No damage recorded. Add a photo or note on any item with a stain, tear, missing button or fading.</Text>
            ) : (
              <List density="compact">
                {damaged.map((i) => (
                  <ListItem key={i.id} label={`#${i.seq} ${i.name}`} description={`${i.damageNote || 'Photo only'} · ${i.photos.length} photo(s)`} />
                ))}
              </List>
            )}
            {order.damageAckAt ? (
              <Banner status="success" title={`Acknowledged by ${order.damageAckName}`} description={formatIst(order.damageAckAt)} />
            ) : (
              <VStack gap={2}>
                <Text type="supporting" color="secondary">
                  Show the customer the notes and photos. They confirm the items were received in this condition.
                </Text>
                <TextInput label="Customer name (as acknowledgement)" value={ackName} onChange={setAckName} />
                <Button label="Customer acknowledges condition" clickAction={() => run(() => api(`/api/orders/${order.id}/ack`, { name: ackName }), 'Acknowledgement recorded')} />
              </VStack>
            )}
          </VStack>
        </Card>

        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={3}>Payment</Heading>
            <MetadataList>
              <MetadataListItem label="Subtotal">
                <Text hasTabularNumbers>{formatINR(order.subtotal)}</Text>
              </MetadataListItem>
              {order.planCovered > 0 ? (
                <MetadataListItem label="Plan covered">
                  <Text hasTabularNumbers>−{formatINR(order.planCovered)}</Text>
                </MetadataListItem>
              ) : null}
              {order.discount > 0 ? (
                <MetadataListItem label="Discount">
                  <Text hasTabularNumbers>−{formatINR(order.discount)}</Text>
                </MetadataListItem>
              ) : null}
              <MetadataListItem label="Paid">
                <Text hasTabularNumbers>{formatINR(order.paid)}</Text>
              </MetadataListItem>
              <MetadataListItem label="Balance due">
                <Text weight="bold" hasTabularNumbers>
                  {formatINR(detail.due)}
                </Text>
              </MetadataListItem>
            </MetadataList>
            {detail.due > 0 ? (
              <>
                {upiQr && upiLink ? (
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="wt-qr" src={upiQr} alt={`UPI QR for ${formatINR(detail.due)}`} />
                    <VStack gap={1}>
                      <Text type="supporting" color="secondary">
                        Customer scans with any UPI app, or opens the pay link from their order page.
                      </Text>
                      <Link href={upiLink}>Open UPI intent link</Link>
                    </VStack>
                  </HStack>
                ) : null}
                <HStack gap={2} vAlign="end" wrap="wrap">
                  <Selector
                    label="Method"
                    value={method}
                    onChange={(v) => setMethod(v as typeof method)}
                    options={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'upi', label: 'UPI (checked in app)' },
                      { value: 'card', label: 'Card' },
                    ]}
                  />
                  <NumberInput label="Amount" units="₹" value={amount} onChange={setAmount} min={1} max={detail.due / 100} />
                </HStack>
                <TextInput label="Reference" value={reference} onChange={setReference} isOptional placeholder="UPI ref no." />
                <Button
                  label={`Record ${formatINR(Math.round(amount * 100))}`}
                  variant="primary"
                  clickAction={() => run(() => api(`/api/orders/${order.id}/payments`, { method, amount: Math.round(amount * 100), reference }), 'Payment recorded')}
                />
              </>
            ) : (
              <Token color="green" label="Fully paid" />
            )}
            {detail.payments.length ? (
              <List density="compact" hasDividers>
                {detail.payments.map((p) => (
                  <ListItem key={p.id} label={`${formatINR(p.amount)} · ${p.method.toUpperCase()}`} description={`${formatIst(p.createdAt)}${p.reference ? ` · ${p.reference}` : ''}`} />
                ))}
              </List>
            ) : null}
          </VStack>
        </Card>
      </Grid>

      {canStaff && order.stage !== 'delivered' ? (
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={3}>Schedule home delivery</Heading>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <DateInput label="Date" value={iso(jobDate)} onChange={(v) => v && setJobDate(v)} min={iso(today)} />
              <Selector label="Slot" value={jobSlot} onChange={(v) => setJobSlot(v as Slot)} options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))} />
              <Button
                label="Add to route"
                clickAction={() => run(() => api('/api/jobs', { customerId: customer.id, kind: 'delivery', date: jobDate, slot: jobSlot, orderId: order.id }), 'Delivery scheduled and confirmed to the customer')}
              />
            </HStack>
            {!customer.address ? <Text color="secondary">Add the customer&apos;s address on their profile first.</Text> : null}
          </VStack>
        </Card>
      ) : null}

      <VStack gap={2}>
        <Heading level={2}>Messages for this order</Heading>
        <List hasDividers>
          {messages.map((m) => (
            <ListItem
              key={m.id}
              label={m.body}
              description={`${m.template} · ${formatIst(m.createdAt)}`}
              endContent={<Token size="sm" color={m.status === 'simulated_sent' ? 'green' : 'gray'} label={m.status === 'simulated_sent' ? 'Sent (simulated)' : 'Not sent: no consent'} />}
            />
          ))}
        </List>
      </VStack>

      {photoItem ? <PhotoDialog item={photoItem} onClose={() => setPhotoItem(null)} onSaved={() => router.refresh()} /> : null}
    </PageFrame>
  );
}

function PhotoDialog({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState(item.damageNote);
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(item.photos);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog isOpen onOpenChange={(o) => !o && onClose()} purpose="form" width={520}>
      <VStack gap={4}>
        <DialogHeader title={`#${item.seq} ${item.name}`} subtitle={`Tag ${item.tagCode}`} />
        {error ? <Banner status="error" title={error} /> : null}
        <HStack gap={2} wrap="wrap">
          {photos.map((p) => (
            <Thumbnail key={p.id} src={p.dataUrl} alt={`Intake photo of ${item.name}`} label={`Photo ${formatIst(p.createdAt)}`} />
          ))}
          {photos.length === 0 ? <Text color="secondary">No photos yet.</Text> : null}
        </HStack>
        <FileInput label="Take or choose a photo" accept="image/*" value={file} onChange={(f) => setFile(Array.isArray(f) ? (f[0] ?? null) : f)} description="Photos are compressed on the phone before upload." />
        <Button
          label="Upload photo"
          isDisabled={!file}
          clickAction={async () => {
            if (!file) return;
            setError(null);
            try {
              const dataUrl = await compressImage(file);
              const r = await api<{ id: string; createdAt: string }>(`/api/items/${item.id}/photos`, { dataUrl });
              setPhotos((ps) => [...ps, { id: r.id, dataUrl, createdAt: Date.now() }]);
              setFile(null);
              onSaved();
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        />
        <TextArea label="Condition note" value={note} onChange={setNote} placeholder="Ink stain on cuff, missing top button" maxLength={300} />
        <HStack gap={2} hAlign="end">
          <Button label="Close" variant="ghost" onClick={onClose} />
          <Button
            label="Save note"
            variant="primary"
            clickAction={async () => {
              try {
                await api(`/api/items/${item.id}/note`, { note });
                onSaved();
                onClose();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
