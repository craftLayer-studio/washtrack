import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody } from "@/server/http";
import { cancelJob, completeJob, startDelivery } from "@/server/store/jobs";

export async function POST(request: Request, ctx: { params: Promise<{ jobId: string }> }) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff", "rider"]);
    const { jobId } = await ctx.params;
    const action = oneOf(await readBody(request), "action", ["start", "complete", "cancel"] as const);
    const db = await getDb();
    if (action === "start") return { message: await startDelivery(db, actor.orgId, jobId) };
    if (action === "complete") await completeJob(db, actor.orgId, actor.staffId, jobId);
    else await cancelJob(db, actor.orgId, jobId);
    return { ok: true };
  });
}
