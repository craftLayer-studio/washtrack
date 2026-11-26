import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody, str } from "@/server/http";
import { addStaff } from "@/server/store/settings";
import { plain } from "@/server/view";

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner"]);
    const body = await readBody(request);
    return plain(await addStaff(await getDb(), actor.orgId, { name: str(body, "name", 60), phone: str(body, "phone", 20), role: oneOf(body, "role", ["owner", "staff", "rider"] as const) }));
  });
}
