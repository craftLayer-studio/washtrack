import { describe, expect, it } from "vitest";
import { formatINR, percentOf, rupees } from "./money";

describe("money", () => {
  it("converts rupees to integer paise", () => {
    expect(rupees(12.34)).toBe(1234);
    expect(rupees(0.1 + 0.2)).toBe(30);
  });

  it("rounds percentages to the paisa", () => {
    expect(percentOf(10001, 5)).toBe(500);
    expect(percentOf(10010, 5)).toBe(501);
    expect(() => percentOf(100, -1)).toThrow();
  });

  it("formats INR with Indian grouping", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(50000)).toBe("₹500");
    expect(formatINR(123456)).toBe("₹1,234.56");
    expect(formatINR(1234567800)).toBe("₹1,23,45,678");
    expect(formatINR(105)).toBe("₹1.05");
  });
});
