import { describe, expect, it } from "vitest";
import { renderMessage, templatePurpose, waMeLink } from "./messages";

describe("messages", () => {
  it("renders the intake message with bill, link and opt-out", () => {
    const body = renderMessage("order_received", {
      shopName: "Demo Fresh Press",
      customerName: "Ananya Rao",
      orderCode: "FP-1001",
      itemCount: 3,
      total: 64000,
      due: 64000,
      readyBy: "Thu, 26 Nov",
      trackUrl: "http://x/o/abc",
      payUrl: "http://x/o/abc#pay",
    });
    expect(body).toContain("Hi Ananya,");
    expect(body).toContain("3 items");
    expect(body).toContain("₹640");
    expect(body).toContain("Reply STOP");
  });

  it("omits the pay line when nothing is due", () => {
    const body = renderMessage("order_ready", { shopName: "S", customerName: "A", orderCode: "X", due: 0, payUrl: "p" });
    expect(body).not.toContain("Pay");
  });

  it("maps templates to consent purposes", () => {
    expect(templatePurpose("order_ready")).toBe("service_updates");
    expect(templatePurpose("winback_offer")).toBe("marketing");
  });

  it("builds wa.me links", () => {
    expect(waMeLink("+919876543210", "hi there")).toBe("https://wa.me/919876543210?text=hi%20there");
  });
});
