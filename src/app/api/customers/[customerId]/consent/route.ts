import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { BadRequest, handle, oneOf, readBody } from "@/server/http";
import { setConsentByStaff } from "@/server/store/customers";
import { CONSENT_PURPOSES } from "@/domain";

export async function POST(request: Request, ctx: { params: Promise<{ customerId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const { customerId } = await ctx.params;
    const body = await readBody(request);
    if (typeof body.granted !== "boolean") throw new BadRequest("granted must be true or false");
    return setConsentByStaff(await getDb(), actor.orgId, customerId, oneOf(body, "purpose", CONSENT_PURPOSES), body.granted);
  });
}
