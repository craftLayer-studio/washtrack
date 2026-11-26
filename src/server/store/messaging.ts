import { and, desc, eq } from "drizzle-orm";
import { currentConsent, renderMessage, templatePurpose, type MessageContext, type TemplateId } from "@/domain";
import { consentRecords, outbox } from "../db/schema";
import { newId } from "./ids";

import type { Tx } from "./tx";

export interface OutgoingMessage {
  orgId: string;
  customerId: string | null;
  to: string;
  template: string;
  purpose: "service_updates" | "marketing" | "auth";
  body: string;
  campaignId?: string;
  orderId?: string;
}

/**
 * WhatsApp/SMS adapter. The only implementation in this MVP is `simulated`, which writes to the
 * outbox table shown in the app. A real BSP adapter would implement the same interface.
 */
export interface MessageAdapter {
  readonly name: string;
  send(tx: Tx, msg: OutgoingMessage, channel: "whatsapp" | "sms"): Promise<void>;
}

export const simulatedAdapter: MessageAdapter = {
  name: "simulated",
  async send(tx, msg, channel) {
    await tx.insert(outbox).values({
      id: newId("msg"),
      orgId: msg.orgId,
      customerId: msg.customerId,
      channel,
      toAddress: msg.to,
      template: msg.template,
      purpose: msg.purpose,
      body: msg.body,
      status: "simulated_sent",
      campaignId: msg.campaignId ?? null,
      orderId: msg.orderId ?? null,
    });
  },
};

export function messageAdapter(): MessageAdapter {
  return simulatedAdapter;
}

export async function consentFor(tx: Tx, orgId: string, customerId: string) {
  const rows = await tx
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), eq(consentRecords.customerId, customerId)))
    .orderBy(desc(consentRecords.createdAt));
  return currentConsent(rows.map((r) => ({ purpose: r.purpose, granted: r.granted, at: r.createdAt.getTime() })));
}

/**
 * Send a templated WhatsApp message if the customer has consented to its purpose.
 * Without consent nothing is sent; a `blocked_no_consent` row is kept so staff can see why.
 */
export async function notifyCustomer(
  tx: Tx,
  args: { orgId: string; customer: { id: string; phone: string; name: string }; template: TemplateId; ctx: MessageContext; orderId?: string; campaignId?: string },
): Promise<"sent" | "blocked"> {
  const purpose = templatePurpose(args.template);
  const consent = await consentFor(tx, args.orgId, args.customer.id);
  const body = renderMessage(args.template, args.ctx);
  if (!consent[purpose]) {
    await tx.insert(outbox).values({
      id: newId("msg"),
      orgId: args.orgId,
      customerId: args.customer.id,
      channel: "whatsapp",
      toAddress: args.customer.phone,
      template: args.template,
      purpose,
      body,
      status: "blocked_no_consent",
      campaignId: args.campaignId ?? null,
      orderId: args.orderId ?? null,
    });
    return "blocked";
  }
  await messageAdapter().send(
    tx,
    { orgId: args.orgId, customerId: args.customer.id, to: args.customer.phone, template: args.template, purpose, body, orderId: args.orderId, campaignId: args.campaignId },
    "whatsapp",
  );
  return "sent";
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3147").replace(/\/$/, "");
}

export function trackUrl(token: string): string {
  return `${appUrl()}/o/${token}`;
}
