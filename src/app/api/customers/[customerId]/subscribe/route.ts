import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody, str } from "@/server/http";
import { subscribe } from "@/server/store/plans";
import { PAYMENT_METHODS } from "@/domain";
import { plain } from "@/server/view";

export async function POST(request: Request, ctx: { params: Promise<{ customerId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const { customerId } = await ctx.params;
    const body = await readBody(request);
    return plain(await subscribe(await getDb(), actor.orgId, actor.staffId, customerId, str(body, "planId", 64), oneOf(body, "method", PAYMENT_METHODS)));
  });
}
