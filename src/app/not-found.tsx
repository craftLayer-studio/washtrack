'use client';

import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';

export default function NotFound() {
  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <EmptyState title="Not found" description="This link may be mistyped or the order no longer exists." actions={<Button label="Go to WashTrack" href="/" />} />
    </Center>
  );
}
