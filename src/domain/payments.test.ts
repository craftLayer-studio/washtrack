import { describe, expect, it } from "vitest";
import { assertPayment, balanceDue, paymentStatus } from "./payments";

describe("payments", () => {
  it("computes balance and status", () => {
    expect(balanceDue(10000, 4000)).toBe(6000);
    expect(balanceDue(10000, 12000)).toBe(0);
    expect(paymentStatus(10000, 0)).toBe("unpaid");
    expect(paymentStatus(10000, 1)).toBe("partial");
    expect(paymentStatus(10000, 10000)).toBe("paid");
    expect(paymentStatus(0, 0)).toBe("paid");
  });

  it("refuses zero, fractional and over-payments", () => {
    expect(() => assertPayment(10000, 0, 0)).toThrow();
    expect(() => assertPayment(10000, 0, 10.5)).toThrow();
    expect(() => assertPayment(10000, 6000, 5000)).toThrow(/balance/);
    expect(() => assertPayment(10000, 6000, 4000)).not.toThrow();
  });
});
