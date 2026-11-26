import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, optStr, readBody, str } from "@/server/http";
import { updateCustomer } from "@/server/store/customers";

export async function POST(request: Request, ctx: { params: Promise<{ customerId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const { customerId } = await ctx.params;
    const body = await readBody(request);
    await updateCustomer(await getDb(), actor.orgId, customerId, {
      name: str(body, "name", 80),
      address: optStr(body, "address", 300) ?? "",
      area: optStr(body, "area", 80) ?? "",
      preferences: optStr(body, "preferences", 200) ?? "",
    });
    return { ok: true };
  });
}
