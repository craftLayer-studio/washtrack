'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { CONSENT_TEXT, formatINR, formatIst, formatPhone, formatQuantity, PRIVACY_NOTICE, STAGE_LABEL, STAGES, stageIndex, type ConsentPurpose, type Stage, type Unit } from '@/domain';
import { StageToken } from '@/components/bits';
import { api, errorMessage } from '@/lib/api';

type View = {
  shop: { name: string; address: string; city: string; phone: string; isDemo: boolean };
  order: { code: string; stage: Stage; express: boolean; dueAt: number; createdAt: number; subtotal: number; planCovered: number; discount: number; total: number; paid: number; due: number; deliveryMode: string; damageAckAt: number | null; damageAckName: string | null };
  customer: { firstName: string; phone: string };
  items: { id: string; name: string; unit: Unit; quantity: number; amount: number; stage: Stage; damageNote: string; photos: { id: string; dataUrl: string; at: number }[] }[];
  consent: Record<ConsentPurpose, boolean>;
  openRequests: string[];
  upiLink: string | null;
};

export function TrackView({ token, view }: { token: string; view: View }) {
  const router = useRouter();
  const { shop, order, items } = view;
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState('');
  const [showIssue, setShowIssue] = useState(false);

  const ask = async (kind: 'upi_paid' | 'delivery' | 'issue', message = '', ok: string) => {
    setError(null);
    try {
      await api(`/api/public/orders/${token}/requests`, { kind, message });
      setNotice(ok);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const active = Math.min(stageIndex(order.stage), STAGES.length - 1);
  const readyCount = items.filter((i) => stageIndex(i.stage) >= stageIndex('ready')).length;

  return (
    <Layout
      height="auto"
      contentWidth={560}
      content={
        <LayoutContent padding={4} label="Order status">
          <VStack gap={5}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text weight="semibold">{shop.name}</Text>
                {shop.isDemo ? <Badge variant="info" label="Demo" /> : null}
              </HStack>
              <Heading level={1}>Order {order.code}</Heading>
              <Text color="secondary">
                Hi {view.customer.firstName} · {items.length} item{items.length === 1 ? '' : 's'} · received {formatIst(order.createdAt)}
              </Text>
            </VStack>

            {notice ? <Banner status="success" title={notice} /> : null}
            {error ? <Banner status="error" title={error} /> : null}

            <Card>
              <VStack gap={3}>
                <HStack hAlign="between" vAlign="center">
                  <StageToken stage={order.stage} />
                  <Text color="secondary">
                    {order.stage === 'ready' ? 'Ready for pickup' : order.stage === 'delivered' ? 'Handed over' : `Ready by ${formatIst(order.dueAt)}`}
                  </Text>
                </HStack>
                <Stepper activeStep={active} orientation="vertical" density="compact" label="Order progress">
                  {STAGES.map((s, i) => (
                    <Step key={s} step={i} label={STAGE_LABEL[s]} status={i < active || order.stage === 'delivered' ? 'success' : i === active ? 'accent' : undefined} />
                  ))}
                </Stepper>
                <Text type="supporting" color="secondary">
                  {readyCount} of {items.length} items ready.
                </Text>
              </VStack>
            </Card>

            <VStack gap={2} id="pay">
              <Heading level={2}>Bill</Heading>
              <List density="compact" hasDividers>
                {items.map((i) => (
                  <ListItem key={i.id} label={i.name} description={formatQuantity(i.unit, i.quantity)} endContent={<Text hasTabularNumbers>{formatINR(i.amount)}</Text>} />
                ))}
              </List>
              {order.planCovered > 0 ? <Text>Covered by your monthly plan: −{formatINR(order.planCovered)}</Text> : null}
              {order.discount > 0 ? <Text>Discount: −{formatINR(order.discount)}</Text> : null}
              <HStack hAlign="between">
                <Text weight="bold">Total</Text>
                <Text weight="bold" hasTabularNumbers>
                  {formatINR(order.total)}
                </Text>
              </HStack>
              <HStack hAlign="between">
                <Text>Paid</Text>
                <Text hasTabularNumbers>{formatINR(order.paid)}</Text>
              </HStack>
              {order.due > 0 ? (
                <VStack gap={2}>
                  <HStack hAlign="between">
                    <Text weight="bold">Balance due</Text>
                    <Text weight="bold" hasTabularNumbers>
                      {formatINR(order.due)}
                    </Text>
                  </HStack>
                  {view.upiLink ? <Button label={`Pay ${formatINR(order.due)} by UPI`} variant="primary" size="lg" href={view.upiLink} /> : null}
                  {view.openRequests.includes('upi_paid') ? (
                    <Text color="secondary">Thanks, the shop will confirm your UPI payment.</Text>
                  ) : (
                    <Button label="I've paid by UPI" clickAction={() => ask('upi_paid', '', 'Thanks! The shop will check and confirm your payment.')} />
                  )}
                  <Text type="supporting" color="secondary">
                    The UPI button opens your UPI app (GPay, PhonePe, Paytm, BHIM). You can also pay cash at pickup.
                  </Text>
                </VStack>
              ) : (
                <Banner status="success" title="Fully paid. Thank you!" />
              )}
            </VStack>

            {items.some((i) => i.damageNote || i.photos.length) ? (
              <VStack gap={2}>
                <Heading level={2}>Condition noted at intake</Heading>
                {items
                  .filter((i) => i.damageNote || i.photos.length)
                  .map((i) => (
                    <VStack key={i.id} gap={1}>
                      <Text weight="semibold">{i.name}</Text>
                      {i.damageNote ? <Text>{i.damageNote}</Text> : null}
                      <HStack gap={2} wrap="wrap">
                        {i.photos.map((p) => (
                          <Thumbnail key={p.id} src={p.dataUrl} alt={`Photo of ${i.name} at intake`} label={`Taken ${formatIst(p.at)}`} />
                        ))}
                      </HStack>
                    </VStack>
                  ))}
                {order.damageAckAt ? (
                  <Text type="supporting" color="secondary">
                    Acknowledged by {order.damageAckName} on {formatIst(order.damageAckAt)}.
                  </Text>
                ) : null}
              </VStack>
            ) : null}

            <VStack gap={2}>
              <Heading level={2}>Need something?</Heading>
              {order.stage !== 'delivered' && order.deliveryMode !== 'delivery' ? (
                view.openRequests.includes('delivery') ? (
                  <Text color="secondary">Delivery requested. The shop will confirm a slot.</Text>
                ) : (
                  <Button label="Deliver it to my home" clickAction={() => ask('delivery', '', 'Delivery requested. The shop will confirm a slot on WhatsApp.')} />
                )
              ) : null}
              {showIssue ? (
                <VStack gap={2}>
                  <TextArea label="What's wrong?" value={issue} onChange={setIssue} maxLength={500} placeholder="One shirt is missing a button" />
                  <Button label="Send to shop" clickAction={() => ask('issue', issue, 'Sent. The shop will get back to you.').then(() => setShowIssue(false))} />
                </VStack>
              ) : (
                <Button label="Report a problem" variant="ghost" onClick={() => setShowIssue(true)} />
              )}
              <Text>
                Call the shop: <Link href={`tel:${shop.phone}`}>{formatPhone(shop.phone)}</Link> · {shop.address}
              </Text>
            </VStack>

            <Divider />
            <Section variant="muted" padding={4}>
              <VStack gap={3}>
                <Heading level={2}>Your messages from {shop.name}</Heading>
                <Text type="supporting" color="secondary">
                  {PRIVACY_NOTICE}
                </Text>
                {(['service_updates', 'marketing'] as const).map((p) => (
                  <Switch
                    key={p}
                    label={p === 'service_updates' ? 'Order updates on WhatsApp' : 'Offers and reminders'}
                    description={CONSENT_TEXT[p]}
                    value={view.consent[p]}
                    changeAction={async (v) => {
                      try {
                        await api(`/api/public/orders/${token}/consent`, { purpose: p, granted: v });
                        setNotice(v ? 'Opted in. Thank you.' : 'Opted out. You will not get these messages.');
                        router.refresh();
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  />
                ))}
                <Text type="supporting" color="secondary">
                  Sent to {view.customer.phone}. Powered by WashTrack.
                </Text>
              </VStack>
            </Section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
