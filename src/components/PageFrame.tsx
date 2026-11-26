'use client';

import type { ReactNode } from 'react';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';

/** Standard staff page: title row with actions, then content. */
export function PageFrame({ title, subtitle, actions, children, width }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; width?: number }) {
  return (
    <Layout
      height="fill"
      contentWidth={width}
      content={
        <LayoutContent padding={6} label={title}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
              <VStack gap={1}>
                <Heading level={1}>{title}</Heading>
                {subtitle ? <Text color="secondary">{subtitle}</Text> : null}
              </VStack>
              {actions ? <HStack gap={2} wrap="wrap">{actions}</HStack> : null}
            </HStack>
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
