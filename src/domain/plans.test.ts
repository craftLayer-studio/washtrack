import { describe, expect, it } from "vitest";
import { deduct, describeQuota, isActive, pricePerUnit, renewsAt } from "./plans";

describe("plans", () => {
  it("describes quota and unit price", () => {
    expect(describeQuota("kg", 30000)).toBe("30 kg");
    expect(describeQuota("pieces", 60)).toBe("60 pieces");
    expect(pricePerUnit({ kind: "kg", quota: 30000, price: 199900, periodDays: 30 })).toBe(6663);
    expect(pricePerUnit({ kind: "pieces", quota: 60, price: 99900, periodDays: 30 })).toBe(1665);
  });

  it("renews and deducts", () => {
    expect(renewsAt(0, 30)).toBe(30 * 86_400_000);
    expect(isActive(100, 50)).toBe(true);
    expect(isActive(100, 150)).toBe(false);
    expect(deduct(10, 3)).toBe(7);
    expect(() => deduct(2, 3)).toThrow();
  });
});
