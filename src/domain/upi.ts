import { assertPaise, type Paise } from "./money";

const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa);
}

/**
 * Build a UPI deep link (NPCI "upi://pay" intent). Opening it on a phone hands the payment to any
 * installed UPI app; the same string can be rendered as a QR code. This does not confirm payment:
 * confirmation needs a payment gateway webhook or a manual check by staff (see PLAN.md).
 */
export function buildUpiUri(params: {
  vpa: string;
  payeeName: string;
  amount: Paise;
  note?: string;
  reference?: string;
}): string {
  if (!isValidVpa(params.vpa)) throw new Error(`Invalid UPI ID: ${params.vpa}`);
  assertPaise(params.amount);
  if (params.amount === 0) throw new Error("UPI amount must be greater than zero");
  const query = new URLSearchParams({
    pa: params.vpa,
    pn: params.payeeName,
    am: (params.amount / 100).toFixed(2),
    cu: "INR",
  });
  if (params.note) query.set("tn", params.note.slice(0, 80));
  if (params.reference) query.set("tr", params.reference.slice(0, 35));
  return `upi://pay?${query.toString().replace(/\+/g, "%20")}`;
}
