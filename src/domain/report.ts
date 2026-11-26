import type { Paise } from "./money";
import { isOverdue, STAGES, type Stage } from "./stages";

export interface OrderSummary {
  id: string;
  customerId: string;
  stage: Stage;
  dueAt: number;
  createdAt: number;
  total: Paise;
  paid: Paise;
}

export interface PaymentSummary {
  amount: Paise;
  at: number;
}

export interface Dashboard {
  byStage: Record<Stage, number>;
  overdue: number;
  readyNotCollected: number;
  duesOutstanding: Paise;
  revenueToday: Paise;
  revenueMonth: Paise;
  ordersToday: number;
  customers: number;
  repeatCustomers: number;
  repeatRate: number;
}

/** Owner dashboard numbers. `dayStart`/`monthStart` are IST boundaries in epoch ms. */
export function buildDashboard(
  orders: readonly OrderSummary[],
  payments: readonly PaymentSummary[],
  now: number,
  dayStart: number,
  monthStart: number,
): Dashboard {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  const perCustomer = new Map<string, number>();
  let overdue = 0;
  let dues = 0;
  let ordersToday = 0;
  for (const o of orders) {
    byStage[o.stage] += 1;
    if (isOverdue(o.stage, o.dueAt, now)) overdue += 1;
    dues += Math.max(0, o.total - o.paid);
    if (o.createdAt >= dayStart) ordersToday += 1;
    perCustomer.set(o.customerId, (perCustomer.get(o.customerId) ?? 0) + 1);
  }
  const repeatCustomers = [...perCustomer.values()].filter((n) => n >= 2).length;
  const sum = (from: number) => payments.filter((p) => p.at >= from).reduce((s, p) => s + p.amount, 0);
  return {
    byStage,
    overdue,
    readyNotCollected: byStage.ready,
    duesOutstanding: dues,
    revenueToday: sum(dayStart),
    revenueMonth: sum(monthStart),
    ordersToday,
    customers: perCustomer.size,
    repeatCustomers,
    repeatRate: perCustomer.size === 0 ? 0 : Math.round((repeatCustomers / perCustomer.size) * 100),
  };
}

/** Customers whose last order is older than `days` (win-back candidates). */
export function lapsedCustomers(orders: readonly OrderSummary[], now: number, days: number): string[] {
  const last = new Map<string, number>();
  for (const o of orders) last.set(o.customerId, Math.max(last.get(o.customerId) ?? 0, o.createdAt));
  const cutoff = now - days * 86_400_000;
  return [...last.entries()].filter(([, t]) => t < cutoff).map(([id]) => id);
}
