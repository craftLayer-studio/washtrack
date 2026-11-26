import { StoreError } from "@/server/store/errors";
import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody } from "@/server/http";
import { advanceOrder } from "@/server/store/orders";
import { STAGES } from "@/domain";

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { orderId } = await ctx.params;
    const body = await readBody(request);
    const stage = oneOf(body, "stage", STAGES);
    if (actor.role === "rider" && stage !== "delivered") throw new StoreError(403, "Riders can only hand over orders");
    return advanceOrder(await getDb(), actor.orgId, actor.staffId, orderId, stage);
  });
}
