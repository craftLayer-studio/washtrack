import { describe, expect, it } from "vitest";
import { currentConsent, isStopKeyword } from "./consent";

describe("consent", () => {
  it("defaults to not granted", () => {
    expect(currentConsent([])).toEqual({ service_updates: false, marketing: false });
  });

  it("uses the latest record per purpose", () => {
    const c = currentConsent([
      { purpose: "marketing", granted: true, at: 1 },
      { purpose: "service_updates", granted: true, at: 1 },
      { purpose: "marketing", granted: false, at: 5 },
    ]);
    expect(c).toEqual({ service_updates: true, marketing: false });
  });

  it("recognises STOP replies", () => {
    expect(isStopKeyword(" STOP ")).toBe(true);
    expect(isStopKeyword("stop it later")).toBe(false);
  });
});
