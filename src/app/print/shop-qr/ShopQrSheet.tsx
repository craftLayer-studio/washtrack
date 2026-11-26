'use client';

import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { PrintSheet } from '@/components/PrintSheet';

export function ShopQrSheet({ name, address, url, qr, isDemo }: { name: string; address: string; url: string; qr: string; isDemo: boolean }) {
  return (
    <PrintSheet heading="Shop QR sheet" note="Two posters per page: counter and flyer. Customers scan to book a pickup." isDemo={isDemo}>
      <Grid columns={{ minWidth: 300, max: 2, repeat: 'fit' }} gap={4}>
        {[0, 1].map((n) => (
          <Card key={n} padding={6} className="wt-tag">
            <Center axis="horizontal">
              <VStack gap={3} hAlign="center">
                <Heading level={2}>{name}</Heading>
                <Text weight="semibold">Scan to book a free pickup</Text>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="wt-qr-lg" src={qr} alt="QR code to book a pickup" />
                <Text type="supporting">Every garment QR-tagged · WhatsApp updates · Pay by UPI</Text>
                <Text type="supporting" color="secondary">
                  {address}
                </Text>
                <Text type="code" size="sm">
                  {url}
                </Text>
              </VStack>
            </Center>
          </Card>
        ))}
      </Grid>
    </PrintSheet>
  );
}
