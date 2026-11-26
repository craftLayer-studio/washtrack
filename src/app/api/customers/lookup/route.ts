import { requireActor } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { findCustomerByPhone } from "@/server/store/customers";
import { plain } from "@/server/view";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(["owner", "staff"]);
    const phone = new URL(request.url).searchParams.get("phone") ?? "";
    const found = await findCustomerByPhone(await getDb(), actor.orgId, phone.slice(0, 20));
    return { customer: found ? plain(found) : null };
  });
}
