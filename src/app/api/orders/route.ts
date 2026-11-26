import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { BadRequest, bool, handle, int, oneOf, optStr, readBody, str } from "@/server/http";
import { createOrder } from "@/server/store/orders";

/** Counter intake. Prices are computed on the server from the price list. */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const body = await readBody(request);
    const c = body.customer;
    if (typeof c !== "object" || c === null) throw new BadRequest("customer is required");
    const customer = c as Record<string, unknown>;
    if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 40) throw new BadRequest("Add 1 to 40 lines");
    const lines = body.lines.map((l, i) => {
      if (typeof l !== "object" || l === null) throw new BadRequest(`line ${i + 1} is invalid`);
      const line = l as Record<string, unknown>;
      return { priceItemId: str(line, "priceItemId", 64), quantity: int(line, "quantity", 1, 30_000) };
    });
    const result = await createOrder(await getDb(), actor.orgId, actor.staffId, {
      customer: { phone: str(customer, "phone", 20), name: str(customer, "name", 80), address: optStr(customer, "address", 300), area: optStr(customer, "area", 80), preferences: optStr(customer, "preferences", 200) },
      consent: { serviceUpdates: bool(body, "serviceUpdates"), marketing: bool(body, "marketing") },
      lines,
      express: bool(body, "express"),
      discount: body.discount === undefined ? 0 : int(body, "discount", 0, 10_000_000),
      usePlan: bool(body, "usePlan"),
      deliveryMode: oneOf(body, "deliveryMode", ["collect", "delivery"] as const),
      note: optStr(body, "note", 300),
    });
    return { orderId: result.order.id, code: result.order.code, message: result.message };
  });
}
