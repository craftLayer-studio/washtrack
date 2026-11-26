import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, readBody, str } from "@/server/http";
import { acknowledgeDamage } from "@/server/store/orders";

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { orderId } = await ctx.params;
    const body = await readBody(request);
    await acknowledgeDamage(await getDb(), actor.orgId, orderId, str(body, "name", 80));
    return { ok: true };
  });
}
