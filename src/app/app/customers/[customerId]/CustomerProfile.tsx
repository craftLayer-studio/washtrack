'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { CONSENT_TEXT, describeQuota, formatINR, formatIst, formatIstDate, formatPhone, waMeLink, type ConsentPurpose, type Stage } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { PayToken, StageToken } from '@/components/bits';
import { api, errorMessage } from '@/lib/api';

type Profile = {
  customer: { id: string; name: string; phone: string; address: string; area: string; preferences: string; createdAt: number };
  consent: Record<ConsentPurpose, boolean>;
  consentLog: { id: string; purpose: string; granted: boolean; channel: string; noticeVersion: string; createdAt: number }[];
  history: { id: string; code: string; stage: Stage; total: number; paid: number; createdAt: number }[];
  dues: number;
  subscription: null | { balance: number; renewsAt: number; plan: { name: string; kind: 'pieces' | 'kg'; quota: number } };
};
type Plan = { id: string; name: string; kind: 'pieces' | 'kg'; quota: number; price: number; periodDays: number };

export function CustomerProfile({ profile, plans }: { profile: Profile; plans: Plan[] }) {
  const router = useRouter();
  const c = profile.customer;
  const [name, setName] = useState(c.name);
  const [address, setAddress] = useState(c.address);
  const [area, setArea] = useState(c.area);
  const [preferences, setPreferences] = useState(c.preferences);
  const [planId, setPlanId] = useState<string | undefined>(plans[0]?.id);
  const [method, setMethod] = useState('upi');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(null);
    try {
      await fn();
      setNotice(ok);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <PageFrame title={c.name} subtitle={`${formatPhone(c.phone)} · customer since ${formatIstDate(c.createdAt)}${profile.dues ? ` · ${formatINR(profile.dues)} due` : ''}`} actions={<Button label="WhatsApp chat" href={waMeLink(c.phone, `Hi ${c.name.split(' ')[0]},`)} target="_blank" rel="noopener noreferrer" />}>
      {notice ? <Banner status="success" title={notice} isDismissable onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} /> : null}
      <Grid columns={{ minWidth: 320, max: 2, repeat: 'fit' }} gap={6}>
        <VStack gap={3}>
          <Heading level={2}>Details</Heading>
          <TextInput label="Name" value={name} onChange={setName} />
          <TextInput label="Address" value={address} onChange={setAddress} />
          <TextInput label="Area" value={area} onChange={setArea} />
          <TextInput label="Preferences" value={preferences} onChange={setPreferences} />
          <HStack>
            <Button label="Save" clickAction={() => run(() => api(`/api/customers/${c.id}`, { name, address, area, preferences }), 'Saved')} />
          </HStack>
        </VStack>
        <VStack gap={4}>
          <Card variant="muted">
            <VStack gap={3}>
              <Heading level={2}>Consent</Heading>
              {(['service_updates', 'marketing'] as const).map((p) => (
                <Switch
                  key={p}
                  label={p === 'service_updates' ? 'WhatsApp order updates' : 'Offers and reminders'}
                  description={CONSENT_TEXT[p]}
                  value={profile.consent[p]}
                  changeAction={async (v) => run(() => api(`/api/customers/${c.id}/consent`, { purpose: p, granted: v }), 'Consent updated and logged')}
                />
              ))}
              <Text type="supporting" color="secondary">
                Change only on the customer&apos;s instruction. Every change is logged.
              </Text>
              <List density="compact">
                {profile.consentLog.map((r) => (
                  <ListItem key={r.id} label={`${r.purpose === 'marketing' ? 'Offers' : 'Updates'}: ${r.granted ? 'opted in' : 'opted out'}`} description={`${formatIst(r.createdAt)} · via ${r.channel} · notice ${r.noticeVersion}`} />
                ))}
              </List>
            </VStack>
          </Card>
          <Card variant="muted">
            <VStack gap={3}>
              <Heading level={2}>Monthly plan</Heading>
              {profile.subscription ? (
                <Text>
                  {profile.subscription.plan.name}: {describeQuota(profile.subscription.plan.kind, profile.subscription.balance)} left of {describeQuota(profile.subscription.plan.kind, profile.subscription.plan.quota)}, renews {formatIstDate(profile.subscription.renewsAt)}
                </Text>
              ) : plans.length ? (
                <>
                  <HStack gap={2} vAlign="end" wrap="wrap">
                    <Selector label="Plan" value={planId} onChange={(v) => setPlanId(v)} options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${describeQuota(p.kind, p.quota)} · ${formatINR(p.price)}` }))} />
                    <Selector
                      label="Paid by"
                      value={method}
                      onChange={(v) => setMethod(v)}
                      options={[
                        { value: 'upi', label: 'UPI' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'card', label: 'Card' },
                      ]}
                    />
                  </HStack>
                  <HStack>
                    <Button label="Sell plan (payment collected)" variant="primary" isDisabled={!planId} clickAction={() => run(() => api(`/api/customers/${c.id}/subscribe`, { planId, method }), 'Plan activated')} />
                  </HStack>
                </>
              ) : (
                <Text color="secondary">No active plans. The owner can add them under Monthly plans.</Text>
              )}
            </VStack>
          </Card>
        </VStack>
      </Grid>
      <VStack gap={2}>
        <Heading level={2}>Orders</Heading>
        <List hasDividers>
          {profile.history.map((o) => (
            <ListItem
              key={o.id}
              label={<Link href={`/app/orders/${o.id}`}>{`${o.code} · ${formatINR(o.total)}`}</Link>}
              description={formatIst(o.createdAt)}
              endContent={
                <HStack gap={1}>
                  <StageToken stage={o.stage} />
                  <PayToken total={o.total} paid={o.paid} />
                </HStack>
              }
            />
          ))}
        </List>
      </VStack>
    </PageFrame>
  );
}
