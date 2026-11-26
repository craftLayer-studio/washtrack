'use client';

import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';

export function TooMany() {
  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <EmptyState title="Too many requests" description="Please wait a minute and try again." />
    </Center>
  );
}
