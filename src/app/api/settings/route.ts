import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, int, readBody, str } from "@/server/http";
import { updateOrgSettings } from "@/server/store/settings";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const body = await readBody(request);
    await updateOrgSettings(await getDb(), actor.orgId, {
      name: str(body, "name", 80),
      address: str(body, "address", 200),
      city: str(body, "city", 60),
      phone: str(body, "phone", 20),
      upiVpa: str(body, "upiVpa", 100),
      turnaroundHours: int(body, "turnaroundHours", 2, 240),
    });
    return { ok: true };
  });
}
