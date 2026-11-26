import type { Paise } from "./money";

export type PlanKind = "pieces" | "kg";

export interface PlanLike {
  kind: PlanKind;
  /** Pieces, or grams for kg plans. */
  quota: number;
  price: Paise;
  periodDays: number;
}

export function describeQuota(kind: PlanKind, units: number): string {
  return kind === "kg" ? `${(units / 1000).toFixed(units % 1000 === 0 ? 0 : 1)} kg` : `${units} pieces`;
}

/** Effective price per unit (per piece or per kg) in paise, for the plan card. */
export function pricePerUnit(plan: PlanLike): Paise {
  return plan.kind === "kg" ? Math.round((plan.price * 1000) / plan.quota) : Math.round(plan.price / plan.quota);
}

const DAY_MS = 86_400_000;

export function renewsAt(startMs: number, periodDays: number): number {
  return startMs + periodDays * DAY_MS;
}

export function isActive(renewsAtMs: number, now: number): boolean {
  return renewsAtMs > now;
}

/** Deduct used units from the balance; never below zero. */
export function deduct(balance: number, used: number): number {
  if (!Number.isInteger(used) || used < 0) throw new Error("used must be a non-negative integer");
  if (used > balance) throw new Error("Plan balance is too low");
  return balance - used;
}
