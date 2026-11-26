import { describe, expect, it } from "vitest";
import { assertTransition, becameReady, isOverdue, nextStage, rollUpStage } from "./stages";

describe("stages", () => {
  it("moves one step per scan", () => {
    expect(nextStage("received")).toBe("washing");
    expect(nextStage("ready")).toBe("delivered");
    expect(nextStage("delivered")).toBeNull();
  });

  it("only moves forward, and only ready items are delivered", () => {
    expect(() => assertTransition("washing", "received")).toThrow(/forward/);
    expect(() => assertTransition("washing", "washing")).toThrow();
    expect(() => assertTransition("washing", "ready")).not.toThrow();
    expect(() => assertTransition("ironing", "delivered")).toThrow(/ready/);
    expect(() => assertTransition("ready", "delivered")).not.toThrow();
  });

  it("rolls the order up to its least advanced item", () => {
    expect(rollUpStage(["ready", "washing", "ironing"])).toBe("washing");
    expect(rollUpStage(["ready", "ready"])).toBe("ready");
    expect(rollUpStage([])).toBe("received");
  });

  it("detects the moment an order becomes ready", () => {
    expect(becameReady(["ready", "ironing"], ["ready", "ready"])).toBe(true);
    expect(becameReady(["ready", "ready"], ["ready", "delivered"])).toBe(false);
    expect(becameReady(["washing", "ironing"], ["washing", "ready"])).toBe(false);
  });

  it("flags overdue orders that are not ready", () => {
    expect(isOverdue("ironing", 1000, 2000)).toBe(true);
    expect(isOverdue("ready", 1000, 2000)).toBe(false);
    expect(isOverdue("washing", 3000, 2000)).toBe(false);
  });
});
