import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, istDate, istDateTime, startOfIstDay } from "./time";

describe("IST time helpers", () => {
  it("gives the IST calendar date across the UTC midnight boundary", () => {
    // 2026-11-25 20:00 UTC is 2026-11-26 01:30 IST
    expect(istDate(Date.parse("2026-11-25T20:00:00Z"))).toBe("2026-11-26");
    expect(istDate(Date.parse("2026-11-25T10:00:00Z"))).toBe("2026-11-25");
  });

  it("finds IST midnight", () => {
    expect(startOfIstDay(Date.parse("2026-11-25T10:00:00Z"))).toBe(Date.parse("2026-11-24T18:30:00Z"));
  });

  it("builds IST date-times and adds days", () => {
    expect(istDateTime("2026-11-26", 18)).toBe(Date.parse("2026-11-26T12:30:00Z"));
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
  });
});
