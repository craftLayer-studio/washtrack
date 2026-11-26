import { assertPaise, type Paise } from "./money";

export const PAYMENT_METHODS = ["upi", "cash", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = "paid" | "partial" | "unpaid";

export function balanceDue(total: Paise, paid: Paise): Paise {
  return Math.max(0, total - paid);
}

export function paymentStatus(total: Paise, paid: Paise): PaymentStatus {
  if (paid >= total) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

/** Validate a payment against the balance due; overpaying is refused. */
export function assertPayment(total: Paise, paid: Paise, amount: Paise): void {
  assertPaise(amount, "amount");
  if (amount === 0) throw new Error("Amount must be more than ₹0");
  if (amount > balanceDue(total, paid)) throw new Error("Amount is more than the balance due");
}
