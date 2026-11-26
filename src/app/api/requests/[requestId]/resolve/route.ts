import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { resolveRequest } from "@/server/store/orders";

export async function POST(_request: Request, ctx: { params: Promise<{ requestId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const { requestId } = await ctx.params;
    await resolveRequest(await getDb(), actor.orgId, requestId);
    return { ok: true };
  });
}
