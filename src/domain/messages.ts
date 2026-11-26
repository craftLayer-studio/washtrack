import type { ConsentPurpose } from "./consent";
import { formatINR, type Paise } from "./money";

/** WhatsApp templates. Utility templates need service-update consent; marketing needs marketing consent. */
export const TEMPLATES = {
  order_received: "service_updates",
  order_ready: "service_updates",
  out_for_delivery: "service_updates",
  order_delivered: "service_updates",
  payment_received: "service_updates",
  pickup_scheduled: "service_updates",
  ready_reminder: "service_updates",
  winback_offer: "marketing",
  plan_offer: "marketing",
} as const satisfies Record<string, ConsentPurpose>;
export type TemplateId = keyof typeof TEMPLATES;

export function templatePurpose(id: TemplateId): ConsentPurpose {
  return TEMPLATES[id];
}

export interface MessageContext {
  shopName: string;
  customerName: string;
  orderCode?: string;
  itemCount?: number;
  total?: Paise;
  due?: Paise;
  readyBy?: string;
  trackUrl?: string;
  payUrl?: string;
  slot?: string;
  offer?: string;
}

const STOP_LINE = "Reply STOP to opt out.";

/** Render a template into the plain-text WhatsApp body (simulated send). */
export function renderMessage(id: TemplateId, c: MessageContext): string {
  const hi = `Hi ${c.customerName.split(" ")[0]},`;
  const track = c.trackUrl ? ` Track: ${c.trackUrl}` : "";
  const pay = c.due && c.due > 0 && c.payUrl ? ` Pay ${formatINR(c.due)}: ${c.payUrl}` : "";
  switch (id) {
    case "order_received":
      return `${hi} we received ${c.itemCount} item${c.itemCount === 1 ? "" : "s"} at ${c.shopName} (order ${c.orderCode}). Bill ${formatINR(c.total ?? 0)}, ready by ${c.readyBy}. Photos and bill:${track}${pay} ${STOP_LINE}`;
    case "order_ready":
      return `${hi} your order ${c.orderCode} at ${c.shopName} is ready for pickup.${pay}${track} Reply 1 for home delivery. ${STOP_LINE}`;
    case "ready_reminder":
      return `${hi} a reminder that order ${c.orderCode} is ready and waiting at ${c.shopName}.${pay}${track} ${STOP_LINE}`;
    case "out_for_delivery":
      return `${hi} order ${c.orderCode} is out for delivery ${c.slot ? `(${c.slot})` : "today"}.${pay} ${STOP_LINE}`;
    case "order_delivered":
      return `${hi} order ${c.orderCode} has been handed over. Thank you for choosing ${c.shopName}! ${STOP_LINE}`;
    case "payment_received":
      return `${hi} we received ${formatINR(c.total ?? 0)} for order ${c.orderCode}. Balance due: ${formatINR(c.due ?? 0)}. ${STOP_LINE}`;
    case "pickup_scheduled":
      return `${hi} your ${c.slot} is booked with ${c.shopName}. Our rider will call before arriving. ${STOP_LINE}`;
    case "winback_offer":
      return `${hi} we miss you at ${c.shopName}! ${c.offer ?? "Get 15% off your next order this week."} ${STOP_LINE}`;
    case "plan_offer":
      return `${hi} save with a monthly plan at ${c.shopName}. ${c.offer ?? "Ask us at the counter."} ${STOP_LINE}`;
  }
}

/** wa.me click-to-chat link (free, no API). Number without "+". */
export function waMeLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}
