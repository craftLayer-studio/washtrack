import { describe, expect, it } from "vitest";
import { buildBill, formatQuantity, priceLine, type PriceItem } from "./pricing";

const catalog: PriceItem[] = [
  { id: "shirt", name: "Shirt", service: "wash_iron", unit: "piece", price: 4000, expressPrice: null },
  { id: "saree", name: "Silk saree", service: "dry_clean", unit: "piece", price: 25000, expressPrice: 35000 },
  { id: "kg", name: "Wash & fold", service: "wash_fold", unit: "kg", price: 9000, expressPrice: null },
  { id: "shoes", name: "Sneakers deep clean", service: "shoe_care", unit: "pair", price: 49900, expressPrice: null },
];

describe("pricing", () => {
  it("prices pieces, pairs and kg loads", () => {
    expect(priceLine(catalog[0], 3, false)).toMatchObject({ amount: 12000, tags: 3 });
    expect(priceLine(catalog[2], 2500, false)).toMatchObject({ amount: 22500, tags: 1 });
    expect(priceLine(catalog[3], 1, false)).toMatchObject({ amount: 49900, tags: 1 });
  });

  it("applies express prices or the default surcharge", () => {
    expect(priceLine(catalog[1], 1, true).amount).toBe(35000);
    expect(priceLine(catalog[0], 1, true).amount).toBe(6000);
  });

  it("rejects bad quantities and unknown items", () => {
    expect(() => priceLine(catalog[0], 0, false)).toThrow();
    expect(() => priceLine(catalog[0], 1.5, false)).toThrow();
    expect(() => priceLine(catalog[0], 51, false)).toThrow();
    expect(() => buildBill(catalog, [{ priceItemId: "nope", quantity: 1 }], { express: false })).toThrow(/Unknown/);
    expect(() => buildBill(catalog, [], { express: false })).toThrow();
  });

  it("totals a bill with a discount", () => {
    const bill = buildBill(
      catalog,
      [
        { priceItemId: "shirt", quantity: 2 },
        { priceItemId: "saree", quantity: 1 },
      ],
      { express: false, discount: 3000 },
    );
    expect(bill.subtotal).toBe(33000);
    expect(bill.total).toBe(30000);
    expect(() => buildBill(catalog, [{ priceItemId: "shirt", quantity: 1 }], { express: false, discount: 5000 })).toThrow();
  });

  it("lets a pieces plan cover eligible lines only, up to the balance", () => {
    const bill = buildBill(
      catalog,
      [
        { priceItemId: "saree", quantity: 1 },
        { priceItemId: "shirt", quantity: 5 },
      ],
      { express: false, plan: { kind: "pieces", balance: 3 } },
    );
    expect(bill.planUnitsUsed).toBe(3);
    expect(bill.planCovered).toBe(12000);
    expect(bill.total).toBe(25000 + 8000);
  });

  it("lets a kg plan cover kg loads", () => {
    const bill = buildBill(catalog, [{ priceItemId: "kg", quantity: 4000 }], { express: false, plan: { kind: "kg", balance: 3000 } });
    expect(bill.planUnitsUsed).toBe(3000);
    expect(bill.total).toBe(9000);
  });

  it("formats quantities", () => {
    expect(formatQuantity("kg", 2500)).toBe("2.5 kg");
    expect(formatQuantity("kg", 3000)).toBe("3 kg");
    expect(formatQuantity("piece", 1)).toBe("1 pc");
    expect(formatQuantity("pair", 2)).toBe("2 pairs");
  });
});
