import { getDb } from "@/server/db/client";
import { handle, readBody, str } from "@/server/http";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { StoreError } from "@/server/store/errors";
import { requestOtp } from "@/server/store/auth";

export async function POST(request: Request) {
  return handle(async () => {
    if (!rateLimit(`otp:${clientIp(request)}`, 10, 10 * 60_000)) throw new StoreError(429, "Too many attempts. Try again in a few minutes.");
    const body = await readBody(request);
    const r = await requestOtp(await getDb(), str(body, "phone", 20));
    // Demo build: the simulated SMS code is returned so the screen can show it.
    return { sent: true, demoCode: r.demoCode };
  });
}
