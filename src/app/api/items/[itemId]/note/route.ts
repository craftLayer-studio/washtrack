import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, optStr, readBody } from "@/server/http";
import { setDamageNote } from "@/server/store/orders";

export async function POST(request: Request, ctx: { params: Promise<{ itemId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { itemId } = await ctx.params;
    const body = await readBody(request);
    await setDamageNote(await getDb(), actor.orgId, itemId, optStr(body, "note", 300) ?? "");
    return { ok: true };
  });
}
