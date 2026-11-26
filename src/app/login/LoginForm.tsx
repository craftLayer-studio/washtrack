'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { api, errorMessage } from '@/lib/api';


const DEMO_USERS = [
  { label: 'Owner (Imran)', phone: '98480 11001' },
  { label: 'Counter (Lakshmi)', phone: '98480 11002' },
  { label: 'Rider (Ravi)', phone: '98480 11003' },
];

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const sendCode = async (value = phone) => {
    setError('');
    try {
      const r = await api<{ demoCode: string | null }>('/api/auth/otp', { phone: value });
      setPhone(value);
      setDemoCode(r.demoCode);
      setCode('');
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const verify = async () => {
    setError('');
    try {
      const r = await api<{ role: string }>('/api/auth/verify', { phone, code });
      const safeNext = next && next.startsWith('/app') ? next : r.role === 'owner' ? '/app/dashboard' : r.role === 'rider' ? '/app/routes' : '/app';
      router.push(safeNext);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Center role="main" axis="both" padding={6} minHeight="100dvh">
      <VStack gap={4} hAlign="center" width="100%" maxWidth={420}>
        <VStack gap={2} hAlign="center">
          <Icon icon={SparklesIcon} size="lg" color="accent" />
          <Text weight="bold" size="lg">
            WashTrack
          </Text>
        </VStack>
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1}>
                Staff sign-in
              </Heading>
              <Text color="secondary" size="sm">
                {step === 'phone' ? 'We send a one-time code to your phone.' : `Enter the 6-digit code sent to ${phone}.`}
              </Text>
            </VStack>
            {error ? <Banner status="error" title={error} /> : null}
            {step === 'phone' ? (
              <>
                <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="98765 43210" size="lg" onEnter={() => sendCode()} />
                <Button label="Send code" variant="primary" size="lg" clickAction={() => sendCode()} />
                <Divider label="Demo accounts" />
                <VStack gap={2}>
                  {DEMO_USERS.map((u) => (
                    <Button key={u.phone} label={`${u.label}: ${u.phone}`} clickAction={() => sendCode(u.phone)} />
                  ))}
                </VStack>
              </>
            ) : (
              <>
                {demoCode ? (
                  <Banner status="info" title={`Demo code: ${demoCode}`} description="Shown because SMS is simulated in this demo. A live shop gets it by SMS only." />
                ) : (
                  <Banner status="info" title="If this number belongs to a team member, a code has been sent." />
                )}
                <TextInput label="Code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} size="lg" onEnter={verify} />
                <Button label="Sign in" variant="primary" size="lg" clickAction={verify} />
                <HStack hAlign="between">
                  <Button label="Change number" variant="ghost" onClick={() => setStep('phone')} />
                  {demoCode ? <Button label="Use demo code" variant="ghost" onClick={() => setCode(demoCode)} /> : null}
                </HStack>
              </>
            )}
          </VStack>
        </Card>
        <Link href="/">Back to WashTrack home</Link>
      </VStack>
    </Center>
  );
}
