import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, optStr, readBody, str } from "@/server/http";
import { scheduleJob } from "@/server/store/jobs";
import { JOB_KINDS, SLOTS } from "@/domain";
import { plain } from "@/server/view";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const body = await readBody(request);
    const job = await scheduleJob(await getDb(), actor.orgId, {
      customerId: str(body, "customerId", 64),
      kind: oneOf(body, "kind", JOB_KINDS),
      date: str(body, "date", 10),
      slot: oneOf(body, "slot", SLOTS),
      orderId: optStr(body, "orderId", 64) ?? null,
      address: optStr(body, "address", 300),
      area: optStr(body, "area", 80),
      note: optStr(body, "note", 200),
    });
    return plain(job);
  });
}
