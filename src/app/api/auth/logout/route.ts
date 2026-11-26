import { cookies } from "next/headers";
import { handle } from "@/server/http";
import { SESSION_COOKIE } from "@/server/session";

export async function POST() {
  return handle(async () => {
    (await cookies()).delete(SESSION_COOKIE);
    return { ok: true };
  });
}
