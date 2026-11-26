import { assertPaise, type Paise } from "./money";

export const SERVICES = ["dry_clean", "wash_fold", "wash_iron", "press", "shoe_care", "bag_care"] as const;
export type Service = (typeof SERVICES)[number];
export const SERVICE_LABEL: Record<Service, string> = {
  dry_clean: "Dry clean",
  wash_fold: "Wash & fold",
  wash_iron: "Wash & iron",
  press: "Steam press",
  shoe_care: "Shoe care",
  bag_care: "Bag care",
};

export const UNITS = ["piece", "kg", "pair"] as const;
export type Unit = (typeof UNITS)[number];

export interface PriceItem {
  id: string;
  name: string;
  service: Service;
  unit: Unit;
  price: Paise;
  /** Express price per unit; when absent, express adds EXPRESS_SURCHARGE_PERCENT. */
  expressPrice: Paise | null;
}

export const EXPRESS_SURCHARGE_PERCENT = 50;
export const MAX_QTY = 50;
export const MAX_GRAMS = 30_000;

/** One requested line. For kg items `quantity` is grams; otherwise it is a count of pieces/pairs. */
export interface LineRequest {
  priceItemId: string;
  quantity: number;
}

export interface PricedLine {
  priceItemId: string;
  name: string;
  service: Service;
  unit: Unit;
  quantity: number;
  unitPrice: Paise;
  amount: Paise;
  /** How many tags this line needs: one per piece/pair; one bag tag for a kg load. */
  tags: number;
}

export class PricingError extends Error {}

export function unitPrice(item: PriceItem, express: boolean): Paise {
  if (!express) return item.price;
  return item.expressPrice ?? Math.round((item.price * (100 + EXPRESS_SURCHARGE_PERCENT)) / 100);
}

export function priceLine(item: PriceItem, quantity: number, express: boolean): PricedLine {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new PricingError(`Quantity for ${item.name} must be a whole number above 0`);
  const isKg = item.unit === "kg";
  if (isKg && quantity > MAX_GRAMS) throw new PricingError(`${item.name}: at most ${MAX_GRAMS / 1000} kg per line`);
  if (!isKg && quantity > MAX_QTY) throw new PricingError(`${item.name}: at most ${MAX_QTY} per line`);
  const price = unitPrice(item, express);
  const amount = isKg ? Math.round((price * quantity) / 1000) : price * quantity;
  return {
    priceItemId: item.id,
    name: item.name,
    service: item.service,
    unit: item.unit,
    quantity,
    unitPrice: price,
    amount,
    tags: isKg ? 1 : quantity,
  };
}

export interface PlanBalance {
  kind: "pieces" | "kg";
  /** Pieces left, or grams left for kg plans. */
  balance: number;
}

export interface Bill {
  lines: PricedLine[];
  subtotal: Paise;
  planCovered: Paise;
  /** Plan units used: pieces or grams. */
  planUnitsUsed: number;
  discount: Paise;
  total: Paise;
}

/**
 * Price an order on the server from the price list. Client totals are never trusted.
 * A plan balance covers matching lines first (pieces plans cover per-piece wash/press lines,
 * kg plans cover per-kg lines); the discount applies to what is left.
 */
export function buildBill(
  catalog: readonly PriceItem[],
  requests: readonly LineRequest[],
  opts: { express: boolean; discount?: Paise; plan?: PlanBalance | null },
): Bill {
  if (requests.length === 0) throw new PricingError("Add at least one item");
  const byId = new Map(catalog.map((i) => [i.id, i]));
  const lines = requests.map((r) => {
    const item = byId.get(r.priceItemId);
    if (!item) throw new PricingError("Unknown price list item");
    return priceLine(item, r.quantity, opts.express);
  });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  let planCovered = 0;
  let planUnitsUsed = 0;
  if (opts.plan && opts.plan.balance > 0) {
    let left = opts.plan.balance;
    for (const line of lines) {
      if (left <= 0) break;
      const eligible =
        opts.plan.kind === "kg"
          ? line.unit === "kg"
          : line.unit === "piece" && (line.service === "wash_iron" || line.service === "press" || line.service === "wash_fold");
      if (!eligible) continue;
      const use = Math.min(left, line.quantity);
      left -= use;
      planUnitsUsed += use;
      planCovered += line.unit === "kg" ? Math.round((line.unitPrice * use) / 1000) : line.unitPrice * use;
    }
  }

  const discount = opts.discount ?? 0;
  assertPaise(discount, "discount");
  const afterPlan = subtotal - planCovered;
  if (discount > afterPlan) throw new PricingError("Discount cannot exceed the bill");
  return { lines, subtotal, planCovered, planUnitsUsed, discount, total: afterPlan - discount };
}

export function formatQuantity(unit: Unit, quantity: number): string {
  if (unit === "kg") return `${(quantity / 1000).toFixed(quantity % 1000 === 0 ? 0 : 1)} kg`;
  return unit === "pair" ? `${quantity} pair${quantity === 1 ? "" : "s"}` : `${quantity} pc${quantity === 1 ? "" : "s"}`;
}
