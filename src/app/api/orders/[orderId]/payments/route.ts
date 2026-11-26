import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, int, oneOf, optStr, readBody } from "@/server/http";
import { recordPayment } from "@/server/store/orders";
import { PAYMENT_METHODS } from "@/domain";

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { orderId } = await ctx.params;
    const body = await readBody(request);
    return recordPayment(await getDb(), actor.orgId, actor.staffId, orderId, oneOf(body, "method", PAYMENT_METHODS), int(body, "amount", 1, 10_000_000), optStr(body, "reference", 60) ?? "");
  });
}
