import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { sendReadyReminders } from "@/server/store/orders";

/** Remind customers whose orders have been ready for over a day. */
export async function POST() {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    return sendReadyReminders(await getDb(), actor.orgId, 24);
  });
}
