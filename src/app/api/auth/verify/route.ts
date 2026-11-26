import { cookies } from "next/headers";
import { getDb } from "@/server/db/client";
import { handle, readBody, str } from "@/server/http";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { SESSION_COOKIE, SESSION_TTL_S, encodeSession } from "@/server/session";
import { StoreError } from "@/server/store/errors";
import { verifyOtp } from "@/server/store/auth";

export async function POST(request: Request) {
  return handle(async () => {
    if (!rateLimit(`verify:${clientIp(request)}`, 20, 10 * 60_000)) throw new StoreError(429, "Too many attempts. Try again in a few minutes.");
    const body = await readBody(request);
    const member = await verifyOtp(await getDb(), str(body, "phone", 20), str(body, "code", 6));
    const jar = await cookies();
    jar.set(SESSION_COOKIE, encodeSession({ staffId: member.id, orgId: member.orgId, role: member.role }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https"),
      path: "/",
      maxAge: SESSION_TTL_S,
    });
    return { role: member.role, name: member.name };
  });
}
