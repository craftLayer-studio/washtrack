import { describe, expect, it } from "vitest";
import { buildDashboard, lapsedCustomers, type OrderSummary } from "./report";

const DAY = 86_400_000;
const now = 100 * DAY;
const orders: OrderSummary[] = [
  { id: "1", customerId: "a", stage: "washing", dueAt: now - 1000, createdAt: now - 2 * DAY, total: 50000, paid: 0 },
  { id: "2", customerId: "a", stage: "ready", dueAt: now - 1000, createdAt: now - 60 * DAY, total: 30000, paid: 30000 },
  { id: "3", customerId: "b", stage: "received", dueAt: now + DAY, createdAt: now - 100, total: 20000, paid: 5000 },
];

describe("dashboard", () => {
  it("counts stages, overdue, dues, revenue and repeat customers", () => {
    const d = buildDashboard(orders, [{ amount: 5000, at: now - 50 }, { amount: 30000, at: now - 10 * DAY }], now, now - 1000, now - 20 * DAY);
    expect(d.byStage.washing).toBe(1);
    expect(d.byStage.ready).toBe(1);
    expect(d.overdue).toBe(1);
    expect(d.readyNotCollected).toBe(1);
    expect(d.duesOutstanding).toBe(65000);
    expect(d.revenueToday).toBe(5000);
    expect(d.revenueMonth).toBe(35000);
    expect(d.ordersToday).toBe(1);
    expect(d.repeatCustomers).toBe(1);
    expect(d.repeatRate).toBe(50);
  });

  it("finds lapsed customers", () => {
    expect(lapsedCustomers(orders, now, 30)).toEqual([]);
    expect(lapsedCustomers(orders, now + 40 * DAY, 30).sort()).toEqual(["a", "b"]);
  });
});
