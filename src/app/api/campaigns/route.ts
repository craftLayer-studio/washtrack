import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody, str } from "@/server/http";
import { AUDIENCES, sendCampaign } from "@/server/store/campaigns";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const body = await readBody(request);
    return sendCampaign(await getDb(), actor.orgId, {
      template: oneOf(body, "template", ["winback_offer", "plan_offer"] as const),
      offer: str(body, "offer", 200),
      audience: oneOf(body, "audience", AUDIENCES),
    });
  });
}
