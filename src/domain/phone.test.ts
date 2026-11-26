import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizeIndianPhone } from "./phone";

describe("phone", () => {
  it("normalises Indian mobile numbers to E.164", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5876543210")).toBeNull();
    expect(normalizeIndianPhone("+1 415 555 0100")).toBeNull();
  });

  it("formats and masks", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(maskPhone("+919876543210")).toBe("+91 ••••• •3210");
  });
});
