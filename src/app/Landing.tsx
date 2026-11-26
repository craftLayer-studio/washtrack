'use client';

import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import {
  BanknotesIcon,
  CameraIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  QrCodeIcon,
  TruckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const FEATURES = [
  { icon: QrCodeIcon, title: 'A QR tag on every item', body: 'Shirt, saree, suit, shoes or a 5 kg load: each gets its own printed tag at intake. No more mixed-up or lost garments.' },
  { icon: CameraIcon, title: 'Intake photos, acknowledged', body: 'Photograph stains and tears per tag. The customer confirms the condition at the counter, so damage disputes end quickly.' },
  { icon: ArrowPathIcon, title: 'Scan to update', body: 'Workshop staff scan a tag to move it to washing, ironing and ready. The order rolls up on its own.' },
  { icon: ChatBubbleLeftRightIcon, title: 'WhatsApp updates', body: 'Received, ready for pickup, out for delivery: sent automatically, only to customers who opted in.' },
  { icon: BanknotesIcon, title: 'UPI, cash and dues', body: 'Every bill carries a UPI pay link. Part payments and dues are tracked per customer.' },
  { icon: TruckIcon, title: 'Pickups and route list', body: 'Customers book pickups from your QR. Riders get the day in order, with what to collect.' },
  { icon: CreditCardIcon, title: 'Monthly plans', body: 'Sell 60-piece press or 30 kg wash plans. The balance is used automatically at intake.' },
  { icon: ChartBarIcon, title: 'Owner dashboard', body: 'Orders by stage, overdue items, revenue, dues, repeat customers and win-back results.' },
];

const PLANS = [
  { name: 'Starter', price: '₹599/month', detail: 'Single counter, up to 300 orders a month' },
  { name: 'Growth', price: '₹1,299/month', detail: 'Pickup and delivery, monthly plans, campaigns; up to 1,000 orders' },
  { name: 'Plant', price: '₹2,999/month', detail: 'Up to 3 counters and 1 workshop' },
];

export function Landing({ shopToken, trackToken }: { shopToken: string | null; trackToken: string | null }) {
  return (
    <Layout
      height="auto"
      contentWidth={1100}
      content={
        <LayoutContent role="main" padding={6}>
          <VStack gap={10}>
            <HStack hAlign="between" vAlign="center">
              <Text weight="bold" size="lg">
                WashTrack
              </Text>
              <HStack gap={2}>
                <Button label="Staff sign-in" variant="ghost" href="/login" />
                <Button label="Try the demo" variant="primary" href="#demo" />
              </HStack>
            </HStack>

            <VStack gap={6} hAlign="center">
              <VStack gap={3} hAlign="center">
                <Badge variant="info" label="For laundries, dry cleaners, press shops, shoe and bag care" />
                <Heading level={1} type="display-2" justify="center" textWrap="balance">
                  Every garment tagged, every customer updated.
                </Heading>
                <Text color="secondary" justify="center" textWrap="balance">
                  Run your laundry from one phone. QR tags and intake photos at the counter, scan-to-update in the workshop, WhatsApp ready alerts, UPI payments, pickups and monthly plans. Built for Indian storefronts, priced in rupees.
                </Text>
              </VStack>
              <HStack gap={3} wrap="wrap" hAlign="center">
                <Button label="Try the demo" variant="primary" size="lg" href="#demo" />
                <Button label="See pricing" size="lg" href="#pricing" />
              </HStack>
            </VStack>

            <Grid columns={{ minWidth: 240, max: 4, repeat: 'fit' }} gap={4}>
              {FEATURES.map((f) => (
                <Card key={f.title}>
                  <VStack gap={2}>
                    <Icon icon={f.icon} color="accent" />
                    <Heading level={3}>{f.title}</Heading>
                    <Text color="secondary">{f.body}</Text>
                  </VStack>
                </Card>
              ))}
            </Grid>

            <VStack gap={4}>
              <Heading level={2}>How an order flows</Heading>
              <List listStyle="decimal" hasDividers>
                <ListItem label="Counter intake" description="Find the customer by phone, add items from your price list, take photos of any damage, get the customer's acknowledgement, print tags." />
                <ListItem label="Customer is notified" description="A WhatsApp message with the bill, a tracking link and a UPI pay link (only with their consent)." />
                <ListItem label="Workshop scans" description="Each scan moves a tag forward. When every item is ready, the pickup alert goes out by itself." />
                <ListItem label="Pickup or delivery" description="The customer collects, or the rider delivers from the day's route list and collects the balance." />
                <ListItem label="Come back" description="Plans for regulars and win-back offers for customers who have not ordered in 30 days, with results on the dashboard." />
              </List>
            </VStack>

            <Section variant="muted" padding={6}>
              <VStack gap={4}>
                <HStack gap={2} vAlign="center">
                  <Heading level={2} id="demo">
                    Try the demo
                  </Heading>
                  <Badge variant="info" label="Demo data" />
                </HStack>
                <Text>
                  A fictional dry cleaner in Hyderabad with a price list, customers, orders at every stage, plans and today&apos;s route. WhatsApp, SMS and payments are simulated: messages land in an outbox you can read. The sign-in code is shown on screen.
                </Text>
                <Grid columns={{ minWidth: 240, max: 3, repeat: 'fit' }} gap={4}>
                  <Card>
                    <VStack gap={2}>
                      <Heading level={3}>Owner and staff</Heading>
                      <Text color="secondary">Sign in as owner (98480 11001), counter staff (98480 11002) or rider (98480 11003).</Text>
                      <Button label="Open staff app" variant="primary" href="/login" />
                    </VStack>
                  </Card>
                  <Card>
                    <VStack gap={2}>
                      <Heading level={3}>Customer: book a pickup</Heading>
                      <Text color="secondary">What a customer sees after scanning the shop QR on a flyer or counter.</Text>
                      {shopToken ? <Button label="Open booking page" href={`/s/${shopToken}`} /> : <Text>Start the app once to seed demo data.</Text>}
                    </VStack>
                  </Card>
                  <Card>
                    <VStack gap={2}>
                      <Heading level={3}>Customer: track an order</Heading>
                      <Text color="secondary">The page behind the WhatsApp link and every garment tag QR: stages, photos, bill and UPI pay.</Text>
                      {trackToken ? <Button label="Open tracking page" href={`/o/${trackToken}`} /> : <Text>No sample order yet.</Text>}
                    </VStack>
                  </Card>
                </Grid>
              </VStack>
            </Section>

            <VStack gap={4}>
              <Heading level={2} id="pricing">
                Pricing
              </Heading>
              <Grid columns={{ minWidth: 240, max: 3, repeat: 'fit' }} gap={4}>
                {PLANS.map((p) => (
                  <Card key={p.name}>
                    <VStack gap={2}>
                      <Heading level={3}>{p.name}</Heading>
                      <Text weight="bold" size="xl">
                        {p.price}
                      </Text>
                      <Text color="secondary">{p.detail}</Text>
                    </VStack>
                  </Card>
                ))}
              </Grid>
              <Text type="supporting" color="secondary">
                Annual plans get two months free. QR tag rolls, thermal printers and WhatsApp message top-ups are add-ons.
              </Text>
            </VStack>

            <Divider />
            <VStack gap={2}>
              <Text>
                Questions: <Link href="mailto:washtrack@craftlayer.store">washtrack@craftlayer.store</Link> · General: <Link href="mailto:hello@craftlayer.store">hello@craftlayer.store</Link> · Commercial licences:{' '}
                <Link href="mailto:licensing@craftlayer.store">licensing@craftlayer.store</Link>
              </Text>
              <Text type="supporting" color="secondary">
                WashTrack is an MVP by <Link href="https://craftlayer.store">CraftLayer Studio</Link>. Source-available under the PolyForm Noncommercial License 1.0.0. The demo business and its data are fictional.
              </Text>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
