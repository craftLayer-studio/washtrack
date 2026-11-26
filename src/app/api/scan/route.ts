import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { BadRequest, handle, optStr, readBody, str } from "@/server/http";
import { getTag, scanTag } from "@/server/store/orders";
import { isStage } from "@/domain";
import { plain } from "@/server/view";

/** Look up a tag (GET ?tag=) or move it to its next stage / a given stage (POST). */
export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const tag = (new URL(request.url).searchParams.get("tag") ?? "").trim().toUpperCase().slice(0, 20);
    return plain(await getTag(await getDb(), actor.orgId, tag));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const body = await readBody(request);
    const stage = optStr(body, "stage", 20);
    if (stage !== undefined && !isStage(stage)) throw new BadRequest("Unknown stage");
    const r = await scanTag(await getDb(), actor.orgId, actor.staffId, str(body, "tag", 20).trim(), stage, optStr(body, "expectOrderId", 64));
    return plain(r);
  });
}
