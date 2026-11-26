'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { nextStage, STAGE_LABEL, STAGES, stageIndex, type Stage } from '@/domain';
import { PageFrame } from '@/components/PageFrame';
import { StageToken } from '@/components/bits';
import { api, errorMessage } from '@/lib/api';

type TagInfo = {
  item: { id: string; name: string; tagCode: string; stage: Stage; damageNote: string; seq: number };
  order: { id: string; code: string; dueAt: number; express: boolean };
  customerName: string;
  siblings: { id: string; name: string; stage: Stage; tagCode: string; seq: number }[];
};

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Pull the tag code out of a scanned QR (".../tag/ABCDEFGHJK") or a typed code. */
function tagFrom(raw: string): string {
  const m = /\/tag\/([A-Za-z0-9]{10})/.exec(raw);
  return (m ? m[1] : raw).trim().toUpperCase();
}

export function Scanner({ initialTag, canUpdate }: { initialTag: string; canUpdate: boolean }) {
  const [code, setCode] = useState(initialTag);
  const [info, setInfo] = useState<TagInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const lookup = useCallback(async (tag: string) => {
    setError(null);
    setNotice(null);
    try {
      setInfo(await api<TagInfo>(`/api/scan?tag=${encodeURIComponent(tag)}`));
    } catch (e) {
      setInfo(null);
      setError(errorMessage(e));
    }
  }, []);

  const move = useCallback(
    async (tag: string, stage?: Stage) => {
      setError(null);
      try {
        const r = await api<{ item: { stage: Stage; name: string }; stage: Stage; becameReady: boolean; delivered: boolean; message: string | null }>('/api/scan', { tag, stage });
        setNotice(
          `${r.item.name} → ${STAGE_LABEL[r.item.stage]}.` +
            (r.becameReady ? ` Whole order is ready: pickup alert ${r.message === 'sent' ? 'sent on WhatsApp' : 'not sent (no consent)'}.` : '') +
            (r.delivered ? ' Order handed over.' : ''),
        );
        const fresh = await api<TagInfo>(`/api/scan?tag=${encodeURIComponent(tag)}`);
        setInfo(fresh);
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [],
  );

  const handleCode = useCallback(
    async (raw: string) => {
      const tag = tagFrom(raw);
      if (!tag) return;
      setCode(tag);
      if (auto && canUpdate) await move(tag);
      else await lookup(tag);
    },
    [auto, canUpdate, lookup, move],
  );

  useEffect(() => {
    if (!initialTag) return;
    let live = true;
    api<TagInfo>(`/api/scan?tag=${encodeURIComponent(initialTag)}`)
      .then((r) => live && setInfo(r))
      .catch((e) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [initialTag]);

  useEffect(() => {
    if (!camera) return;
    const Ctor = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Ctor) return;
    const detector = new Ctor({ formats: ['qr_code'] });
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        void video.play();
        timer = setInterval(async () => {
          try {
            const found = await detector.detect(video);
            const raw = found[0]?.rawValue;
            if (!raw) return;
            const tag = tagFrom(raw);
            const now = Date.now();
            if (tag === lastScan.current.code && now - lastScan.current.at < 3000) return;
            lastScan.current = { code: tag, at: now };
            await handleCode(raw);
          } catch {
            /* keep scanning */
          }
        }, 500);
      })
      .catch(() => {
        setError('Camera permission was refused.');
        setCamera(false);
      });
    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, handleCode]);

  const next = info ? nextStage(info.item.stage) : null;

  return (
    <PageFrame title="Scan tag" subtitle="Scan the QR on a garment tag (or type its code) to move it to the next stage." width={720}>
      {notice ? <Banner status="success" title={notice} /> : null}
      {error ? <Banner status="error" title={error} /> : null}
      <Card>
        <VStack gap={3}>
          <HStack gap={2} vAlign="end" wrap="wrap">
            <TextInput label="Tag code" value={code} onChange={(v) => setCode(v.toUpperCase())} onEnter={() => handleCode(code)} placeholder="e.g. 7KQ2M9XRTA" autoCapitalize="characters" />
            <Button label={auto && canUpdate ? 'Scan & advance' : 'Look up'} variant="primary" clickAction={() => handleCode(code)} />
            <Button
              label={camera ? 'Stop camera' : 'Use camera'}
              onClick={() => {
                if (!camera && !('BarcodeDetector' in globalThis)) {
                  setError('This browser cannot read QR codes from the camera. Type the 10-letter tag code, or open the tag QR with the phone camera app.');
                  return;
                }
                setCamera((c) => !c);
              }}
            />
          </HStack>
          {canUpdate ? <Switch label="Advance automatically on every scan (workshop mode)" value={auto} onChange={setAuto} /> : null}
          {camera ? (
            <video ref={videoRef} className="wt-qr-lg" muted playsInline aria-label="Camera preview for QR scanning" />
          ) : null}
        </VStack>
      </Card>

      {info ? (
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>
              #{info.item.seq} {info.item.name}
            </Heading>
            <Text color="secondary">
              <Link href={`/app/orders/${info.order.id}`}>Order {info.order.code}</Link> · {info.customerName}
              {info.order.express ? ' · Express' : ''}
            </Text>
            {info.item.damageNote ? <Text>Condition at intake: {info.item.damageNote}</Text> : null}
          </VStack>
          <HStack gap={2} vAlign="center">
            <Text>Now:</Text>
            <StageToken stage={info.item.stage} />
          </HStack>
          {canUpdate && next ? (
            <HStack gap={2} wrap="wrap">
              <Button size="lg" variant="primary" label={`Move to ${STAGE_LABEL[next]}`} clickAction={() => move(info.item.tagCode, next)} />
              {STAGES.filter((s) => stageIndex(s) > stageIndex(next) && s !== 'delivered').map((s) => (
                <Button key={s} label={`Skip to ${STAGE_LABEL[s]}`} clickAction={() => move(info.item.tagCode, s)} />
              ))}
            </HStack>
          ) : null}
          <VStack gap={2}>
            <Heading level={3}>Other items in this order</Heading>
            <List hasDividers density="compact">
              {info.siblings.map((s) => (
                <ListItem key={s.id} label={`#${s.seq} ${s.name}`} description={`Tag ${s.tagCode}`} isSelected={s.tagCode === info.item.tagCode} endContent={<StageToken stage={s.stage} />} />
              ))}
            </List>
          </VStack>
        </VStack>
      ) : null}
    </PageFrame>
  );
}
