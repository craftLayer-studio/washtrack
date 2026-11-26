import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { BadRequest, handle, int, readBody } from "@/server/http";
import { updatePriceItem } from "@/server/store/settings";

export async function POST(request: Request, ctx: { params: Promise<{ itemId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const { itemId } = await ctx.params;
    const body = await readBody(request);
    if (typeof body.active !== "boolean") throw new BadRequest("active must be true or false");
    await updatePriceItem(await getDb(), actor.orgId, itemId, {
      price: int(body, "price", 1, 10_000_000),
      expressPrice: body.expressPrice == null ? null : int(body, "expressPrice", 1, 10_000_000),
      active: body.active,
    });
    return { ok: true };
  });
}
