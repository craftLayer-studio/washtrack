import { describe, expect, it } from "vitest";
import { sortRoute } from "./route";

describe("route list", () => {
  it("orders by slot, then area, then booking time", () => {
    const sorted = sortRoute([
      { id: "a", slot: "evening", area: "Banjara Hills", createdAt: 1 },
      { id: "b", slot: "morning", area: "Madhapur", createdAt: 2 },
      { id: "c", slot: "morning", area: "Kondapur", createdAt: 3 },
      { id: "d", slot: "morning", area: "kondapur", createdAt: 1 },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["d", "c", "b", "a"]);
  });
});
