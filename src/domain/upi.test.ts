import { describe, expect, it } from "vitest";
import { buildUpiUri, isValidVpa } from "./upi";

describe("UPI intent", () => {
  it("builds a upi://pay link with amount in rupees", () => {
    const uri = buildUpiUri({ vpa: "demo.kitchen@okdemo", payeeName: "Juniper Kitchen", amount: 58590, note: "Table T3" });
    expect(uri.startsWith("upi://pay?")).toBe(true);
    const params = new URLSearchParams(uri.slice("upi://pay?".length));
    expect(params.get("pa")).toBe("demo.kitchen@okdemo");
    expect(params.get("pn")).toBe("Juniper Kitchen");
    expect(params.get("am")).toBe("585.90");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("Table T3");
    expect(uri).not.toContain("+");
  });

  it("validates VPAs and amounts", () => {
    expect(isValidVpa("name@bank")).toBe(true);
    expect(isValidVpa("no-at-sign")).toBe(false);
    expect(() => buildUpiUri({ vpa: "bad", payeeName: "x", amount: 100 })).toThrow();
    expect(() => buildUpiUri({ vpa: "a.b@bank", payeeName: "x", amount: 0 })).toThrow();
  });
});
