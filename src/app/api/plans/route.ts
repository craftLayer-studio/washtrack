import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, int, oneOf, readBody, str } from "@/server/http";
import { createPlan } from "@/server/store/plans";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const body = await readBody(request);
    return createPlan(await getDb(), actor.orgId, {
      name: str(body, "name", 60),
      kind: oneOf(body, "kind", ["pieces", "kg"] as const),
      quota: int(body, "quota", 1, 1_000_000),
      price: int(body, "price", 1, 10_000_000),
      periodDays: int(body, "periodDays", 7, 92),
    });
  });
}
