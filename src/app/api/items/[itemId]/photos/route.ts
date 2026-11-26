import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, readLargeBody, str } from "@/server/http";
import { addPhoto } from "@/server/store/orders";

export async function POST(request: Request, ctx: { params: Promise<{ itemId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { itemId } = await ctx.params;
    const body = await readLargeBody(request, 700_000);
    return addPhoto(await getDb(), actor.orgId, actor.staffId, itemId, str(body, "dataUrl", 650_000));
  });
}
