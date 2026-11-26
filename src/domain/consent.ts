/**
 * DPDP Act 2023 consent. Two separate purposes, both opt-in (never pre-ticked).
 * Every change writes a consent record; the latest record per purpose wins.
 */
export const CONSENT_PURPOSES = ["service_updates", "marketing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ["counter", "qr_page", "whatsapp", "staff_app"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const NOTICE_VERSION = "2026-11-v1";

export const CONSENT_TEXT: Record<ConsentPurpose, string> = {
  service_updates:
    "Send me WhatsApp updates about my orders (received, ready, out for delivery, bills and payment links).",
  marketing: "Send me offers and reminders from this shop (at most a few a month).",
};

export const PRIVACY_NOTICE =
  "We use your phone number and name only to run your orders and, if you agree, to send the messages you choose below. " +
  "You can withdraw consent at any time by replying STOP or from your order page. Data is kept while you are a customer and deleted on request.";

export interface ConsentRecordLike {
  purpose: ConsentPurpose;
  granted: boolean;
  at: number;
}

/** Current consent per purpose from a history of records (latest wins; no record = not granted). */
export function currentConsent(records: readonly ConsentRecordLike[]): Record<ConsentPurpose, boolean> {
  const result: Record<ConsentPurpose, boolean> = { service_updates: false, marketing: false };
  const latest: Partial<Record<ConsentPurpose, number>> = {};
  for (const r of records) {
    const prev = latest[r.purpose];
    if (prev === undefined || r.at >= prev) {
      latest[r.purpose] = r.at;
      result[r.purpose] = r.granted;
    }
  }
  return result;
}

/** Does an inbound reply mean "stop all messages"? */
export function isStopKeyword(text: string): boolean {
  return /^\s*(stop|unsubscribe|band karo|बंद)\s*$/i.test(text);
}
