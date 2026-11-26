import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, int, oneOf, optStr, readBody, str } from "@/server/http";
import { addPriceItem } from "@/server/store/settings";
import { SERVICES, UNITS } from "@/domain";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const body = await readBody(request);
    return addPriceItem(await getDb(), actor.orgId, {
      name: str(body, "name", 60),
      category: optStr(body, "category", 40) ?? "Other",
      service: oneOf(body, "service", SERVICES),
      unit: oneOf(body, "unit", UNITS),
      price: int(body, "price", 1, 10_000_000),
      expressPrice: body.expressPrice == null ? null : int(body, "expressPrice", 1, 10_000_000),
    });
  });
}
