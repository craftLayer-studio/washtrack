'use client';

import type { ReactNode } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export type TagCard = { code: string; qr: string; title: string; lines: string[] };

export function PrintSheet({ heading, note, isDemo, children }: { heading: string; note: string; isDemo: boolean; children: ReactNode }) {
  return (
    <Layout
      height="auto"
      content={
        <LayoutContent padding={4} label={heading}>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2} className="wt-no-print">
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Heading level={1}>{heading}</Heading>
                  {isDemo ? <Badge variant="info" label="Demo" /> : null}
                </HStack>
                <Text color="secondary">{note}</Text>
              </VStack>
              <Button label="Print" variant="primary" onClick={() => window.print()} />
            </HStack>
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export function TagGrid({ tags }: { tags: TagCard[] }) {
  return (
    <Grid columns={{ minWidth: 300, repeat: 'fill' }} gap={3}>
      {tags.map((t) => (
        <Card key={t.code} padding={3} className="wt-tag">
          <HStack gap={3} vAlign="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wt-qr-sm" src={t.qr} alt={`QR for tag ${t.code}`} />
            <VStack gap={0.5}>
              <Text weight="bold">{t.title}</Text>
              {t.lines.map((l) => (
                <Text key={l} type="supporting">
                  {l}
                </Text>
              ))}
              <Text type="code">{t.code}</Text>
            </VStack>
          </HStack>
        </Card>
      ))}
    </Grid>
  );
}
