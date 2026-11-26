'use client';

import { useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Section } from '@astryxdesign/core/Section';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { CONSENT_TEXT, formatINR, formatPhone, normalizeIndianPhone, PRIVACY_NOTICE, SLOT_LABEL, SLOTS, type Slot } from '@/domain';
import { api, errorMessage } from '@/lib/api';
import { iso } from '@/lib/dates';

type Shop = { name: string; address: string; phone: string; isDemo: boolean; turnaroundHours: number };

export function BookPickup({ token, shop, prices, today, maxDate }: { token: string; shop: Shop; prices: { id: string; name: string; unit: string; price: number }[]; today: string; maxDate: string }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<Slot>('evening');
  const [note, setNote] = useState('');
  const [serviceUpdates, setServiceUpdates] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [done, setDone] = useState<null | { date: string; slot: Slot }>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = normalizeIndianPhone(phone) && name.trim() && address.trim().length >= 8 && area.trim();

  return (
    <Layout
      height="auto"
      contentWidth={560}
      content={
        <LayoutContent padding={4} label="Book a pickup">
          <VStack gap={5}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Heading level={1}>{shop.name}</Heading>
                {shop.isDemo ? <Badge variant="info" label="Demo" /> : null}
              </HStack>
              <Text color="secondary">{shop.address}</Text>
              <Text>
                Free pickup and delivery · ready in about {Math.round(shop.turnaroundHours / 24)} days · <Link href={`tel:${shop.phone}`}>{formatPhone(shop.phone)}</Link>
              </Text>
            </VStack>

            {done ? (
              <Banner
                status="success"
                title="Pickup booked!"
                description={`We'll come on ${done.date}, ${SLOT_LABEL[done.slot]}. ${serviceUpdates ? 'You will get a WhatsApp confirmation.' : 'The rider will call before arriving.'} Every item gets a QR tag and you can track it from your phone.`}
              />
            ) : (
              <VStack gap={3}>
                <Heading level={2}>Book a pickup</Heading>
                {error ? <Banner status="error" title={error} /> : null}
                <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="98765 43210" isRequired />
                <TextInput label="Your name" value={name} onChange={setName} isRequired />
                <TextInput label="Address" value={address} onChange={setAddress} placeholder="Flat, building, street" isRequired />
                <TextInput label="Area / locality" value={area} onChange={setArea} placeholder="Kondapur" isRequired />
                <DateInput label="Pickup date" value={iso(date)} onChange={(v) => v && setDate(v)} min={iso(today)} max={iso(maxDate)} />
                <RadioList label="Time slot" value={slot} onChange={(v) => setSlot(v as Slot)}>
                  {SLOTS.map((s) => (
                    <RadioListItem key={s} value={s} label={SLOT_LABEL[s]} />
                  ))}
                </RadioList>
                <TextInput label="Anything we should know?" value={note} onChange={setNote} isOptional placeholder="2 sarees for dry clean, gate code" />
                <Section variant="muted" padding={4}>
                  <VStack gap={2}>
                    <Text type="supporting" color="secondary">
                      {PRIVACY_NOTICE}
                    </Text>
                    <CheckboxInput label="WhatsApp order updates" description={CONSENT_TEXT.service_updates} value={serviceUpdates} onChange={setServiceUpdates} />
                    <CheckboxInput label="Offers and reminders" description={CONSENT_TEXT.marketing} value={marketing} onChange={setMarketing} />
                  </VStack>
                </Section>
                <Button
                  label="Book pickup"
                  variant="primary"
                  size="lg"
                  isDisabled={!valid}
                  clickAction={async () => {
                    setError(null);
                    try {
                      const r = await api<{ date: string; slot: Slot }>(`/api/public/shops/${token}/pickups`, { phone, name, address, area, date, slot, note, serviceUpdates, marketing });
                      setDone(r);
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                  }}
                />
              </VStack>
            )}

            <VStack gap={2}>
              <Heading level={2}>Popular prices</Heading>
              <List density="compact" hasDividers>
                {prices.map((p) => (
                  <ListItem key={p.id} label={p.name} endContent={<Text hasTabularNumbers>{`${formatINR(p.price)} / ${p.unit}`}</Text>} />
                ))}
              </List>
            </VStack>
            <Text type="supporting" color="secondary">
              Powered by WashTrack.
            </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
